-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('open', 'awaiting_support', 'awaiting_user', 'closed');

-- Create enum for ticket priority
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create support_tickets table
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number SERIAL,
    subject TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    original_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE,
    last_reply_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_reply_by TEXT DEFAULT 'user'
);

-- Create support_messages table
CREATE TABLE public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    sender_type TEXT NOT NULL DEFAULT 'user',
    body TEXT NOT NULL,
    body_html TEXT,
    message_id TEXT,
    in_reply_to TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_internal_note BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_support_tickets_user_email ON public.support_tickets(user_email);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_original_message_id ON public.support_tickets(original_message_id);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_message_id ON public.support_messages(message_id);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Admins can manage all tickets"
ON public.support_tickets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own tickets by email"
ON public.support_tickets
FOR SELECT
USING (user_email = current_user_email());

CREATE POLICY "Users can view own tickets by user_id"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (user_email = current_user_email() OR user_id = auth.uid());

-- RLS Policies for support_messages
CREATE POLICY "Admins can manage all messages"
ON public.support_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view messages of own tickets"
ON public.support_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id
        AND (t.user_email = current_user_email() OR t.user_id = auth.uid())
    )
    AND is_internal_note = false
);

CREATE POLICY "Users can insert messages to own tickets"
ON public.support_messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id
        AND (t.user_email = current_user_email() OR t.user_id = auth.uid())
    )
    AND sender_type = 'user'
    AND is_internal_note = false
);

-- Trigger to update ticket on new message
CREATE OR REPLACE FUNCTION public.update_ticket_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.support_tickets
    SET 
        updated_at = now(),
        last_reply_at = now(),
        last_reply_by = NEW.sender_type,
        status = CASE 
            WHEN NEW.sender_type = 'admin' THEN 'awaiting_user'::ticket_status
            WHEN NEW.sender_type = 'user' THEN 'awaiting_support'::ticket_status
            ELSE status
        END
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_message_insert
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_ticket_on_message();

-- Function to find ticket by message reference
CREATE OR REPLACE FUNCTION public.find_ticket_by_message_ref(_message_id TEXT, _in_reply_to TEXT, _references TEXT)
RETURNS UUID AS $$
DECLARE
    ticket_uuid UUID;
BEGIN
    -- Try to find by in_reply_to
    IF _in_reply_to IS NOT NULL THEN
        SELECT ticket_id INTO ticket_uuid
        FROM public.support_messages
        WHERE message_id = _in_reply_to
        LIMIT 1;
        
        IF ticket_uuid IS NOT NULL THEN
            RETURN ticket_uuid;
        END IF;
    END IF;
    
    -- Try to find by references
    IF _references IS NOT NULL THEN
        SELECT ticket_id INTO ticket_uuid
        FROM public.support_messages
        WHERE message_id = ANY(string_to_array(_references, ' '))
        LIMIT 1;
        
        IF ticket_uuid IS NOT NULL THEN
            RETURN ticket_uuid;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;