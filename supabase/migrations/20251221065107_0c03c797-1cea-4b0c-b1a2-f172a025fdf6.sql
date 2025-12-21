
-- Create og_images table for managing Open Graph images
CREATE TABLE public.og_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_type TEXT NOT NULL, -- 'home', 'blog', 'reel', 'rewards', 'about', etc.
  page_identifier TEXT, -- slug for blog/reel pages, null for static pages
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false, -- default image for that page type
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_type, page_identifier)
);

-- Enable RLS
ALTER TABLE public.og_images ENABLE ROW LEVEL SECURITY;

-- Admins can manage OG images
CREATE POLICY "Admins can manage OG images"
ON public.og_images
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view OG images (needed for edge function)
CREATE POLICY "Anyone can view OG images"
ON public.og_images
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_og_images_updated_at
BEFORE UPDATE ON public.og_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default home page OG image
INSERT INTO public.og_images (page_type, page_identifier, title, description, image_url, is_default)
VALUES ('home', NULL, 'PropScholar Space - The Giveaway Hub', 'Join PropScholar competitions to showcase your writing and video skills. Win prizes and earn rewards!', 'https://propscholar.space/og-image.png', true);
