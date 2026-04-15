
-- Fix pii_access_log INSERT policy to require accessed_by = auth.uid() instead of true
DROP POLICY IF EXISTS "Admins can insert pii access log" ON public.pii_access_log;

CREATE POLICY "Authenticated users can insert own pii access log"
ON public.pii_access_log
FOR INSERT
TO authenticated
WITH CHECK (accessed_by = auth.uid());
