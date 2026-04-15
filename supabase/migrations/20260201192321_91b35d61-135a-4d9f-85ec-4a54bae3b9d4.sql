-- Create plan enum for subscriptions
CREATE TYPE public.subscription_plan AS ENUM ('pathfinder', 'virtue_circles', 'soulmatch_ai');

-- Create communication preference enum
CREATE TYPE public.communication_preference AS ENUM ('email', 'sms', 'both');

-- Create event status enum
CREATE TYPE public.event_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');

-- Create RSVP status enum
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'confirmed', 'declined', 'attended', 'no_show');

-- Create circle status enum
CREATE TYPE public.circle_status AS ENUM ('forming', 'active', 'completed', 'archived');

-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('event_reminder', 'schedule_update', 'retest_available', 'announcement', 'circle_assignment', 'message');

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS communication_preference communication_preference DEFAULT 'email',
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_plan subscription_plan DEFAULT 'pathfinder',
ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS primary_virtue TEXT,
ADD COLUMN IF NOT EXISTS secondary_virtue TEXT,
ADD COLUMN IF NOT EXISTS virtue_scores JSONB DEFAULT '{}';

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  max_participants INTEGER DEFAULT 20,
  status event_status DEFAULT 'upcoming',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create circles (groups) table
CREATE TABLE public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  primary_virtue TEXT,
  max_members INTEGER DEFAULT 6,
  status circle_status DEFAULT 'forming',
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create circle members table (user-circle assignments)
CREATE TABLE public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  suggested_by_system BOOLEAN DEFAULT false,
  approved_by_admin BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  UNIQUE(circle_id, user_id)
);

-- Create event RSVPs table
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status rsvp_status DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create circle messages table
CREATE TABLE public.circle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create retest permissions table
CREATE TABLE public.retest_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  is_system_wide BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT false,
  enabled_by UUID REFERENCES auth.users(id),
  enabled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create feedback table
CREATE TABLE public.event_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create archived quiz results table
CREATE TABLE public.archived_quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  demographics JSONB,
  likert_responses JSONB,
  open_ended_responses JSONB,
  primary_virtue TEXT,
  secondary_virtue TEXT,
  virtue_scores JSONB,
  archived_at TIMESTAMPTZ DEFAULT now()
);

-- Create waiver signing table
CREATE TABLE public.user_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  waiver_type TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  UNIQUE(user_id, waiver_type)
);

-- Enable RLS on all new tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retest_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_waivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for circles
CREATE POLICY "Users can view circles they belong to" ON public.circles FOR SELECT 
  USING (id IN (SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage circles" ON public.circles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for circle_members
CREATE POLICY "Users can view their memberships" ON public.circle_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage memberships" ON public.circle_members FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for event_rsvps
CREATE POLICY "Users can view own RSVPs" ON public.event_rsvps FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own RSVPs" ON public.event_rsvps FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own RSVPs" ON public.event_rsvps FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all RSVPs" ON public.event_rsvps FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for circle_messages
CREATE POLICY "Users can view messages in their circles" ON public.circle_messages FOR SELECT 
  USING (circle_id IN (SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can send messages to their active circles" ON public.circle_messages FOR INSERT 
  WITH CHECK (circle_id IN (SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Admins can view all messages" ON public.circle_messages FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can create notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for retest_permissions
CREATE POLICY "Users can view own retest permissions" ON public.retest_permissions FOR SELECT USING (user_id = auth.uid() OR is_system_wide = true);
CREATE POLICY "Admins can manage retest permissions" ON public.retest_permissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for event_feedback
CREATE POLICY "Users can view own feedback" ON public.event_feedback FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can submit feedback" ON public.event_feedback FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all feedback" ON public.event_feedback FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for archived_quiz_results
CREATE POLICY "Admins can view archived results" ON public.archived_quiz_results FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert archived results" ON public.archived_quiz_results FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_waivers
CREATE POLICY "Users can view own waivers" ON public.user_waivers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can sign waivers" ON public.user_waivers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all waivers" ON public.user_waivers FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at columns
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_circles_updated_at BEFORE UPDATE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_rsvps_updated_at BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user can retest
CREATE OR REPLACE FUNCTION public.can_user_retest(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.retest_permissions
    WHERE (user_id = user_uuid OR is_system_wide = true)
      AND enabled = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;