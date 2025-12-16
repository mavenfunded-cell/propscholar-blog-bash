-- Create winners table to track contest winners
CREATE TABLE public.winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, submission_id)
);

-- Enable RLS
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

-- Anyone can view winners (public)
CREATE POLICY "Anyone can view winners"
ON public.winners
FOR SELECT
USING (true);

-- Only admins can manage winners
CREATE POLICY "Admins can insert winners"
ON public.winners
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update winners"
ON public.winners
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete winners"
ON public.winners
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));