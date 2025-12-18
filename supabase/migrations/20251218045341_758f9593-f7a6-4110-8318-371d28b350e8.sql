-- Create function to get all submissions for an ended event (only works for expired events)
CREATE OR REPLACE FUNCTION public.get_event_submissions(_event_id uuid)
RETURNS TABLE(
  submission_id uuid,
  submission_name text,
  submission_title text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    s.id as submission_id,
    s.name as submission_name,
    s.blog_title as submission_title
  FROM public.submissions s
  JOIN public.events e ON e.id = s.event_id
  WHERE s.event_id = _event_id
    AND e.end_date < now()  -- Only allow viewing after event ends
  ORDER BY s.submitted_at ASC;
$$;