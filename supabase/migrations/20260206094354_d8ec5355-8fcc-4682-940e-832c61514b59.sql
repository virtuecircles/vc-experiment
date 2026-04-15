-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their memberships" ON public.circle_members;

-- Create new policy allowing users to see all members in circles they belong to
CREATE POLICY "Users can view members in their circles" 
ON public.circle_members 
FOR SELECT 
USING (
  circle_id IN (
    SELECT cm.circle_id 
    FROM circle_members cm 
    WHERE cm.user_id = auth.uid() AND cm.status = 'active'
  )
);

-- Also need to allow users to see profiles of people in their circles
-- Drop existing user self-view policy and replace with expanded one
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate self-view policy
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Add policy to view profiles of circle members
CREATE POLICY "Users can view circle member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT cm.user_id 
    FROM circle_members cm 
    WHERE cm.circle_id IN (
      SELECT cm2.circle_id 
      FROM circle_members cm2 
      WHERE cm2.user_id = auth.uid() AND cm2.status = 'active'
    )
    AND cm.status = 'active'
  )
);