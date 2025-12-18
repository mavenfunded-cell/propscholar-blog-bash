-- Add structured prizes column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS prizes jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN public.events.prizes IS 'Array of prize objects: [{position: 1, title: "1st Place", prize: "$500 Scholarship"}, ...]';