
DROP POLICY IF EXISTS "Admins can manage retest permissions" ON public.retest_permissions;

CREATE POLICY "Admins can manage retest permissions"
ON public.retest_permissions
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));
