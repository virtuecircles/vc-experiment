-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Only admins can access backups
CREATE POLICY "Admins can access backups"
ON storage.objects
FOR ALL
USING (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'::app_role));

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;