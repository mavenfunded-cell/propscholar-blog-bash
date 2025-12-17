-- Drop the old blog submission triggers for referrals
DROP TRIGGER IF EXISTS on_blog_submission_referral ON submissions;
DROP TRIGGER IF EXISTS on_reel_submission_referral ON reel_submissions;
DROP FUNCTION IF EXISTS reward_referrer_on_submission();

-- Create a function to reward referrer when referred user signs up
CREATE OR REPLACE FUNCTION reward_referrer_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  referral_coins INTEGER;
BEGIN
  -- Only process if the user was referred
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;
  
  referrer_id := NEW.referred_by;
  
  -- Get referral coin amount from settings
  SELECT COALESCE((setting_value->>'value')::INTEGER, 1)
  INTO referral_coins
  FROM reward_settings
  WHERE setting_key = 'referral_coins';
  
  IF referral_coins IS NULL THEN
    referral_coins := 1;
  END IF;
  
  -- Add coins to referrer
  UPDATE user_coins 
  SET balance = balance + referral_coins,
      total_earned = total_earned + referral_coins,
      updated_at = now()
  WHERE user_id = referrer_id;
  
  -- Create transaction record for referrer
  INSERT INTO coin_transactions (user_id, amount, transaction_type, source, description)
  VALUES (referrer_id, referral_coins, 'earn', 'referral', 'Referral bonus - new user signed up from your link');
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referred_email, status, qualified_at, coins_rewarded, rewarded_at)
  VALUES (referrer_id, NEW.user_id, NEW.email, 'rewarded', now(), referral_coins, now())
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on user_coins insert (when new user creates their coin record)
DROP TRIGGER IF EXISTS on_user_signup_referral ON user_coins;
CREATE TRIGGER on_user_signup_referral
  AFTER INSERT ON user_coins
  FOR EACH ROW
  EXECUTE FUNCTION reward_referrer_on_signup();