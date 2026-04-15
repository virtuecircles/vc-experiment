
-- Allow user deletion by handling pii_access_log (no FK constraint exists, but no delete policy)
-- Add ON DELETE SET NULL behavior via a trigger, since accessed_by has no FK constraint

-- First check: pii_access_log.accessed_by is just a uuid (no FK), so deletion should work
-- The actual blocker is quiz_progress.id which IS the user id with no delete policy for admins

-- Allow super admins to delete quiz_progress records
CREATE POLICY "Super admins can delete quiz progress"
ON public.quiz_progress
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete pii_access_log records  
CREATE POLICY "Super admins can delete pii access log"
ON public.pii_access_log
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete user_waivers
CREATE POLICY "Super admins can delete user waivers"
ON public.user_waivers
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));
