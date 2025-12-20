-- Create canned messages table
CREATE TABLE public.canned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  shortcut TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI knowledge base table
CREATE TABLE public.ai_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  source TEXT DEFAULT 'manual',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS policies for canned_messages
CREATE POLICY "Admins can manage canned messages" 
ON public.canned_messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for ai_knowledge_base
CREATE POLICY "Admins can manage knowledge base" 
ON public.ai_knowledge_base 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert some default canned messages
INSERT INTO public.canned_messages (title, content, category, shortcut) VALUES
('Greeting', 'Hi there! Thank you for reaching out to PropScholar support. How can I help you today?', 'greeting', '/hi'),
('Thank You', 'Thank you for your patience while we looked into this. Please let us know if you have any other questions!', 'closing', '/thanks'),
('Need More Info', 'Thank you for contacting us. To better assist you, could you please provide more details about the issue you''re experiencing?', 'info', '/more'),
('Issue Resolved', 'Great news! The issue has been resolved. Please let us know if you encounter any further problems.', 'closing', '/resolved'),
('Escalating', 'I''m escalating this to our technical team for further investigation. We''ll get back to you as soon as we have an update.', 'escalation', '/escalate'),
('Password Reset', 'You can reset your password by clicking on "Forgot Password" on the login page. A reset link will be sent to your email.', 'account', '/password'),
('Competition Info', 'Our blog competitions run regularly! You can find all active competitions on our homepage. Simply submit your entry before the deadline to participate.', 'competition', '/comp');

-- Insert some default knowledge base entries
INSERT INTO public.ai_knowledge_base (title, content, category, source) VALUES
('About PropScholar', 'PropScholar is a platform for blog and reel competitions. Users can participate in writing competitions, submit their entries, and win prizes. We also have a coin reward system where users earn coins for various activities.', 'general', 'manual'),
('Coin System', 'Users earn coins through: signing up (welcome bonus), referring friends, participating in competitions, and following our social media. Coins can be redeemed for rewards like discount coupons.', 'rewards', 'manual'),
('Competition Rules', 'Blog competitions require a minimum word count (usually 250+ words). Entries are voted on by the community. Winners are announced after the competition ends.', 'competition', 'manual'),
('Support Hours', 'Our support team typically responds within 24-48 hours. For urgent issues, please mark your ticket as high priority.', 'support', 'manual');