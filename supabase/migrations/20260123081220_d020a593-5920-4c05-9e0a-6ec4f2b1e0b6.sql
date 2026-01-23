-- UTM Sessions table for tracking all visitor sessions
CREATE TABLE public.utm_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  utm_source text NOT NULL DEFAULT 'direct',
  utm_medium text NOT NULL DEFAULT 'none',
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  referrer text,
  user_agent text,
  ip_address text,
  country text,
  city text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User source tracking - binds users to their first and last sessions
CREATE TABLE public.user_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email text,
  first_session_id text NOT NULL,
  last_session_id text NOT NULL,
  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  last_utm_source text,
  last_utm_medium text,
  last_utm_campaign text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.utm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sources ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert/update for session tracking
CREATE POLICY "Allow anonymous insert on utm_sessions"
ON public.utm_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anonymous update on utm_sessions"
ON public.utm_sessions FOR UPDATE
USING (true);

-- Admins can view all sessions
CREATE POLICY "Admins can view all utm_sessions"
ON public.utm_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- User sources policies
CREATE POLICY "Allow insert on user_sources"
ON public.user_sources FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update on user_sources"
ON public.user_sources FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all user_sources"
ON public.user_sources FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster queries
CREATE INDEX idx_utm_sessions_created_at ON public.utm_sessions(created_at DESC);
CREATE INDEX idx_utm_sessions_utm_source ON public.utm_sessions(utm_source);
CREATE INDEX idx_utm_sessions_utm_campaign ON public.utm_sessions(utm_campaign);
CREATE INDEX idx_utm_sessions_user_id ON public.utm_sessions(user_id);
CREATE INDEX idx_user_sources_user_id ON public.user_sources(user_id);