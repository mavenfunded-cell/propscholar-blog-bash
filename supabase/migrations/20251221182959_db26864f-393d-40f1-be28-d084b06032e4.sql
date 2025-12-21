-- Admin helper functions for reward settings + rewards catalog (bypass RLS safely for authenticated users)

CREATE OR REPLACE FUNCTION public.get_all_reward_settings()
RETURNS SETOF public.reward_settings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.reward_settings
  ORDER BY setting_key;
$$;

CREATE OR REPLACE FUNCTION public.get_all_rewards()
RETURNS SETOF public.rewards
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.rewards
  ORDER BY coin_cost;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_reward_setting(
  _id uuid,
  _setting_value jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.reward_settings
  SET setting_value = _setting_value,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = _id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_reward(
  _name text,
  _description text,
  _coin_cost integer,
  _reward_type text,
  _expiry_days integer,
  _max_claims_per_user integer,
  _is_enabled boolean
)
RETURNS public.rewards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.rewards;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.rewards (
    name,
    description,
    coin_cost,
    reward_type,
    expiry_days,
    max_claims_per_user,
    is_enabled
  )
  VALUES (
    _name,
    NULLIF(_description, ''),
    _coin_cost,
    _reward_type,
    _expiry_days,
    _max_claims_per_user,
    _is_enabled
  )
  RETURNING * INTO r;

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_reward(
  _id uuid,
  _name text,
  _description text,
  _coin_cost integer,
  _reward_type text,
  _expiry_days integer,
  _max_claims_per_user integer,
  _is_enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.rewards
  SET name = _name,
      description = NULLIF(_description, ''),
      coin_cost = _coin_cost,
      reward_type = _reward_type,
      expiry_days = _expiry_days,
      max_claims_per_user = _max_claims_per_user,
      is_enabled = _is_enabled,
      updated_at = now()
  WHERE id = _id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_reward(_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.rewards WHERE id = _id;
  RETURN FOUND;
END;
$$;
