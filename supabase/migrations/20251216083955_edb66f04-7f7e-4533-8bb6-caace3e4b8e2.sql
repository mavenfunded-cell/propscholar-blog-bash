-- Create rate limit tracking table
CREATE TABLE public.submission_rate_limit (
  identifier TEXT PRIMARY KEY,
  submission_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on rate limit table
ALTER TABLE public.submission_rate_limit ENABLE ROW LEVEL SECURITY;

-- Allow inserts/updates from anyone (needed for the trigger to work)
CREATE POLICY "Allow rate limit tracking"
ON public.submission_rate_limit
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to check and enforce rate limit
CREATE OR REPLACE FUNCTION public.check_submission_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  window_age INTERVAL;
BEGIN
  -- Get current count and window age for this email
  SELECT submission_count, now() - window_start INTO current_count, window_age
  FROM submission_rate_limit
  WHERE identifier = NEW.email;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO submission_rate_limit (identifier, submission_count, window_start)
    VALUES (NEW.email, 1, now());
    RETURN NEW;
  END IF;
  
  -- Reset if window is older than 1 hour
  IF window_age > interval '1 hour' THEN
    UPDATE submission_rate_limit
    SET submission_count = 1, window_start = now()
    WHERE identifier = NEW.email;
    RETURN NEW;
  END IF;
  
  -- Check limit (3 submissions per hour per email)
  IF current_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded. You can only submit 3 times per hour. Please wait before submitting again.';
  END IF;
  
  -- Increment counter
  UPDATE submission_rate_limit
  SET submission_count = submission_count + 1
  WHERE identifier = NEW.email;
  
  RETURN NEW;
END;
$$;

-- Create trigger on submissions table
CREATE TRIGGER enforce_submission_rate_limit
BEFORE INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.check_submission_rate_limit();