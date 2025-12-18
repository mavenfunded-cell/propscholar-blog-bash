-- Update the apply_referral_code function to send email notification
CREATE OR REPLACE FUNCTION public.apply_referral_code(_referral_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_user_email text;
  v_referrer_user_id uuid;
  v_referral_coins integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  select email into v_user_email
  from public.user_coins
  where user_id = v_user_id;

  -- Only allow once
  if exists(
    select 1 from public.user_coins
    where user_id = v_user_id and referred_by is not null
  ) then
    return jsonb_build_object('success', false, 'error', 'Referral already applied');
  end if;

  select user_id into v_referrer_user_id
  from public.user_coins
  where referral_code = _referral_code
  limit 1;

  if v_referrer_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Invalid referral code');
  end if;

  if v_referrer_user_id = v_user_id then
    return jsonb_build_object('success', false, 'error', 'Cannot use your own referral code');
  end if;

  -- Set referred_by
  update public.user_coins
  set referred_by = v_referrer_user_id
  where user_id = v_user_id;

  -- Determine coins
  select coalesce((setting_value->>'value')::int, 1)
  into v_referral_coins
  from public.reward_settings
  where setting_key = 'referral_coins';

  if v_referral_coins is null then
    v_referral_coins := 1;
  end if;

  -- Reward referrer (IMPORTANT: pass uuid for source_id)
  perform public.add_coins(
    v_referrer_user_id,
    v_referral_coins,
    'referral',
    v_user_id,
    'Referral bonus - new user signed up from your link'
  );

  -- Create referral record
  insert into public.referrals (
    referrer_id,
    referred_id,
    referred_email,
    status,
    qualified_at,
    coins_rewarded,
    rewarded_at
  )
  values (
    v_referrer_user_id,
    v_user_id,
    coalesce(v_user_email, ''),
    'rewarded',
    now(),
    v_referral_coins,
    now()
  );

  -- Send email notification to referrer
  PERFORM net.http_post(
    url := 'https://tisijoiblvcrigwhzprn.supabase.co/functions/v1/notify-referral',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc2lqb2libHZjcmlnd2h6cHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzI4ODQsImV4cCI6MjA4MTQwODg4NH0.7A7QN4wjF1QEoBjdqBqhSALCzcKYhdVzBCpaIkgG5p8'
    ),
    body := jsonb_build_object(
      'referrer_id', v_referrer_user_id,
      'referred_email', coalesce(v_user_email, ''),
      'coins_earned', v_referral_coins
    )
  );

  return jsonb_build_object('success', true, 'referrer_id', v_referrer_user_id, 'coins', v_referral_coins);
end;
$function$;