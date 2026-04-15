
-- Drop the old restrictive admin policy
DROP POLICY IF EXISTS "Admins can view all quiz progress" ON public.quiz_progress;

-- Create new policy that includes super_admin and vc_manager
CREATE POLICY "Admins can view all quiz progress"
ON public.quiz_progress
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));
