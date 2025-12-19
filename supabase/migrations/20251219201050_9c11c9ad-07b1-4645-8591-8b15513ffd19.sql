-- Add message_body column to email_logs table to store email content
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS message_body text;