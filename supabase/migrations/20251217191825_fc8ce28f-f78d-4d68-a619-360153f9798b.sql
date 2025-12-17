-- Create SEO settings table for managing meta tags per page
CREATE TABLE public.seo_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path text NOT NULL UNIQUE,
  page_name text NOT NULL,
  title text,
  description text,
  keywords text,
  og_title text,
  og_description text,
  og_image text,
  canonical_url text,
  robots text DEFAULT 'index, follow',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view SEO settings (needed for frontend to read)
CREATE POLICY "Anyone can view SEO settings"
ON public.seo_settings
FOR SELECT
USING (true);

-- Only admins can manage SEO settings
CREATE POLICY "Admins can manage SEO settings"
ON public.seo_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_seo_settings_updated_at
BEFORE UPDATE ON public.seo_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SEO settings for all existing pages
INSERT INTO public.seo_settings (page_path, page_name, title, description, keywords) VALUES
('/', 'Home', 'PropScholar - Blog & Reel Competitions', 'Join PropScholar competitions to showcase your writing and video skills. Win prizes and earn rewards!', 'propscholar, blog competition, reel competition, writing contest, video contest, prop firm'),
('/blog', 'Blog Competitions', 'Blog Competitions - PropScholar', 'Participate in blog writing competitions and win exciting prizes at PropScholar.', 'blog competition, writing contest, blog writing, propscholar blog'),
('/reels', 'Reel Competitions', 'Reel Competitions - PropScholar', 'Submit your best reels and compete for amazing prizes at PropScholar.', 'reel competition, video contest, short video, propscholar reels'),
('/dashboard', 'Dashboard', 'My Dashboard - PropScholar', 'Track your PropScholar journey, view submissions, and check your rewards.', 'propscholar dashboard, my submissions, user profile'),
('/rewards', 'Rewards', 'Space Coins & Rewards - PropScholar', 'Earn Space Coins and redeem exclusive rewards at PropScholar.', 'space coins, rewards, propscholar rewards, earn coins'),
('/terms', 'Terms & Conditions', 'Terms and Conditions - PropScholar', 'Read the terms and conditions for PropScholar competitions and services.', 'terms and conditions, propscholar terms, contest rules'),
('/auth', 'Login / Sign Up', 'Login or Sign Up - PropScholar', 'Create an account or login to PropScholar to participate in competitions.', 'login, sign up, register, propscholar account')
ON CONFLICT (page_path) DO NOTHING;