-- Add user_id column to blog_votes to link to authenticated users
ALTER TABLE public.blog_votes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint so one user can only vote once per submission
ALTER TABLE public.blog_votes ADD CONSTRAINT blog_votes_user_submission_unique UNIQUE (submission_id, user_id);

-- Update policy to allow viewing user's own votes
CREATE POLICY "Users can check own votes"
ON public.blog_votes FOR SELECT
USING (auth.uid() = user_id);