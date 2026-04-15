-- Fix: All existing policies on soulmate_waitlist are RESTRICTIVE (not permissive)
-- which means NO access is granted. We need PERMISSIVE policies.

-- Drop all existing policies
DROP POLICY IF EXISTS "Super admins can manage soulmate waitlist" ON public.soulmate_waitlist;
DROP POLICY IF EXISTS "Users can join soulmate waitlist" ON public.soulmate_waitlist;
DROP POLICY IF EXISTS "Users can view own waitlist entry" ON public.soulmate_waitlist;
DROP POLICY IF EXISTS "Anonymous users can join soulmate waitlist" ON public.soulmate_waitlist;
DROP POLICY IF EXISTS "Anon can check waitlist by email" ON public.soulmate_waitlist;

-- Recreate as PERMISSIVE policies (the default)
CREATE POLICY "Super admins can manage soulmate waitlist"
ON public.soulmate_waitlist FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated users can join waitlist"
ON public.soulmate_waitlist FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own waitlist entry"
ON public.soulmate_waitlist FOR SELECT
TO authenticated
USING (user_id = auth.uid());