
-- =============================================
-- BULK EMAIL CAMPAIGN SYSTEM - ISOLATED FROM SUPPORT
-- =============================================

-- Audience Tags table
CREATE TABLE public.audience_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366F1',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audience Users table (marketing contacts - separate from auth users)
CREATE TABLE public.audience_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  tags UUID[] DEFAULT '{}',
  is_marketing_allowed BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'manual',
  engagement_score INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  last_engaged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  sender_email TEXT DEFAULT 'info@propscholar.com',
  sender_name TEXT DEFAULT 'PropScholar',
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  target_tags UUID[] DEFAULT '{}',
  exclude_tags UUID[] DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  spam_count INTEGER DEFAULT 0,
  test_sent_at TIMESTAMP WITH TIME ZONE,
  test_sent_to TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign Recipients table (queue for sending)
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  audience_user_id UUID NOT NULL REFERENCES public.audience_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  tracking_id TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, audience_user_id)
);

-- Campaign Events table (tracking opens, clicks, etc.)
CREATE TABLE public.campaign_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.campaign_recipients(id) ON DELETE SET NULL,
  audience_user_id UUID REFERENCES public.audience_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click', 'bounce', 'unsubscribe', 'spam_report')),
  link_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin Campaign Access table
CREATE TABLE public.admin_campaign_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email TEXT NOT NULL UNIQUE,
  has_access BOOLEAN DEFAULT true,
  granted_by TEXT,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default admin access
INSERT INTO public.admin_campaign_access (admin_email, has_access, granted_by)
VALUES ('notehanmalik@gmail.com', true, 'system');

-- Enable RLS on all tables
ALTER TABLE public.audience_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_campaign_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audience_tags
CREATE POLICY "Admins with campaign access can manage tags"
  ON public.audience_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_campaign_access 
    WHERE admin_email = current_user_email() AND has_access = true
  ));

-- RLS Policies for audience_users
CREATE POLICY "Admins with campaign access can manage audience"
  ON public.audience_users FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_campaign_access 
    WHERE admin_email = current_user_email() AND has_access = true
  ));

-- RLS Policies for campaigns
CREATE POLICY "Admins with campaign access can manage campaigns"
  ON public.campaigns FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_campaign_access 
    WHERE admin_email = current_user_email() AND has_access = true
  ));

-- RLS Policies for campaign_recipients
CREATE POLICY "Admins with campaign access can manage recipients"
  ON public.campaign_recipients FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_campaign_access 
    WHERE admin_email = current_user_email() AND has_access = true
  ));

-- RLS Policies for campaign_events
CREATE POLICY "Admins with campaign access can view events"
  ON public.campaign_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admin_campaign_access 
    WHERE admin_email = current_user_email() AND has_access = true
  ));

CREATE POLICY "Anyone can insert events via tracking"
  ON public.campaign_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies for admin_campaign_access
CREATE POLICY "Admins can view campaign access"
  ON public.admin_campaign_access FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage campaign access"
  ON public.admin_campaign_access FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_audience_users_email ON public.audience_users(email);
CREATE INDEX idx_audience_users_marketing ON public.audience_users(is_marketing_allowed) WHERE is_marketing_allowed = true;
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON public.campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients(status);
CREATE INDEX idx_campaign_recipients_tracking ON public.campaign_recipients(tracking_id);
CREATE INDEX idx_campaign_events_campaign ON public.campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_type ON public.campaign_events(event_type);
CREATE INDEX idx_campaign_events_created ON public.campaign_events(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_audience_tags_updated_at
  BEFORE UPDATE ON public.audience_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audience_users_updated_at
  BEFORE UPDATE ON public.audience_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
