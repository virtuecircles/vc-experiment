
-- Allow anyone to submit guide applications (no auth required)
DROP POLICY IF EXISTS "Authenticated users can submit guide applications" ON public.guide_applications;

CREATE POLICY "Anyone can submit guide applications"
  ON public.guide_applications FOR INSERT
  WITH CHECK (email IS NOT NULL AND email != '');
