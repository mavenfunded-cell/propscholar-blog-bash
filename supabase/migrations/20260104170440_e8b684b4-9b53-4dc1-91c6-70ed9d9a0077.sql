-- Add 'failed' status to campaign status values (if not already supported)
-- Update campaigns table to support failed status

-- Create RPC to increment failed count for dashboard metrics
CREATE OR REPLACE FUNCTION increment_campaign_failed(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaigns
  SET bounce_count = COALESCE(bounce_count, 0) + 1
  WHERE id = campaign_id;
END;
$$;