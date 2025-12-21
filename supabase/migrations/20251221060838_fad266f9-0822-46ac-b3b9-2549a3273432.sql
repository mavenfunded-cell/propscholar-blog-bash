-- Fix: Restrict reward_settings to authenticated users only
-- This prevents unauthenticated users from seeing reward configurations and admin IDs

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view settings" ON public.reward_settings;

-- Create new policy for authenticated users only
CREATE POLICY "Authenticated users can view settings"
ON public.reward_settings FOR SELECT
TO authenticated
USING (true);