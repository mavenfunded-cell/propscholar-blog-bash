-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_all_courses();

-- Recreate with updated return type including SEO fields
CREATE FUNCTION public.get_all_courses()
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  thumbnail_url text,
  category text,
  difficulty text,
  duration_minutes integer,
  is_published boolean,
  is_locked boolean,
  unlock_coins integer,
  order_index integer,
  created_at timestamptz,
  video_count bigint,
  slug text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  instructor_name text,
  instructor_bio text,
  instructor_avatar text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.title,
    c.description,
    c.thumbnail_url,
    c.category,
    c.difficulty,
    c.duration_minutes,
    c.is_published,
    c.is_locked,
    c.unlock_coins,
    c.order_index,
    c.created_at,
    (SELECT COUNT(*) FROM course_videos cv WHERE cv.course_id = c.id) as video_count,
    c.slug,
    c.seo_title,
    c.seo_description,
    c.seo_keywords,
    c.instructor_name,
    c.instructor_bio,
    c.instructor_avatar
  FROM courses c
  ORDER BY c.order_index ASC;
$$;