-- Create RPC functions for admin pages to bypass RLS

-- Email logs
CREATE OR REPLACE FUNCTION get_all_email_logs()
RETURNS TABLE (
  id UUID,
  recipient_email TEXT,
  subject TEXT,
  email_type TEXT,
  status TEXT,
  error_message TEXT,
  event_id UUID,
  created_at TIMESTAMPTZ,
  message_body TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.recipient_email,
    e.subject,
    e.email_type,
    e.status,
    e.error_message,
    e.event_id,
    e.created_at,
    e.message_body
  FROM email_logs e
  ORDER BY e.created_at DESC
  LIMIT 500;
END;
$$;

-- Support tickets
CREATE OR REPLACE FUNCTION get_all_support_tickets(
  _status_filter TEXT DEFAULT 'all',
  _priority_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  ticket_number INT,
  subject TEXT,
  user_email TEXT,
  status ticket_status,
  priority ticket_priority,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  last_reply_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.ticket_number,
    t.subject,
    t.user_email,
    t.status,
    t.priority,
    t.created_at,
    t.updated_at,
    t.last_reply_at,
    t.last_reply_by
  FROM support_tickets t
  WHERE 
    (_status_filter = 'all' OR 
     (_status_filter = 'open' AND t.status IN ('open', 'awaiting_support', 'awaiting_user')) OR
     (_status_filter = 'closed' AND t.status = 'closed'))
    AND (_priority_filter = 'all' OR t.priority::text = _priority_filter)
  ORDER BY t.last_reply_at DESC;
END;
$$;

-- Support messages for a ticket
CREATE OR REPLACE FUNCTION get_ticket_messages(_ticket_id UUID)
RETURNS TABLE (
  id UUID,
  ticket_id UUID,
  sender_type TEXT,
  sender_email TEXT,
  sender_name TEXT,
  body TEXT,
  body_html TEXT,
  attachments JSONB,
  is_internal_note BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.ticket_id,
    m.sender_type,
    m.sender_email,
    m.sender_name,
    m.body,
    m.body_html,
    m.attachments,
    m.is_internal_note,
    m.created_at
  FROM support_messages m
  WHERE m.ticket_id = _ticket_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Ticket details
CREATE OR REPLACE FUNCTION get_ticket_details(_ticket_id UUID)
RETURNS TABLE (
  id UUID,
  ticket_number INT,
  subject TEXT,
  user_email TEXT,
  user_id UUID,
  status ticket_status,
  priority ticket_priority,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  last_reply_by TEXT,
  closed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.ticket_number,
    t.subject,
    t.user_email,
    t.user_id,
    t.status,
    t.priority,
    t.created_at,
    t.updated_at,
    t.last_reply_at,
    t.last_reply_by,
    t.closed_at
  FROM support_tickets t
  WHERE t.id = _ticket_id;
END;
$$;

-- Admin notifications log
CREATE OR REPLACE FUNCTION get_admin_notifications_log()
RETURNS TABLE (
  id UUID,
  admin_id UUID,
  target_type TEXT,
  title TEXT,
  message TEXT,
  action_url TEXT,
  cta_text TEXT,
  sent_at TIMESTAMPTZ,
  recipient_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.admin_id,
    n.target_type,
    n.title,
    n.message,
    n.action_url,
    n.cta_text,
    n.sent_at,
    n.recipient_count
  FROM admin_notifications n
  ORDER BY n.sent_at DESC
  LIMIT 50;
END;
$$;

-- Canned messages
CREATE OR REPLACE FUNCTION get_all_canned_messages()
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  shortcut TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.content,
    m.category,
    m.shortcut,
    m.created_at
  FROM canned_messages m
  ORDER BY m.category ASC;
END;
$$;

-- AI Knowledge base
CREATE OR REPLACE FUNCTION get_all_ai_knowledge()
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  source TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.title,
    k.content,
    k.category,
    k.source,
    k.is_active,
    k.created_at
  FROM ai_knowledge_base k
  ORDER BY k.created_at DESC;
END;
$$;

-- OG Images
CREATE OR REPLACE FUNCTION get_all_og_images()
RETURNS TABLE (
  id UUID,
  page_type TEXT,
  page_identifier TEXT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.page_type,
    o.page_identifier,
    o.title,
    o.description,
    o.image_url,
    o.is_default,
    o.created_at,
    o.updated_at
  FROM og_images o
  ORDER BY o.page_type ASC;
END;
$$;

-- Coupon pools
CREATE OR REPLACE FUNCTION get_all_coupons()
RETURNS TABLE (
  id UUID,
  coupon_code TEXT,
  reward_type TEXT,
  status TEXT,
  assigned_to UUID,
  assigned_email TEXT,
  assigned_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.coupon_code,
    c.reward_type,
    c.status,
    c.assigned_to,
    c.assigned_email,
    c.assigned_at,
    c.used_at,
    c.expires_at,
    c.revoke_reason,
    c.created_at
  FROM coupon_pools c
  ORDER BY c.created_at DESC;
END;
$$;

-- Winner claims
CREATE OR REPLACE FUNCTION get_all_winner_claims()
RETURNS TABLE (
  id UUID,
  winner_type TEXT,
  winner_id UUID,
  event_id UUID,
  submission_id UUID,
  user_email TEXT,
  claim_name TEXT,
  claim_email TEXT,
  claim_position INT,
  status TEXT,
  claimed_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.winner_type,
    w.winner_id,
    w.event_id,
    w.submission_id,
    w.user_email,
    w.claim_name,
    w.claim_email,
    w.position,
    w.status,
    w.claimed_at,
    w.issued_at,
    w.admin_notes,
    w.created_at
  FROM winner_claims w
  ORDER BY w.created_at DESC;
END;
$$;

-- SEO settings
CREATE OR REPLACE FUNCTION get_all_seo_settings()
RETURNS TABLE (
  id UUID,
  page_name TEXT,
  page_path TEXT,
  title TEXT,
  description TEXT,
  keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  canonical_url TEXT,
  robots TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.page_name,
    s.page_path,
    s.title,
    s.description,
    s.keywords,
    s.og_title,
    s.og_description,
    s.og_image,
    s.canonical_url,
    s.robots,
    s.created_at,
    s.updated_at
  FROM seo_settings s
  ORDER BY s.page_path ASC;
END;
$$;

-- Ticket reviews
CREATE OR REPLACE FUNCTION get_all_ticket_reviews()
RETURNS TABLE (
  id UUID,
  ticket_id UUID,
  user_email TEXT,
  rating INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.ticket_id,
    r.user_email,
    r.rating,
    r.created_at
  FROM ticket_reviews r
  ORDER BY r.created_at DESC;
END;
$$;

-- Reward claims
CREATE OR REPLACE FUNCTION get_all_reward_claims()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  reward_id UUID,
  coins_spent INT,
  status TEXT,
  coupon_code TEXT,
  coupon_id UUID,
  expires_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.reward_id,
    c.coins_spent,
    c.status,
    c.coupon_code,
    c.coupon_id,
    c.expires_at,
    c.fulfilled_at,
    c.notes,
    c.created_at
  FROM reward_claims c
  ORDER BY c.created_at DESC;
END;
$$;

-- All events for admin
CREATE OR REPLACE FUNCTION get_all_events()
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  competition_type TEXT,
  status TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  min_words INT,
  prizes JSONB,
  rewards TEXT,
  featured_image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.slug,
    e.description,
    e.competition_type,
    e.status,
    e.start_date,
    e.end_date,
    e.min_words,
    e.prizes,
    e.rewards,
    e.featured_image_url,
    e.created_at,
    e.updated_at
  FROM events e
  ORDER BY e.created_at DESC;
END;
$$;