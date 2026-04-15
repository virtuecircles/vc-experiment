
-- Block anonymous (unauthenticated) SELECT access on guide_applications
-- The table already has admin and user-scoped SELECT policies; this ensures
-- unauthenticated requests are denied even if RLS evaluation falls through.
DROP POLICY IF EXISTS "Block anonymous select on guide_applications" ON public.guide_applications;
CREATE POLICY "Block anonymous select on guide_applications"
ON public.guide_applications
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Block anonymous SELECT access on partner_applications
DROP POLICY IF EXISTS "Block anonymous select on partner_applications" ON public.partner_applications;
CREATE POLICY "Block anonymous select on partner_applications"
ON public.partner_applications
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Block anonymous SELECT access on soulmate_waitlist
DROP POLICY IF EXISTS "Block anonymous select on soulmate_waitlist" ON public.soulmate_waitlist;
CREATE POLICY "Block anonymous select on soulmate_waitlist"
ON public.soulmate_waitlist
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);
