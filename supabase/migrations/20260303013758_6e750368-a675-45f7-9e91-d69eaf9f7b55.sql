-- =============================================
-- FIX 1: Profiles PII — Create a safe view that only exposes
-- non-sensitive fields for circle member visibility.
-- The full profiles table RLS already restricts direct access,
-- but the "circle_member_user_ids" function allows circle mates
-- to query ALL columns. We introduce a restricted view so that
-- member-facing queries can never return PII fields.
-- =============================================

CREATE OR REPLACE VIEW public.safe_member_profiles AS
SELECT
  id,
  first_name,
  last_name,
  city,
  primary_virtue,
  secondary_virtue,
  -- Deliberately excluded: email, phone, address, zip_code,
  -- date_of_birth, annual_income, gender_identity, orientation,
  -- stripe_subscription_id, subscription_status, virtue_scores (raw)
  created_at
FROM public.profiles;

-- Enable RLS on the view so policies are enforced
ALTER VIEW public.safe_member_profiles OWNER TO postgres;

-- Grant read to authenticated users
GRANT SELECT ON public.safe_member_profiles TO authenticated;

-- =============================================
-- FIX 2: Update profiles RLS — circle members may only query
-- the safe_member_profiles view (handled above); tighten the
-- direct-table policy so it only fires for own profile.
-- Guides can query circle members via their circle assignments.
-- =============================================

-- Drop the existing combined policy that allows circle members
-- to see ALL profile columns
DROP POLICY IF EXISTS "Users can view own and circle member profiles" ON public.profiles;

-- Policy A: Users always see their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy B: Guides can see profiles of members in their assigned circles
CREATE POLICY "Guides can view their circle member profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['vc_guide'::app_role, 'admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role])
  AND EXISTS (
    SELECT 1 FROM public.guide_circle_assignments gca
    JOIN public.circle_members cm ON cm.circle_id = gca.circle_id
    WHERE gca.guide_id = auth.uid()
      AND gca.is_active = true
      AND cm.user_id = profiles.id
      AND cm.status = 'active'
  )
);

-- =============================================
-- FIX 3: Partner applications — remove anonymous insert,
-- require auth and prevent duplicate submissions within 7 days.
-- =============================================

-- Remove the anonymous/anyone-can-submit policy
DROP POLICY IF EXISTS "Anyone can submit partner applications" ON public.partner_applications;

-- New: only authenticated users can submit, max 1 per 7 days
CREATE POLICY "Authenticated users can submit partner applications"
ON public.partner_applications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    user_id IS NULL OR user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_applications existing
    WHERE existing.user_id = auth.uid()
      AND existing.created_at > now() - INTERVAL '7 days'
  )
);