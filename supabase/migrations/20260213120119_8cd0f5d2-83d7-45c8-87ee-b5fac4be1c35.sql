
-- Table for business emails (inbox + sent replies)
CREATE TABLE public.business_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT,
  in_reply_to TEXT,
  thread_id UUID,
  direction TEXT NOT NULL DEFAULT 'inbound', -- 'inbound' or 'outbound'
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body_text TEXT,
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'unread', -- 'unread', 'read', 'replied', 'archived'
  is_starred BOOLEAN DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_business_emails_status ON public.business_emails(status);
CREATE INDEX idx_business_emails_thread ON public.business_emails(thread_id);
CREATE INDEX idx_business_emails_received ON public.business_emails(received_at DESC);
CREATE INDEX idx_business_emails_direction ON public.business_emails(direction);

-- Enable RLS
ALTER TABLE public.business_emails ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage business emails"
ON public.business_emails
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
