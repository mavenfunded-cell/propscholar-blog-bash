-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to ticket-attachments bucket
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow anyone to view ticket attachments (since bucket is public)
CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ticket-attachments');

-- Allow admins to delete ticket attachments
CREATE POLICY "Admins can delete ticket attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'ticket-attachments' AND EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
));