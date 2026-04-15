-- Clean up redundant and problematic RLS policies on profiles

-- Drop the problematic "Block anonymous access" policy that uses USING(false)
DROP POLICY IF EXISTS "Block anonymous access" ON public.profiles;

-- Drop the redundant "Users can view circle member profiles" policy (duplicate of the more comprehensive one)
DROP POLICY IF EXISTS "Users can view circle member profiles" ON public.profiles;

-- Drop the older "Users can view profiles of circle members" to recreate it cleanly
DROP POLICY IF EXISTS "Users can view profiles of circle members" ON public.profiles;

-- Drop "Users can view own profile" as it will be included in the consolidated policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a single consolidated SELECT policy for regular users
CREATE POLICY "Users can view own and circle member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR id IN (SELECT public.circle_member_user_ids(auth.uid()))
);