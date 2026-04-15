-- Allow admins/super_admins to update quiz_progress for any user
CREATE POLICY "Admins can update any quiz progress"
  ON public.quiz_progress
  FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role])
  )
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role])
  );