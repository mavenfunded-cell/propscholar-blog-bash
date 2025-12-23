-- Fix Security Issues Migration

-- ========================================
-- FIX 1: Make ticket-attachments bucket private
-- ========================================

-- Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'ticket-attachments';

-- Drop the overly permissive public view policy
DROP POLICY IF EXISTS "Anyone can view ticket attachments" ON storage.objects;

-- Create proper RLS policy: Users can view attachments from their own tickets
CREATE POLICY "Users can view own ticket attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  (
    -- Admins can view all
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Users can view attachments from their own tickets
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE (st.user_email = current_user_email() OR st.user_id = auth.uid())
      AND storage.objects.name LIKE st.id::text || '/%'
    )
  )
);

-- ========================================
-- FIX 2: Add admin authorization to social follow functions
-- ========================================

-- Fix approve_social_follow function with admin check
CREATE OR REPLACE FUNCTION public.approve_social_follow(_follow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  follow_record RECORD;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve social follows';
  END IF;

  -- Get the follow record
  SELECT * INTO follow_record FROM public.social_follows WHERE id = _follow_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Add coins to user
  PERFORM public.add_coins(follow_record.user_id, follow_record.coins_earned, 'social_' || follow_record.platform, _follow_id, 'Verified follow on ' || follow_record.platform);
  
  -- Update status to verified
  UPDATE public.social_follows SET status = 'verified' WHERE id = _follow_id;
  
  RETURN true;
END;
$function$;

-- Fix reject_social_follow function with admin check
CREATE OR REPLACE FUNCTION public.reject_social_follow(_follow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  follow_record RECORD;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject social follows';
  END IF;

  -- Get the follow record
  SELECT * INTO follow_record FROM public.social_follows WHERE id = _follow_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- If it was verified, we need to deduct the coins
  IF follow_record.status = 'verified' THEN
    -- Deduct coins from user
    PERFORM public.spend_coins(
      follow_record.user_id, 
      follow_record.coins_earned, 
      'social_rejection', 
      _follow_id, 
      'Social follow rejected - coins revoked for ' || follow_record.platform
    );
  END IF;
  
  -- Update status to rejected
  UPDATE public.social_follows SET status = 'rejected' WHERE id = _follow_id;
  
  RETURN true;
END;
$function$;

-- ========================================
-- FIX 3: Protect PII in winner submissions
-- ========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view winner submissions" ON public.submissions;

-- Create a view that masks PII for public winner display
CREATE OR REPLACE VIEW public.public_winner_submissions AS
SELECT 
  s.id,
  s.event_id,
  s.blog_title,
  s.blog,
  s.word_count,
  s.submitted_at,
  -- Mask the name: show first name only or first initial + asterisks
  CASE 
    WHEN position(' ' in s.name) > 0 THEN split_part(s.name, ' ', 1)
    ELSE substring(s.name from 1 for 1) || '***'
  END as display_name
FROM public.submissions s
WHERE s.id IN (SELECT submission_id FROM public.winners);

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.public_winner_submissions TO anon;
GRANT SELECT ON public.public_winner_submissions TO authenticated;

-- Create a new policy that only allows admins and submission owners to view full winner details
CREATE POLICY "Admins can view winner submissions"
ON public.submissions FOR SELECT
USING (
  id IN (SELECT submission_id FROM public.winners) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Submission owners can view their own winning submissions
CREATE POLICY "Users can view own winning submissions"
ON public.submissions FOR SELECT
USING (
  id IN (SELECT submission_id FROM public.winners) 
  AND email = current_user_email()
);