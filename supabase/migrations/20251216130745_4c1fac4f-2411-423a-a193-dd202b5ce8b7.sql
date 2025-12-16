-- Add rewards column to events table
ALTER TABLE public.events 
ADD COLUMN rewards TEXT;