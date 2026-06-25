ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_closed boolean NOT NULL DEFAULT false;