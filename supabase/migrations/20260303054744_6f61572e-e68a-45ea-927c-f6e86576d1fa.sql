
-- Allow VC Guides to send messages to their assigned circles
CREATE POLICY "Guides can send messages to their assigned circles"
ON public.circle_messages
FOR INSERT
WITH CHECK (
  circle_id IN (
    SELECT circle_id FROM public.guide_circle_assignments
    WHERE guide_id = auth.uid() AND is_active = true
  )
);
