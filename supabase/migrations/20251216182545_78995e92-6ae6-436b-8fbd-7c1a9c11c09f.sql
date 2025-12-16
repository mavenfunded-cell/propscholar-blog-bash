-- Allow anyone to view submissions that are winners
CREATE POLICY "Anyone can view winner submissions"
ON public.submissions
FOR SELECT
USING (
  id IN (SELECT submission_id FROM public.winners)
);