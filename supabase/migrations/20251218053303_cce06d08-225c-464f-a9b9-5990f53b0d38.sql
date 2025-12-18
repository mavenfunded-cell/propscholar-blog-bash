-- Drop and recreate the function with blog content
DROP FUNCTION IF EXISTS public.get_live_event_submissions(uuid);

CREATE FUNCTION public.get_live_event_submissions(_event_id uuid)
RETURNS TABLE(submission_id uuid, submission_name text, submission_title text, submission_blog text, vote_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    s.id as submission_id,
    s.name as submission_name,
    s.blog_title as submission_title,
    s.blog as submission_blog,
    COALESCE((SELECT COUNT(*) FROM public.blog_votes v WHERE v.submission_id = s.id), 0) as vote_count
  FROM public.submissions s
  JOIN public.events e ON e.id = s.event_id
  WHERE s.event_id = _event_id
    AND e.status = 'active'
  ORDER BY vote_count DESC, s.submitted_at ASC;
$$;