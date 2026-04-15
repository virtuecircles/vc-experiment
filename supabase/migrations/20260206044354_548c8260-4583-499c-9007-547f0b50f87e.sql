
-- Drop the restrictive policy that only allows 'admin' role
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create updated policy that includes super_admin
CREATE POLICY "Admins can manage roles" 
ON public.user_roles 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Also update the SELECT policy for consistency
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'vc_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);
