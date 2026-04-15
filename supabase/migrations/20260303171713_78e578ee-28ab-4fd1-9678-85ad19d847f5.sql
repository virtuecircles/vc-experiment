
-- Add venue/meetup columns to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS venue_address text,
  ADD COLUMN IF NOT EXISTS venue_city text,
  ADD COLUMN IF NOT EXISTS meetup_type text DEFAULT 'in-person',
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_notes text,
  ADD COLUMN IF NOT EXISTS circle_id uuid REFERENCES public.circles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_guide_id uuid;

-- Create meetup_attendance table
CREATE TABLE IF NOT EXISTS public.meetup_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  circle_id uuid REFERENCES public.circles(id) ON DELETE SET NULL,
  guide_id uuid,
  attended boolean DEFAULT false,
  rsvp_status text DEFAULT 'pending',
  checked_in_at timestamptz,
  checked_in_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.meetup_attendance ENABLE ROW LEVEL SECURITY;

-- Members can see their own attendance
CREATE POLICY "Members see own attendance"
ON public.meetup_attendance FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role, 'vc_guide'::app_role])
);

-- Admins and guides can insert attendance records
CREATE POLICY "Admins and guides insert attendance"
ON public.meetup_attendance FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role, 'vc_guide'::app_role])
);

-- Admins and guides can update attendance records
CREATE POLICY "Admins and guides update attendance"
ON public.meetup_attendance FOR UPDATE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role, 'vc_guide'::app_role])
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role, 'vc_guide'::app_role])
);

-- Admins can delete attendance records
CREATE POLICY "Admins can delete attendance"
ON public.meetup_attendance FOR DELETE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role])
);

-- Updated_at trigger for meetup_attendance
CREATE TRIGGER update_meetup_attendance_updated_at
BEFORE UPDATE ON public.meetup_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
