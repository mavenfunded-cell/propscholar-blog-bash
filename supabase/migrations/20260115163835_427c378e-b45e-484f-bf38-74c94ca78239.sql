-- Conversion Intelligence System Tables

-- Track anonymous visitor sessions
CREATE TABLE public.conversion_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id TEXT NOT NULL UNIQUE,
  user_email TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_page_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  user_agent TEXT,
  referrer TEXT,
  landing_page TEXT,
  country TEXT,
  city TEXT,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Track all conversion events
CREATE TABLE public.conversion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.conversion_sessions(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page_url TEXT,
  page_title TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_on_page_seconds INTEGER,
  scroll_depth INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Store cart items
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.conversion_sessions(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  account_size TEXT,
  price DECIMAL(10,2),
  discount_applied DECIMAL(10,2) DEFAULT 0,
  platform_type TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  removed_at TIMESTAMP WITH TIME ZONE,
  purchased BOOLEAN DEFAULT false,
  purchased_at TIMESTAMP WITH TIME ZONE
);

-- Track abandoned carts for email automation
CREATE TABLE public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.conversion_sessions(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL,
  user_email TEXT,
  cart_value DECIMAL(10,2),
  cart_items JSONB DEFAULT '[]'::jsonb,
  checkout_started BOOLEAN DEFAULT false,
  checkout_started_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  abandoned_at TIMESTAMP WITH TIME ZONE,
  recovery_status TEXT DEFAULT 'pending',
  emails_sent INTEGER DEFAULT 0,
  recovered BOOLEAN DEFAULT false,
  recovered_at TIMESTAMP WITH TIME ZONE,
  drop_off_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track recovery emails sent
CREATE TABLE public.cart_recovery_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abandoned_cart_id UUID REFERENCES public.abandoned_carts(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN DEFAULT false
);

-- Store AI-generated conversion insights
CREATE TABLE public.conversion_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL,
  insight_text TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  metric_value DECIMAL(10,2),
  metric_label TEXT,
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Global settings for the conversion system
CREATE TABLE public.conversion_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.conversion_settings (setting_key, setting_value) VALUES
  ('emails_enabled', 'true'::jsonb),
  ('abandoned_cart_delay_minutes', '45'::jsonb),
  ('max_emails_per_cart', '2'::jsonb),
  ('idle_detection_seconds', '60'::jsonb);

-- Create indexes for performance
CREATE INDEX idx_conversion_events_session ON public.conversion_events(session_id);
CREATE INDEX idx_conversion_events_type ON public.conversion_events(event_type);
CREATE INDEX idx_conversion_events_timestamp ON public.conversion_events(timestamp);
CREATE INDEX idx_cart_items_session ON public.cart_items(session_id);
CREATE INDEX idx_cart_items_anonymous ON public.cart_items(anonymous_id);
CREATE INDEX idx_abandoned_carts_status ON public.abandoned_carts(recovery_status);
CREATE INDEX idx_abandoned_carts_email ON public.abandoned_carts(user_email);
CREATE INDEX idx_conversion_sessions_anonymous ON public.conversion_sessions(anonymous_id);

-- Enable RLS
ALTER TABLE public.conversion_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_settings ENABLE ROW LEVEL SECURITY;

-- Public insert policies for tracker (anonymous access)
CREATE POLICY "Allow anonymous insert on conversion_sessions"
  ON public.conversion_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on conversion_sessions"
  ON public.conversion_sessions FOR UPDATE
  USING (true);

CREATE POLICY "Allow anonymous insert on conversion_events"
  ON public.conversion_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on cart_items"
  ON public.cart_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on cart_items"
  ON public.cart_items FOR UPDATE
  USING (true);

CREATE POLICY "Allow anonymous insert on abandoned_carts"
  ON public.abandoned_carts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on abandoned_carts"
  ON public.abandoned_carts FOR UPDATE
  USING (true);

-- Admin read access functions
CREATE OR REPLACE FUNCTION public.get_conversion_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'today_abandoned', (SELECT COUNT(*) FROM abandoned_carts WHERE DATE(abandoned_at) = CURRENT_DATE),
    'today_sessions', (SELECT COUNT(*) FROM conversion_sessions WHERE DATE(first_seen_at) = CURRENT_DATE),
    'today_conversions', (SELECT COUNT(*) FROM conversion_sessions WHERE DATE(converted_at) = CURRENT_DATE AND converted = true),
    'pending_carts', (SELECT COUNT(*) FROM abandoned_carts WHERE recovery_status = 'pending' AND user_email IS NOT NULL),
    'emails_sent_today', (SELECT COUNT(*) FROM cart_recovery_emails WHERE DATE(sent_at) = CURRENT_DATE),
    'recovered_today', (SELECT COUNT(*) FROM abandoned_carts WHERE DATE(recovered_at) = CURRENT_DATE AND recovered = true),
    'avg_cart_value', (SELECT COALESCE(AVG(cart_value), 0) FROM abandoned_carts WHERE DATE(created_at) = CURRENT_DATE)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dropoff_analysis()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'by_page', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT page_url, COUNT(*) as drop_count
        FROM conversion_events
        WHERE event_type = 'checkout_abandoned'
        AND timestamp > NOW() - INTERVAL '7 days'
        GROUP BY page_url
        ORDER BY drop_count DESC
        LIMIT 5
      ) t
    ),
    'by_reason', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT drop_off_reason, COUNT(*) as count
        FROM abandoned_carts
        WHERE drop_off_reason IS NOT NULL
        AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY drop_off_reason
        ORDER BY count DESC
      ) t
    ),
    'by_product', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT product_name, account_size, COUNT(*) as abandon_count
        FROM cart_items
        WHERE purchased = false
        AND removed_at IS NULL
        AND added_at > NOW() - INTERVAL '7 days'
        GROUP BY product_name, account_size
        ORDER BY abandon_count DESC
        LIMIT 5
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_abandoned_carts()
RETURNS SETOF abandoned_carts
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM abandoned_carts ORDER BY created_at DESC LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.get_all_conversion_insights()
RETURNS SETOF conversion_insights
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM conversion_insights WHERE is_active = true ORDER BY generated_at DESC LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.get_conversion_settings()
RETURNS SETOF conversion_settings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM conversion_settings;
$$;

CREATE OR REPLACE FUNCTION public.update_conversion_setting(_key TEXT, _value JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversion_settings SET setting_value = _value, updated_at = NOW() WHERE setting_key = _key;
  RETURN FOUND;
END;
$$;