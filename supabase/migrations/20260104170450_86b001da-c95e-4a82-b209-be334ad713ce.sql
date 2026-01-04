-- Fix the function search path warning
CREATE OR REPLACE FUNCTION increment_campaign_failed(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE campaigns
  SET bounce_count = COALESCE(bounce_count, 0) + 1
  WHERE id = campaign_id;
END;
$$;