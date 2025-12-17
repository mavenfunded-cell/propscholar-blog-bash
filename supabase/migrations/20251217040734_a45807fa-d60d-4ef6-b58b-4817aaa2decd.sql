-- Add column to track time spent writing (in seconds)
ALTER TABLE public.submissions 
ADD COLUMN time_spent_seconds integer DEFAULT 0;