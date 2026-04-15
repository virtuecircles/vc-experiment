CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  recipient_emails text[],
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  error_message text
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON public.email_logs
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'vc_manager'::app_role]));

CREATE POLICY "Service role can insert email logs"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (true);