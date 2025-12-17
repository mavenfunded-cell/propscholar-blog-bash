-- Add explicit deny policies for magic_link_tokens to satisfy linter (table contains sensitive tokens)
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all access" ON public.magic_link_tokens;

CREATE POLICY "Deny all access"
ON public.magic_link_tokens
FOR ALL
USING (false)
WITH CHECK (false);
