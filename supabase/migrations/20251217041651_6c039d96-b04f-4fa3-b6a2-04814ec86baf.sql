-- Add unique constraint to enforce one submission per person per event
ALTER TABLE public.submissions 
ADD CONSTRAINT submissions_event_email_unique UNIQUE (event_id, email);