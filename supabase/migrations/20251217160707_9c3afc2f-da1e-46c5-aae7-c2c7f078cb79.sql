-- Drop and recreate claim_social_coins to NOT add coins immediately
-- Coins will only be added when admin approves

CREATE OR REPLACE FUNCTION public.claim_social_coins(_user_id uuid, _platform text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- DO NOT add coins yet - coins will be added when admin approves
  -- Just record the follow with pending status
  INSERT INTO public.social_follows (user_id, platform, coins_earned, status) 
  VALUES (_user_id, _platform, coin_value, 'pending');
  
  RETURN jsonb_build_object('success', true, 'coins', coin_value, 'status', 'pending');
END;
$function$;

-- Create function to approve social follow and add coins
CREATE OR REPLACE FUNCTION public.approve_social_follow(_follow_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  follow_record RECORD;
BEGIN
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