
-- Create the ticket-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to upload (admin uses anon key)
CREATE POLICY "Allow uploads to ticket-attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow public read access
CREATE POLICY "Allow public read of ticket-attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ticket-attachments');
