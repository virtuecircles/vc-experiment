
-- Allow circle members to view guide assignments for their own circles
-- This is needed so the user_roles RLS policy EXISTS subquery can resolve
CREATE POLICY "Members can view guide assignments for their circles"
ON public.guide_circle_assignments
FOR SELECT
USING (
  circle_id IN (SELECT user_circle_ids(auth.uid()))
);
