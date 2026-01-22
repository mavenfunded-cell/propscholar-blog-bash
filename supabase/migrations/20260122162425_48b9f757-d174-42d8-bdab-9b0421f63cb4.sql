-- Add new columns for chatbot/form ticket support
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'email' CHECK (source IN ('email', 'chatbot', 'form')),
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS chat_history JSONB;

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON public.support_tickets(source);

-- Comment for documentation
COMMENT ON COLUMN public.support_tickets.source IS 'Ticket origin: email, chatbot, or form';
COMMENT ON COLUMN public.support_tickets.phone IS 'Customer phone number from chatbot/form';
COMMENT ON COLUMN public.support_tickets.session_id IS 'Chatbot session identifier';
COMMENT ON COLUMN public.support_tickets.chat_history IS 'Array of chat messages before ticket creation';