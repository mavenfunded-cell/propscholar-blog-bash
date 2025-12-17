-- Fix ambiguous social claim RPC by removing overloads and exposing a single safe function

-- Drop both old overloads if they exist
DROP FUNCTION IF EXISTS public.claim_social_coins(uuid, text);
DROP FUNCTION IF EXISTS public.claim_social_coins(uuid, text, text);

-- Single canonical function: uses auth.uid() and optional screenshot URL
CREATE OR REPLACE FUNCTION public.claim_social_coins(
  _platform text,
  _screenshot_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  social_settings jsonb;
  coin_value integer;
  v_user_id uuid;
  already_claimed boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if already claimed
  SELECT EXISTS(
    SELECT 1 FROM public.social_follows
    WHERE user_id = v_user_id AND platform = _platform
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
  VALUES (v_user_id, _platform, coin_value, 'pending', _screenshot_url);

  RETURN jsonb_build_object('success', true, 'coins', coin_value, 'status', 'pending');
END;
$$;

-- Ensure RLS allows users to insert their own follows (already present) and view (already present)
-- No UPDATE needed because screenshot_url is captured at insert time via RPC.
