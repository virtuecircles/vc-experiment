
-- Fix: Expand admin waiver view policy to include super_admin and vc_manager roles
DROP POLICY IF EXISTS "Admins can view all waivers" ON public.user_waivers;

CREATE POLICY "Admins can view all waivers"
ON public.user_waivers
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));
