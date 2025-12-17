-- Add rate limiting trigger to reel_submissions (same as blog submissions)
CREATE TRIGGER enforce_reel_rate_limit
BEFORE INSERT ON public.reel_submissions
FOR EACH ROW
EXECUTE FUNCTION public.check_submission_rate_limit();

-- Update storage policy for reel-videos to require authentication
DROP POLICY IF EXISTS "Anyone can upload reel videos" ON storage.objects;

CREATE POLICY "Authenticated users can upload reel videos"
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'reel-videos');