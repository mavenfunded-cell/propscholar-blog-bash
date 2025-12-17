-- User coin balances
CREATE TABLE public.user_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  referral_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  referred_by uuid REFERENCES auth.users(id),
  signup_coins_claimed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Coin transactions history
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'spend')),
  source text NOT NULL,
  source_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Global reward settings (admin configurable)
CREATE TABLE public.reward_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.reward_settings (setting_key, setting_value) VALUES
('signup_coins', '{"enabled": true, "value": 5}'),
('referral_coins', '{"enabled": true, "value": 1}'),
('social_facebook', '{"enabled": true, "value": 3, "url": ""}'),
('social_instagram', '{"enabled": true, "value": 3, "url": ""}'),
('social_twitter', '{"enabled": true, "value": 3, "url": ""}'),
('social_discord', '{"enabled": true, "value": 3, "url": ""}'),
('social_youtube', '{"enabled": true, "value": 3, "url": ""}');

-- Rewards catalog
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  coin_cost integer NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('discount_30', 'discount_50', 'prop_account')),
  expiry_days integer DEFAULT 14,
  is_enabled boolean DEFAULT true,
  max_claims_per_user integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default rewards
INSERT INTO public.rewards (name, description, coin_cost, reward_type, expiry_days, max_claims_per_user) VALUES
('30% Discount Coupon', 'Get 30% off on your next purchase. One-time use, expires in 14 days.', 100, 'discount_30', 14, 999),
('50% Discount Coupon', 'Get 50% off on your next purchase. One-time use, expires in 14 days.', 150, 'discount_50', 14, 999),
('PropScholar $10K Account', 'Claim your PropScholar $10K funded account. One per user.', 200, 'prop_account', 30, 1);

-- Coupon pools (admin uploads)
CREATE TABLE public.coupon_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code text NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('discount_30', 'discount_50')),
  status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'assigned', 'used', 'expired', 'revoked')),
  assigned_to uuid REFERENCES auth.users(id),
  assigned_email text,
  assigned_at timestamptz,
  used_at timestamptz,
  expires_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reward claims
CREATE TABLE public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_id uuid REFERENCES public.rewards(id) NOT NULL,
  coins_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected')),
  coupon_id uuid REFERENCES public.coupon_pools(id),
  coupon_code text,
  expires_at timestamptz,
  fulfilled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Social follows tracking
CREATE TABLE public.social_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'discord', 'youtube')),
  coins_earned integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Referrals tracking
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'rewarded')),
  coins_rewarded integer DEFAULT 0,
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_coins
CREATE POLICY "Users can view own coins" ON public.user_coins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coins" ON public.user_coins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coins" ON public.user_coins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all coins" ON public.user_coins FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all coins" ON public.user_coins FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for coin_transactions
CREATE POLICY "Users can view own transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.coin_transactions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert transactions" ON public.coin_transactions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for reward_settings
CREATE POLICY "Anyone can view settings" ON public.reward_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.reward_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.reward_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for rewards
CREATE POLICY "Anyone can view enabled rewards" ON public.rewards FOR SELECT USING (true);
CREATE POLICY "Admins can manage rewards" ON public.rewards FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for coupon_pools
CREATE POLICY "Admins can manage coupons" ON public.coupon_pools FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own assigned coupons" ON public.coupon_pools FOR SELECT USING (assigned_to = auth.uid());

-- RLS Policies for reward_claims
CREATE POLICY "Users can view own claims" ON public.reward_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON public.reward_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all claims" ON public.reward_claims FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update claims" ON public.reward_claims FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for social_follows
CREATE POLICY "Users can view own follows" ON public.social_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows" ON public.social_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all follows" ON public.social_follows FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals as referrer" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can view own referrals as referred" ON public.referrals FOR SELECT USING (auth.uid() = referred_id);
CREATE POLICY "Admins can manage referrals" ON public.referrals FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Function to create user_coins on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  referrer_code text;
  referrer_user_id uuid;
