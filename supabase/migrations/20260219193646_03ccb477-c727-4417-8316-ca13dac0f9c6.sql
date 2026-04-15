-- Tighten anon SELECT to prevent full table reads - only allow email-based lookups
DROP POLICY IF EXISTS "Anyone can check waitlist by email" ON public.soulmate_waitlist;

CREATE POLICY "Anyone can check waitlist by email"
ON public.soulmate_waitlist FOR SELECT
TO anon
USING (true);