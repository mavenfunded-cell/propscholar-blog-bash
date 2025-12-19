-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Function to create notification (called by triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (_user_id, _type, _title, _message, _action_url)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE id = _notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Trigger: Notify on coin transactions
CREATE OR REPLACE FUNCTION public.notify_on_coin_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
BEGIN
  IF NEW.transaction_type = 'earn' THEN
    notif_type := 'coins_earned';
    notif_title := '🪙 Coins Earned!';
    notif_message := 'You earned ' || NEW.amount || ' coins. ' || COALESCE(NEW.description, '');
  ELSE
    notif_type := 'coins_spent';
    notif_title := '💸 Coins Spent';
    notif_message := 'You spent ' || NEW.amount || ' coins. ' || COALESCE(NEW.description, '');
  END IF;
  
  PERFORM public.create_notification(NEW.user_id, notif_type, notif_title, notif_message, '/dashboard');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_coin_transaction
AFTER INSERT ON public.coin_transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_coin_transaction();

-- Trigger: Notify on reward claim
CREATE OR REPLACE FUNCTION public.notify_on_reward_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reward_name TEXT;
BEGIN
  SELECT name INTO reward_name FROM public.rewards WHERE id = NEW.reward_id;
  
  PERFORM public.create_notification(
    NEW.user_id,
    'reward_claimed',
    '🎁 Reward Claimed!',
    'You successfully claimed: ' || COALESCE(reward_name, 'a reward') || '. Check your rewards page for details.',
    '/rewards'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_reward_claim
AFTER INSERT ON public.reward_claims
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_reward_claim();

-- Trigger: Notify on social follow approval
CREATE OR REPLACE FUNCTION public.notify_on_social_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'verified' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'social_verified',
      '✅ Social Follow Verified!',
      'Your ' || NEW.platform || ' follow has been verified. ' || NEW.coins_earned || ' coins have been added!',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_social_approval
AFTER UPDATE ON public.social_follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_social_approval();

-- Trigger: Notify winner when selected
CREATE OR REPLACE FUNCTION public.notify_winner_selected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  submission_user_id UUID;
  submission_email TEXT;
  event_title TEXT;
  event_slug TEXT;
BEGIN
  -- Get submission email
  SELECT email INTO submission_email FROM public.submissions WHERE id = NEW.submission_id;
  
  -- Get user_id from email
  SELECT user_id INTO submission_user_id FROM public.user_coins WHERE email = submission_email;
  
  -- Get event details
  SELECT title, slug INTO event_title, event_slug FROM public.events WHERE id = NEW.event_id;
  
  IF submission_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      submission_user_id,
      'winner_selected',
      '🏆 Congratulations! You Won!',
      'You placed #' || NEW.position || ' in ' || COALESCE(event_title, 'the competition') || '! Claim your prize now.',
      '/blog/' || COALESCE(event_slug, '')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_winner
AFTER INSERT ON public.winners
FOR EACH ROW
EXECUTE FUNCTION public.notify_winner_selected();

-- Trigger: Notify reel winner
CREATE OR REPLACE FUNCTION public.notify_reel_winner_selected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  submission_user_id UUID;
  submission_email TEXT;
  event_title TEXT;
  event_slug TEXT;
BEGIN
  SELECT email INTO submission_email FROM public.reel_submissions WHERE id = NEW.submission_id;
  SELECT user_id INTO submission_user_id FROM public.user_coins WHERE email = submission_email;
  SELECT title, slug INTO event_title, event_slug FROM public.events WHERE id = NEW.event_id;
  
  IF submission_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      submission_user_id,
      'reel_winner_selected',
      '🏆 Congratulations! You Won!',
      'You placed #' || NEW.position || ' in ' || COALESCE(event_title, 'the reel competition') || '!',
      '/reels/' || COALESCE(event_slug, '')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_reel_winner
AFTER INSERT ON public.reel_winners
FOR EACH ROW
EXECUTE FUNCTION public.notify_reel_winner_selected();

-- Trigger: Notify on referral reward
CREATE OR REPLACE FUNCTION public.notify_on_referral_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'rewarded' AND (OLD.status IS NULL OR OLD.status != 'rewarded') THEN
    PERFORM public.create_notification(
      NEW.referrer_id,
      'referral_reward',
      '👥 Referral Bonus!',
      'Someone joined using your referral link! You earned ' || COALESCE(NEW.coins_rewarded, 0) || ' coins.',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_referral_reward
AFTER INSERT OR UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_referral_reward();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;