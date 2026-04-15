-- Add ID verification status to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS id_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS id_verified_at timestamp with time zone DEFAULT null;