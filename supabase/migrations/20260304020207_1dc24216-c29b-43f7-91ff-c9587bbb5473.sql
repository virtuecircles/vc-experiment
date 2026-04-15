-- Allow guides to view circles they are assigned to
CREATE POLICY "Guides can view their assigned circles"
ON public.circles
FOR SELECT
USING (
  id IN (
    SELECT circle_id FROM public.guide_circle_assignments
    WHERE guide_id = auth.uid() AND is_active = true
  )
);

-- Allow guides to view circle members of their assigned circles
CREATE POLICY "Guides can view members of their assigned circles"
ON public.circle_members
FOR SELECT
USING (
  circle_id IN (
    SELECT circle_id FROM public.guide_circle_assignments
    WHERE guide_id = auth.uid() AND is_active = true
  )
);