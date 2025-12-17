-- Create magic link tokens table
CREATE TABLE public.magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- Allow the edge function to manage tokens (using service role)
-- No public policies needed as this is only accessed via edge functions

-- Create index for faster lookups
CREATE INDEX idx_magic_link_tokens_token ON public.magic_link_tokens(token);
CREATE INDEX idx_magic_link_tokens_email ON public.magic_link_tokens(email);