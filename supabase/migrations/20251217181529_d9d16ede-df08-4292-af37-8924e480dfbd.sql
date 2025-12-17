-- Create winner_claims table for tracking winner reward claims
CREATE TABLE public.winner_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winner_id uuid NOT NULL,
  winner_type text NOT NULL, -- 'blog' or 'reel'
  event_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  user_email text NOT NULL,
  claim_name text,
  claim_email text,
  position integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'unclaimed', -- 'unclaimed', 'pending', 'issued'
  claimed_at timestamp with time zone,
  issued_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.winner_claims ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view own winner claims"
ON public.winner_claims
FOR SELECT
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own claims to pending"
ON public.winner_claims
FOR UPDATE
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (status IN ('unclaimed', 'pending'));

CREATE POLICY "Admins can view all winner claims"
ON public.winner_claims
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update winner claims"
ON public.winner_claims
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert winner claims"
ON public.winner_claims
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete winner claims"
ON public.winner_claims
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to auto-create winner claims when winners are saved
CREATE OR REPLACE FUNCTION public.create_winner_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get email from submission
  SELECT email INTO v_email FROM public.submissions WHERE id = NEW.submission_id;
  
  -- Insert winner claim if not exists
  INSERT INTO public.winner_claims (winner_id, winner_type, event_id, submission_id, user_email, position)
  VALUES (NEW.id, 'blog', NEW.event_id, NEW.submission_id, v_email, NEW.position)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger for blog winners
CREATE TRIGGER create_blog_winner_claim
AFTER INSERT ON public.winners
FOR EACH ROW
EXECUTE FUNCTION public.create_winner_claim();

-- Create function for reel winner claims
CREATE OR REPLACE FUNCTION public.create_reel_winner_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get email from reel submission
  SELECT email INTO v_email FROM public.reel_submissions WHERE id = NEW.submission_id;
  
  -- Insert winner claim if not exists
  INSERT INTO public.winner_claims (winner_id, winner_type, event_id, submission_id, user_email, position)
  VALUES (NEW.id, 'reel', NEW.event_id, NEW.submission_id, v_email, NEW.position)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger for reel winners
CREATE TRIGGER create_reel_winner_claim
AFTER INSERT ON public.reel_winners
FOR EACH ROW
EXECUTE FUNCTION public.create_reel_winner_claim();