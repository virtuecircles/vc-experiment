
-- Allow users to view basic name fields of members in their shared circles
-- This enables name resolution in circle chat messages
CREATE POLICY "Users can view circle member profiles"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR
  id IN (SELECT circle_member_user_ids(auth.uid()))
);
