
-- Guide Applications table
CREATE TABLE public.guide_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  state text,
  why_guide text NOT NULL,
  experience text,
  availability text,
  linkedin_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guide_applications ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can submit a guide application
CREATE POLICY "Users can submit guide applications"
  ON public.guide_applications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own applications
CREATE POLICY "Users can view own guide applications"
  ON public.guide_applications FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage all guide applications
CREATE POLICY "Admins can manage guide applications"
  ON public.guide_applications FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role]));

-- Partner Applications table
CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  business_type text,
  city text,
  state text,
  address text,
  partnership_interest text NOT NULL,
  additional_info text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can submit a partner application
CREATE POLICY "Anyone can submit partner applications"
  ON public.partner_applications FOR INSERT
  WITH CHECK (true);

-- Authenticated users can view their own applications
CREATE POLICY "Users can view own partner applications"
  ON public.partner_applications FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage all partner applications
CREATE POLICY "Admins can manage partner applications"
  ON public.partner_applications FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role]));

-- Triggers for updated_at
CREATE TRIGGER update_guide_applications_updated_at
  BEFORE UPDATE ON public.guide_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_applications_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
