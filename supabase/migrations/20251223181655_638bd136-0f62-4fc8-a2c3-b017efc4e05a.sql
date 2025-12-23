-- Educational System Tables

-- Courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'general',
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT true,
  unlock_coins INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course videos/lessons table
CREATE TABLE public.course_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User course progress tracking
CREATE TABLE public.user_course_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.course_videos(id) ON DELETE SET NULL,
  progress_percent INTEGER DEFAULT 0,
  completed_videos UUID[] DEFAULT '{}',
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

-- Courses policies
CREATE POLICY "Anyone can view published courses"
ON public.courses FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage courses"
ON public.courses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Course videos policies
CREATE POLICY "Anyone can view videos of published courses"
ON public.course_videos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = course_id AND c.is_published = true
  )
);

CREATE POLICY "Admins can manage course videos"
ON public.course_videos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- User progress policies
CREATE POLICY "Users can view own progress"
ON public.user_course_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.user_course_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.user_course_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
ON public.user_course_progress FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin RPC functions
CREATE OR REPLACE FUNCTION public.get_all_courses()
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
  created_at timestamp with time zone,
  video_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    COUNT(v.id) as video_count
  FROM public.courses c
  LEFT JOIN public.course_videos v ON v.course_id = c.id
  GROUP BY c.id
  ORDER BY c.order_index ASC, c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_course_videos(_course_id uuid)
RETURNS TABLE(
  id uuid,
  course_id uuid,
  title text,
  description text,
  video_url text,
  thumbnail_url text,
  duration_seconds integer,
  order_index integer,
  is_preview boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id,
    course_id,
    title,
    description,
    video_url,
    thumbnail_url,
    duration_seconds,
    order_index,
    is_preview,
    created_at
  FROM public.course_videos
  WHERE course_videos.course_id = _course_id
  ORDER BY order_index ASC, created_at ASC;
$$;

-- Indexes for performance
CREATE INDEX idx_courses_published ON public.courses(is_published);
CREATE INDEX idx_courses_category ON public.courses(category);
CREATE INDEX idx_course_videos_course ON public.course_videos(course_id);
CREATE INDEX idx_user_progress_user ON public.user_course_progress(user_id);
CREATE INDEX idx_user_progress_course ON public.user_course_progress(course_id);