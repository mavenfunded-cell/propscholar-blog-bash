-- Fix winner_claims RLS so legitimate winners can submit claim details securely

-- 1) Helper: get current authenticated user's email (avoids repeating subquery)
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (u.email)::text
  from auth.users u
  where u.id = auth.uid()
$$;

-- 2) Helper: verify that the authenticated user is allowed to claim a specific winner
create or replace function public.can_claim_winner(_winner_id uuid, _winner_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select public.current_user_email() as email
  )
  select case
    when _winner_type = 'blog' then
      exists (
        select 1
        from public.winners w
        join public.submissions s on s.id = w.submission_id
        join me on true
        where w.id = _winner_id
          and s.email = me.email
      )
    when _winner_type = 'reel' then
      exists (
        select 1
        from public.reel_winners w
        join public.reel_submissions s on s.id = w.submission_id
        join me on true
        where w.id = _winner_id
          and s.email = me.email
      )
    else false
  end
$$;

-- 3) Add INSERT policy for users to create their own winner_claims rows
--    (needed for legacy cases where the auto-created claim row doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'winner_claims'
      AND policyname = 'Users can insert own winner claims'
  ) THEN
    EXECUTE $pol$
      create policy "Users can insert own winner claims"
      on public.winner_claims
      for insert
      to authenticated
      with check (
        -- Must be a real winner for the logged-in user's submission email
        public.can_claim_winner(winner_id, winner_type)
        -- The stored user_email must match the authenticated email
        and user_email = public.current_user_email()
        -- Only allow creating as unclaimed/pending (no direct issued)
        and status in ('unclaimed','pending')
      )
    $pol$;
  END IF;
END $$;

-- 4) Ensure the existing SELECT/UPDATE policies apply to authenticated users explicitly
--    (no behavior change intended; just makes access explicit and consistent)
DO $$
BEGIN
  -- Update SELECT policy role if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'winner_claims'
      AND policyname = 'Anyone can view own winner claims'
  ) THEN
    EXECUTE 'alter policy "Anyone can view own winner claims" on public.winner_claims to authenticated';
  END IF;

  -- Update UPDATE policy role if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'winner_claims'
      AND policyname = 'Users can update own claims to pending'
  ) THEN
    EXECUTE 'alter policy "Users can update own claims to pending" on public.winner_claims to authenticated';
  END IF;
END $$;