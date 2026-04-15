-- Add image_url column to events table
ALTER TABLE public.events
ADD COLUMN image_url TEXT;