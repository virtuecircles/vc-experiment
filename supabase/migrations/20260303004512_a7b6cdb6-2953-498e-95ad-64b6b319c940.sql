
-- Guide circle assignments (allows multiple circles per guide)
CREATE TABLE IF NOT EXISTS public.guide_circle_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id uuid NOT NULL,
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by text,
  is_active boolean DEFAULT true,
  UNIQUE(guide_id, circle_id)
);

ALTER TABLE public.guide_circle_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage guide circle assignments"
  ON public.guide_circle_assignments FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));

CREATE POLICY "Guides can view their own assignments"
  ON public.guide_circle_assignments FOR SELECT
  USING (guide_id = auth.uid());

-- Message flags table
CREATE TABLE IF NOT EXISTS public.message_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.circle_messages(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL,
  flagged_at timestamptz DEFAULT now(),
  reason text,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text
);

ALTER TABLE public.message_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own flags"
  ON public.message_flags FOR INSERT
  WITH CHECK (flagged_by = auth.uid());

CREATE POLICY "Users can view their own flags"
  ON public.message_flags FOR SELECT
  USING (flagged_by = auth.uid());

CREATE POLICY "Admins and guides can manage all flags"
  ON public.message_flags FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role, 'vc_guide'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role, 'vc_guide'::app_role]));

-- Allow admins to soft-delete (update) circle messages
CREATE POLICY "Admins and guides can update circle messages"
  ON public.circle_messages FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role, 'vc_guide'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role, 'vc_guide'::app_role]));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guide_circle_assignments_guide ON public.guide_circle_assignments(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_circle_assignments_circle ON public.guide_circle_assignments(circle_id);
CREATE INDEX IF NOT EXISTS idx_message_flags_message ON public.message_flags(message_id);
CREATE INDEX IF NOT EXISTS idx_message_flags_status ON public.message_flags(status);
