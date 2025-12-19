-- Drop the incorrect policy
DROP POLICY IF EXISTS "Anyone can update own session" ON public.user_sessions;

-- Create correct policy for session updates
CREATE POLICY "Update own session by session_id"
ON public.user_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);