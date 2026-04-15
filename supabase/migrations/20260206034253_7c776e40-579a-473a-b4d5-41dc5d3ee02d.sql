-- Fix overly permissive audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only allow authenticated users to insert (via triggers)
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR current_setting('role') = 'service_role');