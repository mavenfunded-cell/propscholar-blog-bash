-- Create a function to reject a social follow (deducts coins if it was verified)
CREATE OR REPLACE FUNCTION public.reject_social_follow(_follow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follow_record RECORD;
BEGIN
  -- Get the follow record
  SELECT * INTO follow_record FROM public.social_follows WHERE id = _follow_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- If it was verified, we need to deduct the coins
  IF follow_record.status = 'verified' THEN
    -- Deduct coins from user
    PERFORM public.spend_coins(
      follow_record.user_id, 
      follow_record.coins_earned, 
      'social_rejection', 
      _follow_id, 
      'Social follow rejected - coins revoked for ' || follow_record.platform
    );
  END IF;
  
  -- Update status to rejected
  UPDATE public.social_follows SET status = 'rejected' WHERE id = _follow_id;
  
  RETURN true;
END;
$$;