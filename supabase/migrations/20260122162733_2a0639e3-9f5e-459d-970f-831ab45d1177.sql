-- Update get_ticket_details function to include new chatbot fields
DROP FUNCTION IF EXISTS get_ticket_details(_ticket_id uuid);

CREATE OR REPLACE FUNCTION get_ticket_details(_ticket_id uuid)
RETURNS TABLE (
  id uuid,
  ticket_number integer,
  subject text,
  user_email text,
  user_id uuid,
  status ticket_status,
  priority ticket_priority,
  source text,
  phone text,
  session_id text,
  chat_history jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  last_reply_at timestamptz,
  last_reply_by text,
  closed_at timestamptz
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
    t.source,
    t.phone,
    t.session_id,
    t.chat_history,
    t.created_at,
    t.updated_at,
    t.last_reply_at,
    t.last_reply_by,
    t.closed_at
  FROM support_tickets t
  WHERE t.id = _ticket_id;
END;
$$;

-- Update get_all_support_tickets function to include source field
DROP FUNCTION IF EXISTS get_all_support_tickets(_status_filter text, _priority_filter text);

CREATE OR REPLACE FUNCTION get_all_support_tickets(_status_filter text, _priority_filter text)
RETURNS TABLE (
  id uuid,
  ticket_number integer,
  subject text,
  user_email text,
  status ticket_status,
  priority ticket_priority,
  source text,
  created_at timestamptz,
  updated_at timestamptz,
  last_reply_at timestamptz,
  last_reply_by text
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
    t.source,
    t.created_at,
    t.updated_at,
    t.last_reply_at,
    t.last_reply_by
  FROM support_tickets t
  WHERE 
    (
      _status_filter = 'all' 
      OR (_status_filter = 'open' AND t.status != 'closed')
      OR (_status_filter = 'closed' AND t.status = 'closed')
    )
    AND 
    (
      _priority_filter = 'all' 
      OR t.priority::text = _priority_filter
    )
  ORDER BY t.created_at DESC;
END;
$$;