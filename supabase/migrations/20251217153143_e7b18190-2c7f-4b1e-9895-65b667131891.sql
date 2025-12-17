-- Create function to reward referrer when referred user participates in any event
CREATE OR REPLACE FUNCTION public.reward_referrer_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  referrer_user_id uuid;
  referral_record_id uuid;
  referral_coins integer;
BEGIN
  -- Get the user_id of the person who submitted (by email)
  -- Check if this user was referred by someone
  SELECT uc.referred_by, r.id INTO referrer_user_id, referral_record_id
  FROM public.user_coins uc
  LEFT JOIN public.referrals r ON r.referred_id = uc.user_id
  WHERE uc.email = NEW.email AND uc.referred_by IS NOT NULL
  LIMIT 1;
  
  -- If referred and referral not yet rewarded
  IF referrer_user_id IS NOT NULL AND referral_record_id IS NOT NULL THEN
    -- Check if already rewarded for this referral
    SELECT 1 FROM public.referrals WHERE id = referral_record_id AND status = 'rewarded' LIMIT 1;
    IF NOT FOUND THEN
      -- Get referral coin value from settings
      SELECT (setting_value->>'value')::integer INTO referral_coins 
      FROM public.reward_settings 
      WHERE setting_key = 'referral_coins' AND (setting_value->>'enabled')::boolean = true;
      
      IF referral_coins IS NOT NULL AND referral_coins > 0 THEN
        -- Add coins to referrer
        PERFORM public.add_coins(
          referrer_user_id, 
          referral_coins, 
          'referral', 
          referral_record_id, 
          'Referral reward - ' || NEW.email || ' participated'
        );
        
        -- Update referral status
        UPDATE public.referrals 
        SET status = 'rewarded', 
            qualified_at = now(),
            rewarded_at = now(),
            coins_rewarded = referral_coins
        WHERE id = referral_record_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for blog submissions
DROP TRIGGER IF EXISTS on_blog_submission_referral ON public.submissions;
CREATE TRIGGER on_blog_submission_referral
  AFTER INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.reward_referrer_on_submission();

-- Create triggers for reel submissions
DROP TRIGGER IF EXISTS on_reel_submission_referral ON public.reel_submissions;
CREATE TRIGGER on_reel_submission_referral
  AFTER INSERT ON public.reel_submissions
  FOR EACH ROW EXECUTE FUNCTION public.reward_referrer_on_submission();