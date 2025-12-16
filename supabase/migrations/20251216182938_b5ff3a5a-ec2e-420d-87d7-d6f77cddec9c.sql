-- Create a function to get winners with submission names (publicly accessible)
CREATE OR REPLACE FUNCTION public.get_event_winners(_event_id uuid)
RETURNS TABLE (
  winner_id uuid,
  winner_position integer,
  submission_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    w.id as winner_id,
    w.position as winner_position,
    s.name as submission_name
  FROM public.winners w
  JOIN public.submissions s ON s.id = w.submission_id
  WHERE w.event_id = _event_id
  ORDER BY w.position ASC;
$$;