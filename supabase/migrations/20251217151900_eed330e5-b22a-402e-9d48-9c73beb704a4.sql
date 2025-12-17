-- Add screenshot_url column to social_follows for storing uploaded screenshots
ALTER TABLE public.social_follows ADD COLUMN screenshot_url text;

-- Add status column to track if claim is pending verification
ALTER TABLE public.social_follows ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected'));