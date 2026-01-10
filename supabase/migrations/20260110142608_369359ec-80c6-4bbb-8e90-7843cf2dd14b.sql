-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  subject TEXT,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  thumbnail_url TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create A/B test variants table
CREATE TABLE public.campaign_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL DEFAULT 'A',
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  percentage INTEGER NOT NULL DEFAULT 50,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add A/B testing fields to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS is_ab_test BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ab_test_winner_id UUID REFERENCES public.campaign_variants(id),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS send_optimal_time BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_schedule JSONB;

-- Create function to get all email templates
CREATE OR REPLACE FUNCTION public.get_all_email_templates()
RETURNS TABLE(
  id UUID,
  name TEXT,
  category TEXT,
  subject TEXT,
  html_content TEXT,
  plain_text_content TEXT,
  thumbnail_url TEXT,
  is_default BOOLEAN,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, category, subject, html_content, plain_text_content, 
         thumbnail_url, is_default, created_by, created_at, updated_at
  FROM public.email_templates
  ORDER BY is_default DESC, created_at DESC;
$$;

-- Create function to get campaign variants
CREATE OR REPLACE FUNCTION public.get_campaign_variants(_campaign_id UUID)
RETURNS TABLE(
  id UUID,
  campaign_id UUID,
  variant_name TEXT,
  subject TEXT,
  html_content TEXT,
  percentage INTEGER,
  sent_count INTEGER,
  open_count INTEGER,
  click_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, campaign_id, variant_name, subject, html_content, 
         percentage, sent_count, open_count, click_count, created_at
  FROM public.campaign_variants
  WHERE campaign_variants.campaign_id = _campaign_id
  ORDER BY variant_name;
$$;

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_variants ENABLE ROW LEVEL SECURITY;

-- Create policies (admin-only via RPC functions)
CREATE POLICY "Allow read via function" ON public.email_templates FOR SELECT USING (true);
CREATE POLICY "Allow insert via function" ON public.email_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update via function" ON public.email_templates FOR UPDATE USING (true);
CREATE POLICY "Allow delete via function" ON public.email_templates FOR DELETE USING (true);

CREATE POLICY "Allow read via function" ON public.campaign_variants FOR SELECT USING (true);
CREATE POLICY "Allow insert via function" ON public.campaign_variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update via function" ON public.campaign_variants FOR UPDATE USING (true);
CREATE POLICY "Allow delete via function" ON public.campaign_variants FOR DELETE USING (true);

-- Insert some default templates
INSERT INTO public.email_templates (name, category, subject, html_content, is_default) VALUES
('Welcome Email', 'Onboarding', 'Welcome to PropScholar!', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #1a1a2e; margin-top: 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F4CF47 100%); color: #1a1a2e; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { background: #f5f5f5; padding: 24px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to PropScholar! 🚀</h1>
    </div>
    <div class="content">
      <h2>Hi {{first_name}},</h2>
      <p>We''re thrilled to have you join our community of aspiring traders and writers!</p>
      <p>Here''s what you can do:</p>
      <ul>
        <li>Join writing competitions and win prizes</li>
        <li>Earn coins through referrals and activities</li>
        <li>Learn from our educational content</li>
      </ul>
      <p style="text-align: center; margin-top: 30px;">
        <a href="https://propscholar.com/dashboard" class="btn">Get Started</a>
      </p>
    </div>
    <div class="footer">
      <p>You received this because you signed up for PropScholar.</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>', true),
('Newsletter', 'Marketing', 'PropScholar Weekly Update', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #1a1a2e; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .section { margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #eee; }
    .btn { display: inline-block; background: #D4AF37; color: #1a1a2e; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PropScholar Weekly</h1>
      <p style="margin: 0; opacity: 0.8;">Your weekly dose of trading insights</p>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <div class="section">
        <h3>📰 This Week''s Highlights</h3>
        <p>Your content here...</p>
      </div>
      <div class="section">
        <h3>🏆 Competition Updates</h3>
        <p>Check out the latest competitions...</p>
      </div>
      <p style="text-align: center;">
        <a href="https://propscholar.com" class="btn">Visit PropScholar</a>
      </p>
    </div>
    <div class="footer">
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>', true),
('Competition Announcement', 'Events', 'New Competition: {{competition_name}}', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #D4AF37 0%, #F4CF47 100%); color: #1a1a2e; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .prize-box { background: #f8f8f8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .prize { font-size: 32px; font-weight: bold; color: #D4AF37; }
    .btn { display: inline-block; background: #1a1a2e; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 New Competition!</h1>
    </div>
    <div class="content">
      <h2 style="text-align: center;">{{competition_name}}</h2>
      <div class="prize-box">
        <p style="margin: 0 0 10px 0;">Win up to</p>
        <p class="prize">$500</p>
        <p style="margin: 10px 0 0 0;">in prizes</p>
      </div>
      <p>Hi {{first_name}},</p>
      <p>A new competition just started! Show off your skills and compete for amazing prizes.</p>
      <p style="text-align: center; margin-top: 30px;">
        <a href="https://propscholar.com/events" class="btn">Join Now</a>
      </p>
    </div>
    <div class="footer">
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>', true);