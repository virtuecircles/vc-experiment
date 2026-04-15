-- Allow Super Admins and VC Managers to update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR 
  public.has_role(auth.uid(), 'vc_manager'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR 
  public.has_role(auth.uid(), 'vc_manager'::app_role)
);