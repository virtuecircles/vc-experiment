
-- Add founding member columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS founding_100 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_discount_until date;

-- Add subscription tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';
