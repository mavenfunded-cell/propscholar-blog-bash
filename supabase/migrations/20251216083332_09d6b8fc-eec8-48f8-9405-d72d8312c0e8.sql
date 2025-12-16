-- Only admins can insert new role assignments
CREATE POLICY "Only admins can insert roles" 
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete role assignments
CREATE POLICY "Only admins can delete roles" 
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));