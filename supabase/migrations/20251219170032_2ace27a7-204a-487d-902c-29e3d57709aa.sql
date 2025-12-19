-- Allow users to delete their own read, non-persistent notifications
CREATE POLICY "Users can delete own read non-persistent notifications"
ON public.notifications
FOR DELETE
USING (
  auth.uid() = user_id 
  AND is_read = true 
  AND is_persistent = false
);