-- Create AI usage logs table
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL DEFAULT 'suggest-ticket-reply',
  tokens_estimated INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage all logs
CREATE POLICY "Admins can manage AI usage logs"
  ON public.ai_usage_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for rate limiting queries
CREATE INDEX idx_ai_usage_logs_admin_created ON public.ai_usage_logs(admin_id, created_at DESC);

-- Create AI rate limit settings
INSERT INTO public.reward_settings (setting_key, setting_value)
VALUES ('ai_rate_limit', '{"requests_per_hour": 10, "enabled": true}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;