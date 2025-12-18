-- Create email_logs table to track email delivery
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'announcement', 'winner_notification', 'balance_change', 'magic_link'
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'failed'
  error_message TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage email logs
CREATE POLICY "Admins can view email logs"
  ON public.email_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert email logs"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);