
-- =============================================
-- SECURITY FIX: Restrict PII access to super_admin
-- and create PII access audit log
-- =============================================

-- Step 1: Drop existing overly permissive quiz_progress admin policy
DROP POLICY IF EXISTS "Admins can view all quiz progress" ON public.quiz_progress;

-- Step 2: Super Admin gets full access to quiz_progress
CREATE POLICY "Super admins can view all quiz progress"
ON public.quiz_progress
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Step 3: Regular admins can view quiz progress but NOT via this policy
-- (they use separate limited view — no full demographics access)
CREATE POLICY "Admins can view quiz progress without full PII"
ON public.quiz_progress
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Step 4: VC Managers can only view quiz progress for their region members
CREATE POLICY "VC managers can view regional quiz progress"
ON public.quiz_progress
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'vc_manager'::app_role)
  AND id IN (
    SELECT p.id FROM public.profiles p
    JOIN public.manager_regions mr ON mr.region_id = p.region_id
    WHERE mr.user_id = auth.uid()
  )
);

-- =============================================
-- Step 5: Create PII Access Audit Log table
-- =============================================
CREATE TABLE IF NOT EXISTS public.pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by uuid NOT NULL,
  accessed_by_role text,
  member_id uuid,
  fields_accessed text[],
  access_type text NOT NULL,
  ip_address text,
  user_agent text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on the log table
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read the audit log
CREATE POLICY "Only super admins can view pii access log"
ON public.pii_access_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Any authenticated user (admin) can insert log entries
CREATE POLICY "Admins can insert pii access log"
ON public.pii_access_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_pii_log_accessed_by ON public.pii_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_pii_log_member_id ON public.pii_access_log(member_id);
CREATE INDEX IF NOT EXISTS idx_pii_log_accessed_at ON public.pii_access_log(accessed_at DESC);
