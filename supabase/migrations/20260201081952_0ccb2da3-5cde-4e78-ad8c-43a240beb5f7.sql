-- Create a sanitized view for public reel winner data
-- This view only exposes non-sensitive fields and anonymizes the name

CREATE OR REPLACE VIEW public.public_reel_winner_submissions AS
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

-- Drop the overly permissive policy that exposes all winner data
DROP POLICY IF EXISTS "Anyone can view winning reel submissions" ON public.reel_submissions;

-- Create a new policy that only allows users to view their own submissions
CREATE POLICY "Users can view own reel submissions" 
ON public.reel_submissions 
FOR SELECT 
USING (email = current_user_email());