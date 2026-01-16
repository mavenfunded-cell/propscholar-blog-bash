-- Create storage bucket for campaign assets (email images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets',
  'campaign-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create policy to allow public read access
CREATE POLICY "Campaign assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-assets');

-- Create policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload campaign assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campaign-assets');

-- Create policy to allow delete of own uploads
CREATE POLICY "Authenticated users can delete campaign assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'campaign-assets');