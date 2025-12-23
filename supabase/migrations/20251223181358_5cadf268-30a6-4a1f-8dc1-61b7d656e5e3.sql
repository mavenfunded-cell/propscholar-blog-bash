-- Fix the SECURITY DEFINER view issue by recreating it as SECURITY INVOKER
-- and ensuring it's secure

-- Drop the existing view
DROP VIEW IF EXISTS public.public_winner_submissions;

-- Recreate the view with explicit SECURITY INVOKER (the safe default)
CREATE VIEW public.public_winner_submissions 
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.event_id,
  s.blog_title,
  s.blog,
  s.word_count,
  s.submitted_at,
  -- Mask the name: show first name only or first initial + asterisks
  CASE 
    WHEN position(' ' in s.name) > 0 THEN split_part(s.name, ' ', 1)
    ELSE substring(s.name from 1 for 1) || '***'
  END as display_name
FROM public.submissions s
WHERE s.id IN (SELECT submission_id FROM public.winners);

-- Grant access to the view
GRANT SELECT ON public.public_winner_submissions TO anon;
GRANT SELECT ON public.public_winner_submissions TO authenticated;

-- We also need a policy that allows viewing the underlying submission data
-- for the view to work. Create a minimal policy for winner data access.
DROP POLICY IF EXISTS "Admins can view winner submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can view own winning submissions" ON public.submissions;

-- Create a single policy that allows read access to winner submissions
-- The view will handle masking the PII
CREATE POLICY "Public can view winner submission content for view"
ON public.submissions FOR SELECT
USING (
  id IN (SELECT submission_id FROM public.winners)
);