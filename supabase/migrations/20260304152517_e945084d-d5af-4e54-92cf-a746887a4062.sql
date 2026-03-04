
-- Function to check campaign access bypassing RLS
CREATE OR REPLACE FUNCTION public.check_campaign_access(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_campaign_access
    WHERE admin_email = p_email AND has_access = true
  );
$$;

-- Function to fetch previous campaigns bypassing RLS
CREATE OR REPLACE FUNCTION public.get_previous_campaigns(p_exclude_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  subject text,
  html_content text,
  created_at timestamptz,
  status text,
  sent_count integer,
  open_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.subject, c.html_content, c.created_at, c.status, c.sent_count, c.open_count
  FROM public.campaigns c
  WHERE (p_exclude_id IS NULL OR c.id != p_exclude_id)
  ORDER BY c.created_at DESC
  LIMIT 20;
$$;
