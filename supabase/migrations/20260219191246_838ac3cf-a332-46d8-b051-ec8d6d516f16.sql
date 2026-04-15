-- Add anon INSERT policy so unauthenticated users can join waitlist
CREATE POLICY "Anonymous users can join waitlist"
ON public.soulmate_waitlist FOR INSERT
TO anon
WITH CHECK (true);

-- Add anon SELECT policy for email duplicate check only
CREATE POLICY "Anyone can check waitlist by email"
ON public.soulmate_waitlist FOR SELECT
TO anon
USING (true);