-- Add custom categories table for Scholar Hub
CREATE TABLE public.scholar_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'book',
  color TEXT DEFAULT '#F59E0B',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scholar_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories"
ON public.scholar_categories
FOR SELECT
USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.scholar_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add SEO fields to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS instructor_name TEXT,
ADD COLUMN IF NOT EXISTS instructor_bio TEXT,
ADD COLUMN IF NOT EXISTS instructor_avatar TEXT;

-- Add more fields to course_videos
ALTER TABLE public.course_videos
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]'::jsonb;

-- Insert default categories
INSERT INTO public.scholar_categories (name, slug, description, icon, color, order_index) VALUES
  ('Price Action', 'price-action', 'Master reading raw price movements', 'candlestick-chart', '#10B981', 1),
  ('Risk Management', 'risk-management', 'Protect your capital effectively', 'shield', '#3B82F6', 2),
  ('Trading Psychology', 'trading-psychology', 'Master your emotions and mindset', 'brain', '#8B5CF6', 3),
  ('Technical Analysis', 'technical-analysis', 'Charts, indicators, and patterns', 'trending-up', '#F59E0B', 4),
  ('Fundamental Analysis', 'fundamental-analysis', 'News, events, and macro factors', 'newspaper', '#EC4899', 5),
  ('Forex', 'forex', 'Currency pair trading strategies', 'globe', '#06B6D4', 6),
  ('Crypto', 'crypto', 'Digital asset trading', 'bitcoin', '#F97316', 7),
  ('Prop Firm Strategies', 'prop-firm', 'Pass challenges and scale accounts', 'rocket', '#EF4444', 8)
ON CONFLICT (slug) DO NOTHING;

-- Function to get all categories for admin
CREATE OR REPLACE FUNCTION public.get_all_scholar_categories()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  description text,
  icon text,
  color text,
  order_index integer,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, description, icon, color, order_index, is_active, created_at
  FROM public.scholar_categories
  ORDER BY order_index ASC;
$$;