-- Drop existing restrictive policy and replace with expanded role access for circle_members
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.circle_members;

CREATE POLICY "Admins can manage memberships" 
ON public.circle_members 
FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));