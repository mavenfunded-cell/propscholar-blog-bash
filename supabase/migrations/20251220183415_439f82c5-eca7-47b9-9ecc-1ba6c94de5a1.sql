-- Create table for storing ticket reviews
CREATE TABLE public.ticket_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert reviews" ON public.ticket_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all reviews" ON public.ticket_reviews
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own reviews" ON public.ticket_reviews
  FOR SELECT USING (user_email = current_user_email());