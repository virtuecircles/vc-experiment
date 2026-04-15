
CREATE POLICY "Guides can mark attendance for their events"
ON public.event_rsvps
FOR UPDATE
USING (
  event_id IN (
    SELECT event_id FROM public.guide_events WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  event_id IN (
    SELECT event_id FROM public.guide_events WHERE user_id = auth.uid()
  )
);

-- Also allow guides to read RSVPs for their assigned events
CREATE POLICY "Guides can view RSVPs for their events"
ON public.event_rsvps
FOR SELECT
USING (
  event_id IN (
    SELECT event_id FROM public.guide_events WHERE user_id = auth.uid()
  )
);
