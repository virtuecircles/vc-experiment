
-- Fix event_rsvps: allow admin, super_admin, vc_manager to manage all RSVPs
DROP POLICY IF EXISTS "Admins can manage all RSVPs" ON public.event_rsvps;

CREATE POLICY "Admins can manage all RSVPs"
ON public.event_rsvps FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

-- Fix circles: allow admin, super_admin, vc_manager to manage all circles
DROP POLICY IF EXISTS "Admins can manage circles" ON public.circles;

CREATE POLICY "Admins can manage circles"
ON public.circles FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

-- Fix circle_members: allow admin, super_admin, vc_manager to manage memberships
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.circle_members;

CREATE POLICY "Admins can manage memberships"
ON public.circle_members FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

-- Fix notifications: allow admin, super_admin, vc_manager to create notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;

CREATE POLICY "Admins can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));
