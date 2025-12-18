-- Create blog_votes table
CREATE TABLE public.blog_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  voter_name text NOT NULL,
  voter_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(submission_id, voter_email)
);

-- Enable RLS
ALTER TABLE public.blog_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view votes
CREATE POLICY "Anyone can view votes"
ON public.blog_votes FOR SELECT
USING (true);

-- Anyone can vote (one vote per email per submission)
CREATE POLICY "Anyone can vote"
ON public.blog_votes FOR INSERT
WITH CHECK (true);

-- Create function to get submissions with vote counts for active events
CREATE OR REPLACE FUNCTION public.get_live_event_submissions(_event_id uuid)
RETURNS TABLE(
  submission_id uuid, 
  submission_name text, 
  submission_title text,
  vote_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    s.id as submission_id,
    s.name as submission_name,
    s.blog_title as submission_title,
    COALESCE((SELECT COUNT(*) FROM public.blog_votes v WHERE v.submission_id = s.id), 0) as vote_count
  FROM public.submissions s
  JOIN public.events e ON e.id = s.event_id
  WHERE s.event_id = _event_id
    AND e.status = 'active'
  ORDER BY vote_count DESC, s.submitted_at ASC;
$$;