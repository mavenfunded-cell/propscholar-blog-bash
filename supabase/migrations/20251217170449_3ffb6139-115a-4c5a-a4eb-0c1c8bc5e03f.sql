-- Add participation coins settings
INSERT INTO reward_settings (setting_key, setting_value) 
VALUES 
  ('participation_blog', '{"enabled": true, "value": 2}'),
  ('participation_reel', '{"enabled": true, "value": 3}')
ON CONFLICT (setting_key) DO NOTHING;

-- Add unique constraint on setting_key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reward_settings_setting_key_key'
  ) THEN
    ALTER TABLE reward_settings ADD CONSTRAINT reward_settings_setting_key_key UNIQUE (setting_key);
  END IF;
END $$;

-- Create function to grant participation coins
CREATE OR REPLACE FUNCTION public.grant_participation_coins(_email text, _participation_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_setting_key text;
  v_settings jsonb;
  v_coin_value integer;
BEGIN
  -- Find user by email
  SELECT user_id INTO v_user_id FROM public.user_coins WHERE email = _email;
  
  -- If user not found, return success (they're not registered, no coins to give)
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'coins', 0, 'reason', 'user_not_found');
  END IF;
  
  -- Get setting key based on participation type
  v_setting_key := 'participation_' || _participation_type;
  
  -- Get settings
  SELECT setting_value INTO v_settings 
  FROM public.reward_settings 
  WHERE setting_key = v_setting_key;
  
  IF v_settings IS NULL OR NOT (v_settings->>'enabled')::boolean THEN
    RETURN jsonb_build_object('success', true, 'coins', 0, 'reason', 'disabled');
  END IF;
  
  v_coin_value := (v_settings->>'value')::integer;
  
  -- Add coins
  PERFORM public.add_coins(
    v_user_id, 
    v_coin_value, 
    'participation_' || _participation_type, 
    NULL, 
    'Participation reward for ' || _participation_type || ' submission'
  );
  
  RETURN jsonb_build_object('success', true, 'coins', v_coin_value);
END;
$$;