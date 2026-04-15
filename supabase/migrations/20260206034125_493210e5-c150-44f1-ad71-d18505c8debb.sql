-- Phase 1b: Create tables and functions for role system

-- 1. Create regions table for VC Manager assignments
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view regions" ON public.regions
FOR SELECT USING (true);

CREATE POLICY "Super admins can manage regions" ON public.regions
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 2. Create manager_regions junction table
CREATE TABLE IF NOT EXISTS public.manager_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, region_id)
);

ALTER TABLE public.manager_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage manager_regions" ON public.manager_regions
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Managers can view their regions" ON public.manager_regions
FOR SELECT USING (user_id = auth.uid());

-- 3. Add region_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id);

-- 4. Create guide_events table
CREATE TABLE IF NOT EXISTS public.guide_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.guide_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins and managers can manage guide_events" ON public.guide_events
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'vc_manager')
);

CREATE POLICY "Guides can view their assignments" ON public.guide_events
FOR SELECT USING (user_id = auth.uid());

-- 5. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- 6. Update retest_permissions
ALTER TABLE public.retest_permissions 
ADD COLUMN IF NOT EXISTS reason text,
ADD COLUMN IF NOT EXISTS notes text;

-- 7. Helper functions
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_guide_for_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guide_events
    WHERE user_id = _user_id
      AND event_id = _event_id
  )
$$;

CREATE OR REPLACE FUNCTION public.manager_has_region_access(_user_id uuid, _region_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manager_regions
    WHERE user_id = _user_id
      AND region_id = _region_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_user_data(_accessor_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_accessor_id, 'super_admin')
    OR
    (public.has_role(_accessor_id, 'vc_manager') AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.manager_regions mr ON mr.region_id = p.region_id
      WHERE p.id = _target_user_id AND mr.user_id = _accessor_id
    ))
    OR
    (public.has_role(_accessor_id, 'vc_guide') AND EXISTS (
      SELECT 1 FROM public.event_rsvps er
      JOIN public.guide_events ge ON ge.event_id = er.event_id
      WHERE er.user_id = _target_user_id AND ge.user_id = _accessor_id
    ))
    OR
    _accessor_id = _target_user_id
$$;

-- 8. Insert default regions
INSERT INTO public.regions (name, description) VALUES
  ('North America', 'United States and Canada'),
  ('Europe', 'European countries'),
  ('Asia Pacific', 'Asia and Pacific regions'),
  ('Latin America', 'Central and South America')
ON CONFLICT (name) DO NOTHING;

-- 9. Audit triggers
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (auth.uid(), 'ROLE_ADDED', 'user_roles', NEW.id, jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (auth.uid(), 'ROLE_REMOVED', 'user_roles', OLD.id, jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;
CREATE TRIGGER audit_role_changes
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

CREATE OR REPLACE FUNCTION public.log_retest_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (auth.uid(), 'RETEST_' || CASE WHEN NEW.enabled THEN 'ENABLED' ELSE 'DISABLED' END, 
            'retest_permissions', NEW.id, 
            jsonb_build_object('user_id', NEW.user_id, 'enabled', NEW.enabled, 'expires_at', NEW.expires_at));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_retest_changes ON public.retest_permissions;
CREATE TRIGGER audit_retest_changes
AFTER INSERT OR UPDATE ON public.retest_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_retest_change();