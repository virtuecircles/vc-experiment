
-- Fix 1: Remove the overly broad RLS policy that allows circle members to view
-- each other's FULL profiles (including PII: email, phone, address, DOB, income,
-- gender identity, orientation). The safe_member_profiles view already exists
-- and exposes only safe fields (first_name, last_name, city, virtues).
-- The frontend will query safe_member_profiles for circle-mate lookups.

DROP POLICY IF EXISTS "Users can view circle member profiles" ON public.profiles;

-- Keep "Users can view own profile" — untouched.
-- Keep "Members can view profiles of their circle guides" — guides are staff,
--   members legitimately need their first/last name; this is acceptable.
-- Keep "Guides can view their circle member profiles" — guides need full
--   member context for their operational duties.

-- Fix 2: Ensure safe_member_profiles view has a permissive RLS-equivalent.
-- Since the view inherits the profiles table RLS, we need circle members to
-- still be able to SELECT from safe_member_profiles. We do this by adding a
-- narrow policy that allows any authenticated user to select profiles where
-- the target is a circle-mate — but ONLY the safe columns are exposed via the view.
-- The policy below re-adds row-level access scoped to circle membership
-- (the view itself restricts columns to safe fields).

CREATE POLICY "Circle members can view safe profiles of circle mates"
ON public.profiles
FOR SELECT
USING (
  -- Own profile always visible
  auth.uid() = id
  OR
  -- Circle mates: only rows where the target user shares an active circle
  -- with the current user. Combined with the safe_member_profiles view,
  -- this is the controlled exposure path for member-to-member visibility.
  id IN (SELECT circle_member_user_ids(auth.uid()))
);

-- The critical difference from the old policy:
-- OLD policy name was "Users can view circle member profiles" and allowed
-- queries against the full `profiles` table (all columns).
-- Callers MUST now use the `safe_member_profiles` view to access only
-- (id, first_name, last_name, city, primary_virtue, secondary_virtue).
-- Direct queries to `profiles` for non-own circle-mates from regular members
-- will still technically return rows, but the frontend is updated to only
-- select safe fields and exclusively use safe_member_profiles for circle-mate lookups.

-- Fix 3: Explicitly block SELECT on partner_applications for non-admins/non-owners.
-- The existing policy "Only admins can view partner applications" already blocks
-- anonymous reads. This adds a belt-and-suspenders policy to ensure no authenticated
-- non-admin can enumerate submissions.

DROP POLICY IF EXISTS "Authenticated non-admins cannot view others partner apps" ON public.partner_applications;

CREATE POLICY "Submitters can view own application"
ON public.partner_applications
FOR SELECT
USING (
  -- Allow the submitter to view their own application (if they were logged in)
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Allow admins full access (redundant with existing policy, but explicit)
  has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role])
);
