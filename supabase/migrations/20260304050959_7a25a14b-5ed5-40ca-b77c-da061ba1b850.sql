-- Fix: allow super_admin and vc_manager to view all circle messages (needed for flagged messages panel)
DROP POLICY IF EXISTS "Admins can view all messages" ON public.circle_messages;

CREATE POLICY "Admins can view all messages"
ON public.circle_messages
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role])
);