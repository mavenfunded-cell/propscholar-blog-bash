-- Allow authenticated users to view their own submissions by email
CREATE POLICY "Users can view own submissions by email"
ON public.submissions
FOR SELECT
USING (email = current_user_email());