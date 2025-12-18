-- Drop the unique constraint on email since we're not using it
ALTER TABLE public.blog_votes DROP CONSTRAINT IF EXISTS blog_votes_submission_id_voter_email_key;

-- Add admin policies for managing votes
CREATE POLICY "Admins can delete votes"
ON public.blog_votes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update votes"
ON public.blog_votes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));