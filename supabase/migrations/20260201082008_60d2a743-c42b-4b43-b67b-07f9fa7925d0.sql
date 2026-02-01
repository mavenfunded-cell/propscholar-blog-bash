-- Fix the security definer view issue by making it SECURITY INVOKER
-- This ensures the view uses the caller's permissions, not the owner's

DROP VIEW IF EXISTS public.public_reel_winner_submissions;

CREATE VIEW public.public_reel_winner_submissions 
WITH (security_invoker = true)
AS
SELECT 
  rs.id,
  rs.event_id,
  rs.title,
  rs.description,
  rs.video_url,
  rs.thumbnail_url,
  CONCAT(LEFT(rs.name, 1), '***') as display_name,
  rs.submitted_at
FROM public.reel_submissions rs
INNER JOIN public.reel_winners rw ON rs.id = rw.submission_id;

-- Grant SELECT on the view to anon and authenticated users
GRANT SELECT ON public.public_reel_winner_submissions TO anon, authenticated;