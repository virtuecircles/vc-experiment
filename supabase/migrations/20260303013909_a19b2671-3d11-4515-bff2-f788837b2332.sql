-- Fix: Recreate the safe_member_profiles view with SECURITY INVOKER
-- so it respects the calling user's RLS policies (not the view owner's)
DROP VIEW IF EXISTS public.safe_member_profiles;

CREATE VIEW public.safe_member_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  first_name,
  last_name,
  city,
  primary_virtue,
  secondary_virtue,
  created_at
FROM public.profiles;

GRANT SELECT ON public.safe_member_profiles TO authenticated;