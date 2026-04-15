
-- Fix: Allow VC guides to view RSVPs for events they're assigned to via lead_guide_id
-- (in addition to the existing guide_events table assignment)
DROP POLICY IF EXISTS "Guides can view RSVPs for their events" ON public.event_rsvps;

CREATE POLICY "Guides can view RSVPs for their events"
ON public.event_rsvps
FOR SELECT
USING (
  event_id IN (
    SELECT event_id FROM public.guide_events WHERE user_id = auth.uid()
  )
  OR
  event_id IN (
    SELECT id FROM public.events WHERE lead_guide_id = auth.uid()
  )
  OR
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.guide_circle_assignments gca ON gca.circle_id = e.circle_id
    WHERE gca.guide_id = auth.uid() AND gca.is_active = true
  )
);

-- Fix: Allow VC guides to mark attendance for events via lead_guide_id too
DROP POLICY IF EXISTS "Guides can mark attendance for their events" ON public.event_rsvps;

CREATE POLICY "Guides can mark attendance for their events"
ON public.event_rsvps
FOR UPDATE
USING (
  event_id IN (
    SELECT event_id FROM public.guide_events WHERE user_id = auth.uid()
  )
  OR
  event_id IN (
    SELECT id FROM public.events WHERE lead_guide_id = auth.uid()
  )
  OR
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.guide_circle_assignments gca ON gca.circle_id = e.circle_id
    WHERE gca.guide_id = auth.uid() AND gca.is_active = true
  )
)
WITH CHECK (
  event_id IN (
    SELECT event_id FROM public.guide_events WHERE user_id = auth.uid()
  )
  OR
  event_id IN (
    SELECT id FROM public.events WHERE lead_guide_id = auth.uid()
  )
  OR
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.guide_circle_assignments gca ON gca.circle_id = e.circle_id
    WHERE gca.guide_id = auth.uid() AND gca.is_active = true
  )
);
