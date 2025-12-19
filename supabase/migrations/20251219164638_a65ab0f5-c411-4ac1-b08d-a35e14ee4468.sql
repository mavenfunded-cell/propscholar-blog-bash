-- Add is_persistent column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS is_persistent boolean NOT NULL DEFAULT false;

-- Add cta_text column for custom CTA button text
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS cta_text text;

-- Create admin_notifications table for logging admin-sent notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'specific', 'segment'
  target_users UUID[] DEFAULT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  cta_text TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recipient_count INTEGER DEFAULT 0
);

-- Enable RLS on admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage admin notifications log
CREATE POLICY "Admins can manage admin notifications"
ON public.admin_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to send admin notification to all users
CREATE OR REPLACE FUNCTION public.send_admin_notification(
  _title TEXT,
  _message TEXT,
  _action_url TEXT DEFAULT NULL,
  _cta_text TEXT DEFAULT NULL,
  _target_type TEXT DEFAULT 'all',
  _target_users UUID[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id UUID;
  v_user_id UUID;
  v_count INTEGER := 0;
  v_log_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT has_role(v_admin_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Log the admin notification
  INSERT INTO public.admin_notifications (admin_id, target_type, target_users, title, message, action_url, cta_text)
  VALUES (v_admin_id, _target_type, _target_users, _title, _message, _action_url, _cta_text)
  RETURNING id INTO v_log_id;
  
  IF _target_type = 'all' THEN
    -- Send to all users
    FOR v_user_id IN SELECT user_id FROM public.user_coins LOOP
      INSERT INTO public.notifications (user_id, type, title, message, action_url, cta_text, is_persistent)
      VALUES (v_user_id, 'admin', _title, _message, _action_url, _cta_text, false);
      v_count := v_count + 1;
    END LOOP;
  ELSIF _target_type = 'specific' AND _target_users IS NOT NULL THEN
    -- Send to specific users
    FOREACH v_user_id IN ARRAY _target_users LOOP
      INSERT INTO public.notifications (user_id, type, title, message, action_url, cta_text, is_persistent)
      VALUES (v_user_id, 'admin', _title, _message, _action_url, _cta_text, false);
      v_count := v_count + 1;
    END LOOP;
  END IF;
  
  -- Update recipient count
  UPDATE public.admin_notifications SET recipient_count = v_count WHERE id = v_log_id;
  
  RETURN jsonb_build_object('success', true, 'sent_count', v_count);
END;
$$;

-- Create function to get or create task notifications for a user
CREATE OR REPLACE FUNCTION public.get_task_notifications(_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_social_settings jsonb;
  v_referral_settings jsonb;
  v_has_referral boolean;
  v_notifications jsonb := '[]'::jsonb;
  v_platform TEXT;
  v_platforms TEXT[] := ARRAY['instagram', 'youtube', 'twitter', 'telegram'];
BEGIN
  -- Check each social platform
  FOREACH v_platform IN ARRAY v_platforms LOOP
    -- Check if user hasn't claimed this platform yet
    IF NOT EXISTS (
      SELECT 1 FROM public.social_follows 
      WHERE user_id = _user_id AND platform = v_platform
    ) THEN
      -- Get settings for this platform
      SELECT setting_value INTO v_social_settings
      FROM public.reward_settings
      WHERE setting_key = 'social_' || v_platform;
      
      IF v_social_settings IS NOT NULL AND (v_social_settings->>'enabled')::boolean THEN
        v_notifications := v_notifications || jsonb_build_object(
          'type', 'task',
          'task_type', 'social_' || v_platform,
          'title', '📱 Follow us on ' || initcap(v_platform),
          'message', 'Follow our ' || initcap(v_platform) || ' account and earn ' || (v_social_settings->>'value')::text || ' coins!',
          'action_url', '/dashboard',
          'cta_text', 'Follow Now',
          'coins', (v_social_settings->>'value')::integer
        );
      END IF;
    END IF;
  END LOOP;
  
  -- Check referral notification (one-time)
  SELECT setting_value INTO v_referral_settings
  FROM public.reward_settings
  WHERE setting_key = 'referral_coins';
  
  -- Check if user has already made a successful referral
  SELECT EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrer_id = _user_id AND status = 'rewarded'
  ) INTO v_has_referral;
  
  IF NOT v_has_referral AND v_referral_settings IS NOT NULL AND (v_referral_settings->>'enabled')::boolean THEN
    v_notifications := v_notifications || jsonb_build_object(
      'type', 'referral',
      'task_type', 'referral',
      'title', '👥 Refer a Friend',
      'message', 'Invite a friend and earn ' || (v_referral_settings->>'value')::text || ' coin when they join!',
      'action_url', '/dashboard',
      'cta_text', 'Refer Now',
      'coins', (v_referral_settings->>'value')::integer
    );
  END IF;
  
  RETURN v_notifications;
END;
$$;