
-- Replace the overly permissive INSERT policy with one that still allows public submissions
-- but requires the email field to be non-empty (validated at app level)
DROP POLICY "Anyone can submit partner applications" ON public.partner_applications;

CREATE POLICY "Anyone can submit partner applications"
  ON public.partner_applications FOR INSERT
  WITH CHECK (email IS NOT NULL AND email != '');
