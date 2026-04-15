-- Add state field to profiles for physical address state
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS state text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.state IS 'State abbreviation for physical address (e.g., NY, CA)';