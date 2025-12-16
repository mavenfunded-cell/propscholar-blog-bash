-- Only admins can update submissions
CREATE POLICY "Only admins can update submissions" ON public.submissions
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete submissions
CREATE POLICY "Only admins can delete submissions" ON public.submissions
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));