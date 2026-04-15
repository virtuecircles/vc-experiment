-- Normalize all existing mixed-case emails to lowercase in profiles
UPDATE public.profiles
SET email = LOWER(email)
WHERE email IS NOT NULL AND email != LOWER(email);

-- Add a check constraint to enforce lowercase emails going forward
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_email_lowercase
CHECK (email IS NULL OR email = LOWER(email));