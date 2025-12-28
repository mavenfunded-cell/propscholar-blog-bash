-- Drop and recreate the function to fix the voter_email column issue
DROP FUNCTION IF EXISTS public.get_votes_for_event(uuid);

CREATE OR REPLACE FUNCTION public.get_votes_for_event(_event_id uuid)
RETURNS TABLE(
  vote_id uuid,
  submission_id uuid,
  voter_name text,
  created_at timestamptz,
  submission_name text,
  blog_title text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.id as vote_id,
    v.submission_id,
    v.voter_name,
    v.created_at,
    s.name as submission_name,
    s.blog_title
  FROM blog_votes v
  INNER JOIN submissions s ON s.id = v.submission_id
  WHERE s.event_id = _event_id
  ORDER BY v.created_at DESC;
$$;