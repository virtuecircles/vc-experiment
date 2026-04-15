
-- Add honeypot column to soulmate_waitlist for bot protection
ALTER TABLE public.soulmate_waitlist ADD COLUMN IF NOT EXISTS honeypot text;

-- Drop the loose anonymous insert policy
DROP POLICY IF EXISTS "Anonymous users can join waitlist" ON public.soulmate_waitlist;
DROP POLICY IF EXISTS "Authenticated users can join waitlist" ON public.soulmate_waitlist;

-- Replace with a single hardened insert policy that:
-- 1. Rejects non-empty honeypot (bot trap)
-- 2. Requires a valid email
-- 3. Rate-limits to 1 submission per email (prevents re-submissions)
CREATE POLICY "Public can join soulmate waitlist"
ON public.soulmate_waitlist
FOR INSERT
WITH CHECK (
  ((honeypot IS NULL) OR (honeypot = ''))
  AND (email IS NOT NULL)
  AND (email <> '')
  AND (NOT (EXISTS (
    SELECT 1 FROM public.soulmate_waitlist existing
    WHERE lower(existing.email) = lower(soulmate_waitlist.email)
  )))
);
