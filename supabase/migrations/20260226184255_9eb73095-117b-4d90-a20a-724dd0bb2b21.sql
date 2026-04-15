
-- Fix events table RLS to allow super_admin and vc_manager to manage meetups
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Admins can manage events"
ON public.events FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));
