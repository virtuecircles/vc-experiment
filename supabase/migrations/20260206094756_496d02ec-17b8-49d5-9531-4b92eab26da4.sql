-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view members in their circles" ON public.circle_members;

-- Create a security definer function to check circle membership
CREATE OR REPLACE FUNCTION public.user_circle_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT circle_id 
  FROM circle_members 
  WHERE user_id = _user_id AND status = 'active'
$$;

-- Create new policy using the function (avoids recursion)
CREATE POLICY "Users can view members in their circles" 
ON public.circle_members 
FOR SELECT 
USING (
  circle_id IN (SELECT public.user_circle_ids(auth.uid()))
);

-- Also fix the profiles policy that might have similar issues
DROP POLICY IF EXISTS "Users can view circle member profiles" ON public.profiles;

-- Create a function to get user IDs in user's circles
CREATE OR REPLACE FUNCTION public.circle_member_user_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT cm.user_id 
  FROM circle_members cm 
  WHERE cm.circle_id IN (
    SELECT circle_id FROM circle_members WHERE user_id = _user_id AND status = 'active'
  )
  AND cm.status = 'active'
$$;

-- Recreate the profiles policy using the function
CREATE POLICY "Users can view circle member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (SELECT public.circle_member_user_ids(auth.uid()))
);