-- Add address field to profiles for street address
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.address IS 'Street address entered by user';