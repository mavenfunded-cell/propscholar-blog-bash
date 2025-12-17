-- Fix social screenshot persistence, coupon claiming, and referral awarding via secure RPCs

-- 1) Social claim: accept screenshot URL at insert time (users cannot UPDATE social_follows)
CREATE OR REPLACE FUNCTION public.claim_social_coins(_user_id uuid, _platform text, _screenshot_url text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  social_settings jsonb;
  coin_value integer;
  already_claimed boolean;
BEGIN
  -- Ensure caller is the same user
  IF auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if already claimed
  SELECT EXISTS(
    SELECT 1 FROM public.social_follows WHERE user_id = _user_id AND platform = _platform
  ) INTO already_claimed;

  IF already_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed for this platform');
  END IF;

  -- Get settings
  SELECT setting_value INTO social_settings
  FROM public.reward_settings
  WHERE setting_key = 'social_' || _platform;

  IF social_settings IS NULL OR NOT (social_settings->>'enabled')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Social coins disabled for this platform');
  END IF;

  coin_value := (social_settings->>'value')::integer;

  -- Insert pending claim with screenshot URL (coins added only after admin approval)
  INSERT INTO public.social_follows (user_id, platform, coins_earned, status, screenshot_url)
  VALUES (_user_id, _platform, coin_value, 'pending', _screenshot_url);

  RETURN jsonb_build_object('success', true, 'coins', coin_value, 'status', 'pending');
END;
$$;


-- 2) Coupon claiming: users cannot SELECT unassigned coupons due to RLS. Provide a secure function.
CREATE OR REPLACE FUNCTION public.claim_coupon(_reward_type text, _expiry_days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_coupon record;
  v_expires_at timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_email FROM public.user_coins WHERE user_id = v_user_id;

  v_expires_at := now() + make_interval(days => GREATEST(_expiry_days, 1));

  -- pick one available coupon (unused/available) that is unassigned
  SELECT * INTO v_coupon
  FROM public.coupon_pools
  WHERE reward_type = _reward_type
    AND status IN ('unused', 'available')
    AND assigned_to IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No coupons available');
  END IF;

  UPDATE public.coupon_pools
  SET status = 'assigned',
      assigned_to = v_user_id,
      assigned_email = v_email,
      assigned_at = now(),
      expires_at = v_expires_at
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'success', true,
    'coupon_id', v_coupon.id,
    'coupon_code', v_coupon.coupon_code,
    'expires_at', v_expires_at
  );
END;
$$;


-- 3) Referral awarding: users can't lookup another user's referral_code due to RLS. Provide a secure function.
CREATE OR REPLACE FUNCTION public.apply_referral_code(_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_referrer_user_id uuid;
  v_referral_coins integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_user_email FROM public.user_coins WHERE user_id = v_user_id;

  -- Only allow once
  IF EXISTS(
    SELECT 1 FROM public.user_coins WHERE user_id = v_user_id AND referred_by IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already applied');
  END IF;

  SELECT user_id INTO v_referrer_user_id
  FROM public.user_coins
  WHERE referral_code = _referral_code
  LIMIT 1;

  IF v_referrer_user_id IS NULL OR v_referrer_user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Set referred_by
  UPDATE public.user_coins
  SET referred_by = v_referrer_user_id
  WHERE user_id = v_user_id;

  -- Determine coins
  SELECT COALESCE((setting_value->>'value')::int, 1)
  INTO v_referral_coins
  FROM public.reward_settings
  WHERE setting_key = 'referral_coins';

  IF v_referral_coins IS NULL THEN
    v_referral_coins := 1;
  END IF;

  -- Reward referrer
  PERFORM public.add_coins(v_referrer_user_id, v_referral_coins, 'referral', NULL, 'Referral bonus - new user signed up from your link');

  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referred_email, status, qualified_at, coins_rewarded, rewarded_at)
  VALUES (v_referrer_user_id, v_user_id, COALESCE(v_user_email, ''), 'rewarded', now(), v_referral_coins, now());

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_user_id, 'coins', v_referral_coins);
END;
$$;
