-- Create a function to get submission counts for events (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_event_submission_counts()
RETURNS TABLE(event_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT event_id, COUNT(*) as count
  FROM public.submissions
  GROUP BY event_id;
$$;

-- Create a function to get reel submission counts for events (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_reel_event_submission_counts()
RETURNS TABLE(event_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT event_id, COUNT(*) as count
  FROM public.reel_submissions
  GROUP BY event_id;
$$;

-- Create a function to get all submissions for an event (for admin use, bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_submissions_for_event(_event_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  blog text,
  blog_title text,
  word_count integer,
  time_spent_seconds integer,
  submitted_at timestamptz,
  event_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id,
    name,
    email,
    phone,
    blog,
    blog_title,
    word_count,
    time_spent_seconds,
    submitted_at,
    event_id
  FROM public.submissions
  WHERE submissions.event_id = _event_id
  ORDER BY submitted_at DESC;
$$;

-- Create a function to get all reel submissions for an event (for admin use, bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_reel_submissions_for_event(_event_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  title text,
  description text,
  video_url text,
  thumbnail_url text,
  submitted_at timestamptz,
  event_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id,
    name,
    email,
    phone,
    title,
    description,
    video_url,
    thumbnail_url,
    submitted_at,
    event_id
  FROM public.reel_submissions
  WHERE reel_submissions.event_id = _event_id
  ORDER BY submitted_at DESC;
$$;