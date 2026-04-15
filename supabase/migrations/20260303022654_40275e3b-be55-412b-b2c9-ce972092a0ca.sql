
-- Add missing columns if not present
ALTER TABLE guide_applications
ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS honeypot text;

-- Drop all existing guide application policies
DROP POLICY IF EXISTS "Anyone can submit guide applications" ON guide_applications;
DROP POLICY IF EXISTS "Authenticated users can submit guide applications" ON guide_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON guide_applications;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON guide_applications;
DROP POLICY IF EXISTS "Allow anonymous insert" ON guide_applications;
DROP POLICY IF EXISTS "Public can submit guide application" ON guide_applications;
DROP POLICY IF EXISTS "Users can submit guide applications" ON guide_applications;
DROP POLICY IF EXISTS "Block anonymous select on guide_applications" ON guide_applications;
DROP POLICY IF EXISTS "Users can view own guide applications" ON guide_applications;
DROP POLICY IF EXISTS "Admins can manage guide applications" ON guide_applications;
DROP POLICY IF EXISTS "Only admins can view guide applications" ON guide_applications;
DROP POLICY IF EXISTS "Only admins can update guide applications" ON guide_applications;
DROP POLICY IF EXISTS "Only admins can delete guide applications" ON guide_applications;

-- POLICY 1: Allow anonymous + authenticated INSERT with honeypot + 30-day email rate limit
CREATE POLICY "Public can submit guide application"
ON guide_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (honeypot IS NULL OR honeypot = '')
  AND email IS NOT NULL AND email != ''
  AND NOT EXISTS (
    SELECT 1 FROM guide_applications existing
    WHERE LOWER(existing.email) = LOWER(guide_applications.email)
    AND existing.submitted_at > (NOW() - INTERVAL '30 days')
  )
);

-- POLICY 2: Only admins can SELECT guide applications
CREATE POLICY "Only admins can view guide applications"
ON guide_applications
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));

-- POLICY 3: Only admins can UPDATE guide applications
CREATE POLICY "Only admins can update guide applications"
ON guide_applications
FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));

-- POLICY 4: Only admins can DELETE guide applications
CREATE POLICY "Only admins can delete guide applications"
ON guide_applications
FOR DELETE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role, 'admin'::app_role]));
