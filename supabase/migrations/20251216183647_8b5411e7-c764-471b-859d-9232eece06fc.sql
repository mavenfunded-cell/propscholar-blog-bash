-- Add unique constraint: one submission per email per event
ALTER TABLE public.submissions 
ADD CONSTRAINT unique_email_per_event UNIQUE (event_id, email);