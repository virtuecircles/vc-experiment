-- FIX 1: Restrict rate_limits policy (currently USING(true)/WITH CHECK(true) is too permissive)
-- Only the service role should manage rate limits, authenticated users should only see/update their own
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;

CREATE POLICY "Users can view own rate limits"
ON public.rate_limits FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own rate limits"
ON public.rate_limits FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rate limits"
ON public.rate_limits FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role still needs full access (for edge functions using service key)
CREATE POLICY "Service role full access to rate limits"
ON public.rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- FIX 2: Circle messages — enforce join date so members only see messages from when they joined
-- Drop the existing permissive select policy
DROP POLICY IF EXISTS "Users can view messages in their circles" ON public.circle_messages;

-- New policy: members can only read messages sent after their join date
-- Guides and admins see all messages
CREATE POLICY "Members see messages from join date onward"
ON public.circle_messages FOR SELECT
TO authenticated
USING (
  -- Admins and super admins see everything
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role])
  OR
  -- Guides assigned to this circle see everything
  EXISTS (
    SELECT 1 FROM public.guide_circle_assignments gca
    WHERE gca.guide_id = auth.uid()
      AND gca.circle_id = circle_messages.circle_id
      AND gca.is_active = true
  )
  OR
  -- Members only see messages from their join date onward
  EXISTS (
    SELECT 1 FROM public.circle_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.circle_id = circle_messages.circle_id
      AND cm.status = 'active'
      AND circle_messages.created_at >= COALESCE(cm.joined_at, '-infinity'::timestamptz)
  )
);