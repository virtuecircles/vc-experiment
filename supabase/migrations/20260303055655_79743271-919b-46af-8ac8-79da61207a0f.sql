
-- Allow circle members to view roles of guides assigned to their circles
CREATE POLICY "Members can view roles of their circle guides"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.guide_circle_assignments gca
    JOIN public.circle_members cm ON cm.circle_id = gca.circle_id
    WHERE gca.guide_id = user_roles.user_id
      AND gca.is_active = true
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  )
);
