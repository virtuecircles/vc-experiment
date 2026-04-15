-- Fix RLS: allow all admin roles to view event_feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.event_feedback;

CREATE POLICY "Admins can view all feedback"
ON public.event_feedback
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role])
);