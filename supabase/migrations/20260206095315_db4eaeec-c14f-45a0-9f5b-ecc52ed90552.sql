-- Update the profiles SELECT policy to allow users to see fellow circle members' profiles
DROP POLICY IF EXISTS "Users can view profiles of circle members" ON public.profiles;

CREATE POLICY "Users can view profiles of circle members" 
ON public.profiles 
FOR SELECT 
USING (
  id = auth.uid() 
  OR id IN (SELECT public.circle_member_user_ids(auth.uid()))
);