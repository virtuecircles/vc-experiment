
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create updated policy that includes all admin roles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'vc_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);
