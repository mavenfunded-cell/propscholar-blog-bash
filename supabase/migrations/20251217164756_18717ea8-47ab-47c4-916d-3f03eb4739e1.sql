-- Ensure social-screenshots bucket exists with proper policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-screenshots', 'social-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure storage policies exist
DO $$
BEGIN
  -- Drop and recreate policies to ensure they're correct
  DROP POLICY IF EXISTS "Anyone can view screenshots" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload own screenshots" ON storage.objects;
  
  CREATE POLICY "Anyone can view screenshots" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'social-screenshots');

  CREATE POLICY "Users can upload own screenshots" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'social-screenshots' AND (auth.uid())::text = (storage.foldername(name))[1]);
END $$;

-- Fix claim_coupon to handle NULL expiry_days properly
CREATE OR REPLACE FUNCTION public.claim_coupon(_reward_type text, _expiry_days integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_coupon record;
  v_expires_at timestamptz;
  v_expiry int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_email FROM public.user_coins WHERE user_id = v_user_id;
  
  -- Ensure expiry_days has a sensible default
  v_expiry := COALESCE(_expiry_days, 14);
  IF v_expiry < 1 THEN v_expiry := 14; END IF;

  v_expires_at := now() + make_interval(days => v_expiry);

  -- Pick one available coupon (unused/available) that is unassigned
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

-- Improve referral handling - also give welcome bonus to referred user
CREATE OR REPLACE FUNCTION public.apply_referral_code(_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use your own referral code');
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
  PERFORM public.add_coins(v_referrer_user_id, v_referral_coins, 'referral', v_user_id::text, 'Referral bonus - new user signed up from your link');

  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referred_email, status, qualified_at, coins_rewarded, rewarded_at)
  VALUES (v_referrer_user_id, v_user_id, COALESCE(v_user_email, ''), 'rewarded', now(), v_referral_coins, now());

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_user_id, 'coins', v_referral_coins);
END;
$$;