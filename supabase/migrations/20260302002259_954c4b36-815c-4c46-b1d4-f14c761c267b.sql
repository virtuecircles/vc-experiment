
-- Add attempt tracking, flagging, and manual assignment columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS quiz_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS manually_assigned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manually_assigned_at timestamp with time zone;
