-- Fix user_sessions RLS vulnerability: overly permissive UPDATE policy

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Update own session by session_id" ON public.user_sessions;

-- Create a secure UPDATE policy
-- Allow updates only if:
-- 1. The session has no user_id (anonymous session) - anyone can update their anonymous session
-- 2. The session belongs to the authenticated user
CREATE POLICY "Update own session securely"
ON public.user_sessions
FOR UPDATE
USING (
  -- Allow if session is anonymous OR user owns the session
  user_id IS NULL OR user_id = auth.uid()
)
WITH CHECK (
  -- Prevent user_id hijacking: can only set user_id to null or to the authenticated user
  -- Also prevent changing an already-set user_id to a different user
  (user_id IS NULL OR user_id = auth.uid())
);

-- Add validation trigger to prevent metric manipulation and user_id hijacking
CREATE OR REPLACE FUNCTION public.validate_session_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing user_id after it's set to a different user
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS NOT NULL AND NEW.user_id != OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change session user_id to a different user';
  END IF;
  
  -- Prevent suspicious metric decreases (could indicate tampering)
  IF NEW.page_views < OLD.page_views THEN
    RAISE EXCEPTION 'Cannot decrease page_views';
  END IF;
  
  IF NEW.total_seconds < OLD.total_seconds THEN
    RAISE EXCEPTION 'Cannot decrease total_seconds';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_session_changes ON public.user_sessions;
CREATE TRIGGER validate_session_changes
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_session_update();