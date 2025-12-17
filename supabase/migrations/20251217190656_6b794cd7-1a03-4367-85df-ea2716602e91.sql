-- Fix winner claims + reward claims joins + auto creation triggers

-- 1) Fix winner_claims access policies to avoid referencing auth.users
DROP POLICY IF EXISTS "Anyone can view own winner claims" ON public.winner_claims;
DROP POLICY IF EXISTS "Users can view own winner claims" ON public.winner_claims;
DROP POLICY IF EXISTS "Users can update own claims to pending" ON public.winner_claims;

CREATE POLICY "Users can view own winner claims"
ON public.winner_claims
FOR SELECT
USING (user_email = public.current_user_email());

CREATE POLICY "Users can update own claims to pending"
ON public.winner_claims
FOR UPDATE
USING (user_email = public.current_user_email())
WITH CHECK (
  user_email = public.current_user_email()
  AND status = ANY (ARRAY['unclaimed'::text, 'pending'::text])
);


-- 2) De-dupe existing winner_claims BEFORE enforcing uniqueness
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY winner_id, winner_type
      ORDER BY
        (CASE WHEN status = 'pending' THEN 1 ELSE 0 END) DESC,
        claimed_at DESC NULLS LAST,
        created_at DESC
    ) AS rn
  FROM public.winner_claims
)
DELETE FROM public.winner_claims wc
USING ranked r
WHERE wc.id = r.id
  AND r.rn > 1;

-- Now enforce uniqueness (so trigger inserts can't duplicate)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'winner_claims_winner_id_winner_type_key'
      AND conrelid = 'public.winner_claims'::regclass
  ) THEN
    ALTER TABLE public.winner_claims
      ADD CONSTRAINT winner_claims_winner_id_winner_type_key UNIQUE (winner_id, winner_type);
  END IF;
END $$;


-- 3) Ensure reward_claims can join user_coins in admin UI (user_coins!inner(email))
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_coins_user_id_key'
      AND conrelid = 'public.user_coins'::regclass
  ) THEN
    ALTER TABLE public.user_coins
      ADD CONSTRAINT user_coins_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reward_claims_user_id_fkey'
      AND conrelid = 'public.reward_claims'::regclass
  ) THEN
    ALTER TABLE public.reward_claims
      ADD CONSTRAINT reward_claims_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.user_coins(user_id)
      ON DELETE RESTRICT;
  END IF;
END $$;


-- 4) Create triggers to auto-create winner_claims when winners are inserted
DROP TRIGGER IF EXISTS trg_create_winner_claim ON public.winners;
CREATE TRIGGER trg_create_winner_claim
AFTER INSERT ON public.winners
FOR EACH ROW
EXECUTE FUNCTION public.create_winner_claim();

DROP TRIGGER IF EXISTS trg_create_reel_winner_claim ON public.reel_winners;
CREATE TRIGGER trg_create_reel_winner_claim
AFTER INSERT ON public.reel_winners
FOR EACH ROW
EXECUTE FUNCTION public.create_reel_winner_claim();


-- 5) Backfill missing winner_claims for existing winners
INSERT INTO public.winner_claims (winner_id, winner_type, event_id, submission_id, user_email, position)
SELECT
  w.id,
  'blog'::text,
  w.event_id,
  w.submission_id,
  s.email,
  w.position
FROM public.winners w
JOIN public.submissions s ON s.id = w.submission_id
LEFT JOIN public.winner_claims wc
  ON wc.winner_id = w.id
 AND wc.winner_type = 'blog'
WHERE wc.id IS NULL
ON CONFLICT (winner_id, winner_type) DO NOTHING;

INSERT INTO public.winner_claims (winner_id, winner_type, event_id, submission_id, user_email, position)
SELECT
  rw.id,
  'reel'::text,
  rw.event_id,
  rw.submission_id,
  rs.email,
  rw.position
FROM public.reel_winners rw
JOIN public.reel_submissions rs ON rs.id = rw.submission_id
LEFT JOIN public.winner_claims wc
  ON wc.winner_id = rw.id
 AND wc.winner_type = 'reel'
WHERE wc.id IS NULL
ON CONFLICT (winner_id, winner_type) DO NOTHING;
