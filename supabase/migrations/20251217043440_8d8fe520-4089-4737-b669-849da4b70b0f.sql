-- Add blog_title column to submissions table
ALTER TABLE public.submissions 
ADD COLUMN blog_title TEXT;