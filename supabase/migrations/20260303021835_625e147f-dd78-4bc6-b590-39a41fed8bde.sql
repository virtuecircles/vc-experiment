-- Step 1: Add missing columns
ALTER TABLE public.partner_applications
ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS honeypot text;

-- Drop all existing partner application policies
DROP POLICY IF EXISTS "Anyone can submit partner applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Authenticated users can submit partner applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.partner_applications;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.partner_applications;
DROP POLICY IF EXISTS "Public can submit partner application" ON public.partner_applications;
DROP POLICY IF EXISTS "Only admins can view partner applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Only admins can update partner applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Only admins can delete partner applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Admins can manage partner applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Users can view own partner applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Block anonymous select on partner_applications" ON public.partner_applications;

-- POLICY 1: Allow anonymous + authenticated INSERT with honeypot + email rate limit
CREATE POLICY "Public can submit partner application"
ON public.partner_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (honeypot IS NULL OR honeypot = '')
  AND email IS NOT NULL AND email != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_applications existing
    WHERE LOWER(existing.email) = LOWER(partner_applications.email)
    AND existing.submitted_at > (NOW() - INTERVAL '7 days')
  )
);

-- POLICY 2: Only admins can SELECT applications
CREATE POLICY "Only admins can view partner applications"
ON public.partner_applications
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));

-- POLICY 3: Only admins can UPDATE applications
CREATE POLICY "Only admins can update partner applications"
ON public.partner_applications
FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));

-- POLICY 4: Only admins can DELETE applications
CREATE POLICY "Only admins can delete partner applications"
ON public.partner_applications
FOR DELETE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));