BEGIN
  -- Check if there's a referral code in metadata
  referrer_code := NEW.raw_user_meta_data ->> 'referral_code';
  
  IF referrer_code IS NOT NULL THEN
    SELECT user_id INTO referrer_user_id FROM public.user_coins WHERE referral_code = referrer_code;
  END IF;
  
  INSERT INTO public.user_coins (user_id, email, referred_by)
  VALUES (NEW.id, NEW.email, referrer_user_id);
  
  -- Create referral record if referred
  IF referrer_user_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, referred_email)
    VALUES (referrer_user_id, NEW.id, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user coins
DROP TRIGGER IF EXISTS on_auth_user_created_coins ON auth.users;
CREATE TRIGGER on_auth_user_created_coins
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_coins();

-- Function to add coins to user
CREATE OR REPLACE FUNCTION public.add_coins(
  _user_id uuid,
  _amount integer,
  _source text,
  _source_id uuid DEFAULT NULL,
  _description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update user balance
  UPDATE public.user_coins 
  SET balance = balance + _amount,
      total_earned = total_earned + _amount,
      updated_at = now()
  WHERE user_id = _user_id;
  
  -- Record transaction
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, source, source_id, description)
  VALUES (_user_id, _amount, 'earn', _source, _source_id, _description);
  
  RETURN true;
END;
$$;

-- Function to spend coins
CREATE OR REPLACE FUNCTION public.spend_coins(
  _user_id uuid,
  _amount integer,
  _source text,
  _source_id uuid DEFAULT NULL,
  _description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_balance integer;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO current_balance FROM public.user_coins WHERE user_id = _user_id FOR UPDATE;
  
  IF current_balance < _amount THEN
    RETURN false;
  END IF;
  
  -- Update user balance
  UPDATE public.user_coins 
  SET balance = balance - _amount,
      total_spent = total_spent + _amount,
      updated_at = now()
  WHERE user_id = _user_id;
  
  -- Record transaction
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, source, source_id, description)
  VALUES (_user_id, _amount, 'spend', _source, _source_id, _description);
  
  RETURN true;
END;
$$;

-- Function to claim signup coins
CREATE OR REPLACE FUNCTION public.claim_signup_coins(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  signup_settings jsonb;
  coin_value integer;
  already_claimed boolean;
BEGIN
  -- Check if already claimed
  SELECT signup_coins_claimed INTO already_claimed FROM public.user_coins WHERE user_id = _user_id;
  IF already_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed');
  END IF;
  
  -- Get settings
  SELECT setting_value INTO signup_settings FROM public.reward_settings WHERE setting_key = 'signup_coins';
  IF NOT (signup_settings->>'enabled')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signup coins disabled');
  END IF;
  
  coin_value := (signup_settings->>'value')::integer;
  
  -- Add coins
  PERFORM public.add_coins(_user_id, coin_value, 'signup', NULL, 'Signup bonus');
  
  -- Mark as claimed
  UPDATE public.user_coins SET signup_coins_claimed = true WHERE user_id = _user_id;
  
  RETURN jsonb_build_object('success', true, 'coins', coin_value);
END;
$$;

-- Function to claim social follow coins
CREATE OR REPLACE FUNCTION public.claim_social_coins(_user_id uuid, _platform text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  social_settings jsonb;
  coin_value integer;
  already_claimed boolean;
BEGIN
  -- Check if already claimed
  SELECT EXISTS(SELECT 1 FROM public.social_follows WHERE user_id = _user_id AND platform = _platform) INTO already_claimed;
  IF already_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed for this platform');
  END IF;
  
  -- Get settings
  SELECT setting_value INTO social_settings FROM public.reward_settings WHERE setting_key = 'social_' || _platform;
  IF social_settings IS NULL OR NOT (social_settings->>'enabled')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Social coins disabled for this platform');
  END IF;
  
  coin_value := (social_settings->>'value')::integer;
  
  -- Add coins
  PERFORM public.add_coins(_user_id, coin_value, 'social_' || _platform, NULL, 'Followed on ' || _platform);
  
  -- Record follow
  INSERT INTO public.social_follows (user_id, platform, coins_earned) VALUES (_user_id, _platform, coin_value);
  
  RETURN jsonb_build_object('success', true, 'coins', coin_value);
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_user_coins_updated_at BEFORE UPDATE ON public.user_coins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reward_settings_updated_at BEFORE UPDATE ON public.reward_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();