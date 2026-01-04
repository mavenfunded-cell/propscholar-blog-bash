
-- Fix search_path for campaign functions
CREATE OR REPLACE FUNCTION public.increment_campaign_sent(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.campaigns SET sent_count = sent_count + 1 WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_campaign_open(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.campaigns SET open_count = open_count + 1 WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_campaign_click(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.campaigns SET click_count = click_count + 1 WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_campaign_bounce(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.campaigns SET bounce_count = bounce_count + 1 WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_campaign_unsubscribe(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.campaigns SET unsubscribe_count = unsubscribe_count + 1 WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_audience_opens(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.audience_users SET total_opens = total_opens + 1, last_engaged_at = now() WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_audience_clicks(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.audience_users SET total_clicks = total_clicks + 1, last_engaged_at = now() WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
