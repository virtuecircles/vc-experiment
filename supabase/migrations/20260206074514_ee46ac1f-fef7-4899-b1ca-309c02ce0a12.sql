-- Create soulmate_waitlist table for users interested in SoulMatch
CREATE TABLE public.soulmate_waitlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name text,
    last_name text,
    email text NOT NULL,
    phone text,
    city text,
    state text,
    age_range text,
    gender text,
    looking_for text,
    notes text,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.soulmate_waitlist ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all waitlist entries
CREATE POLICY "Super admins can manage soulmate waitlist"
ON public.soulmate_waitlist
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Users can add themselves to waitlist
CREATE POLICY "Users can join soulmate waitlist"
ON public.soulmate_waitlist
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own entry
CREATE POLICY "Users can view own waitlist entry"
ON public.soulmate_waitlist
FOR SELECT
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_soulmate_waitlist_status ON public.soulmate_waitlist(status);
CREATE INDEX idx_soulmate_waitlist_city ON public.soulmate_waitlist(city);
CREATE INDEX idx_soulmate_waitlist_created ON public.soulmate_waitlist(created_at DESC);