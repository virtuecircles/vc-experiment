
-- Drop the overly permissive public SELECT policy on soulmate_waitlist
DROP POLICY IF EXISTS "Anyone can check waitlist by email" ON public.soulmate_waitlist;

-- Replace with a policy that only allows users to view their own entry (by user_id)
-- The existing "Users can view own waitlist entry" policy already covers authenticated users by user_id.
-- Add a policy so anonymous submitters can check by email match using a session variable approach is not possible client-side,
-- so we simply rely on the existing auth-scoped policy and remove public access.
-- Unauthenticated users who submitted via email can re-submit; duplicates are handled server-side.
