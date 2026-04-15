-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage circles" ON public.circles;

-- Create updated policy that includes super_admin and vc_manager roles
CREATE POLICY "Admins can manage circles" 
ON public.circles 
FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));