-- Drop and recreate the INSERT policy to allow both authenticated and anonymous email signups
DROP POLICY IF EXISTS "Users can join soulmate waitlist" ON public.soulmate_waitlist;

CREATE POLICY "Users can join soulmate waitlist"
ON public.soulmate_waitlist FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow anonymous users to join the waitlist (no login required)
CREATE POLICY "Anonymous users can join soulmate waitlist"
ON public.soulmate_waitlist FOR INSERT
TO anon
WITH CHECK (true);

-- Fix SELECT policy to allow checking by email (for duplicate detection)
DROP POLICY IF EXISTS "Users can view own waitlist entry" ON public.soulmate_waitlist;

CREATE POLICY "Users can view own waitlist entry"
ON public.soulmate_waitlist FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Anon can check waitlist by email"
ON public.soulmate_waitlist FOR SELECT
TO anon
USING (true);