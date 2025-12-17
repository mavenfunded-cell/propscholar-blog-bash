-- Create storage bucket for social screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('social-screenshots', 'social-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for users to upload their own screenshots
CREATE POLICY "Users can upload own screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for anyone to view screenshots (admin needs to see them)
CREATE POLICY "Anyone can view screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-screenshots');