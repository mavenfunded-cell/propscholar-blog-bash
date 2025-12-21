-- Create sitemap_urls table for managing static sitemap entries
CREATE TABLE public.sitemap_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  changefreq TEXT NOT NULL DEFAULT 'weekly',
  priority TEXT NOT NULL DEFAULT '0.8',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sitemap_urls ENABLE ROW LEVEL SECURITY;

-- Admins can manage sitemap URLs
CREATE POLICY "Admins can manage sitemap URLs" 
ON public.sitemap_urls 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view sitemap URLs (needed for sitemap generation)
CREATE POLICY "Anyone can view sitemap URLs" 
ON public.sitemap_urls 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_sitemap_urls_updated_at
BEFORE UPDATE ON public.sitemap_urls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial URLs
INSERT INTO public.sitemap_urls (url, changefreq, priority) VALUES
('https://propscholar.space/', 'weekly', '1.0'),
('https://propscholar.space/about', 'monthly', '0.8'),
('https://propscholar.space/blog', 'daily', '0.9');