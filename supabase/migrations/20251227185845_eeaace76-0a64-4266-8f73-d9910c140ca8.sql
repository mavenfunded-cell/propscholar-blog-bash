-- Remove unused voter_email column that could expose PII if populated
ALTER TABLE public.blog_votes DROP COLUMN IF EXISTS voter_email;