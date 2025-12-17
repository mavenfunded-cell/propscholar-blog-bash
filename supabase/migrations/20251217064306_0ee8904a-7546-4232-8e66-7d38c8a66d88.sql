-- Add competition type to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS competition_type text NOT NULL DEFAULT 'blog';

-- Create reel_submissions table for video uploads
CREATE TABLE public.reel_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on reel_submissions
ALTER TABLE public.reel_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_submissions
CREATE POLICY "Anyone can submit reels" ON public.reel_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view reel submissions" ON public.reel_submissions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reel submissions" ON public.reel_submissions
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reel submissions" ON public.reel_submissions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create reel_winners table
CREATE TABLE public.reel_winners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.reel_submissions(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on reel_winners
ALTER TABLE public.reel_winners ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_winners
CREATE POLICY "Anyone can view reel winners" ON public.reel_winners
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert reel winners" ON public.reel_winners
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reel winners" ON public.reel_winners
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reel winners" ON public.reel_winners
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view winning reel submissions
CREATE POLICY "Anyone can view winning reel submissions" ON public.reel_submissions
  FOR SELECT USING (id IN (SELECT submission_id FROM public.reel_winners));

-- Create storage bucket for reel videos (200MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('reel-videos', 'reel-videos', true, 209715200)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reel videos
CREATE POLICY "Anyone can upload reel videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'reel-videos');

CREATE POLICY "Anyone can view reel videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'reel-videos');

CREATE POLICY "Admins can delete reel videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'reel-videos' AND has_role(auth.uid(), 'admin'::app_role));