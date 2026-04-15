-- Create cities table for managing active Virtue Circles locations
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  launched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, state)
);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Anyone can view cities (needed for city selection dropdown)
CREATE POLICY "Anyone can view cities"
  ON public.cities
  FOR SELECT
  USING (true);

-- Only super admins can manage cities
CREATE POLICY "Super admins can manage cities"
  ON public.cities
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add city_id to profiles table
ALTER TABLE public.profiles ADD COLUMN city_id UUID REFERENCES public.cities(id);

-- Insert some initial US cities (inactive by default)
INSERT INTO public.cities (name, state, is_active) VALUES
  ('New York', 'NY', false),
  ('Los Angeles', 'CA', false),
  ('Chicago', 'IL', false),
  ('Houston', 'TX', false),
  ('Phoenix', 'AZ', false),
  ('Philadelphia', 'PA', false),
  ('San Antonio', 'TX', false),
  ('San Diego', 'CA', false),
  ('Dallas', 'TX', false),
  ('Austin', 'TX', false),
  ('San Jose', 'CA', false),
  ('San Francisco', 'CA', false),
  ('Seattle', 'WA', false),
  ('Denver', 'CO', false),
  ('Boston', 'MA', false),
  ('Atlanta', 'GA', false),
  ('Miami', 'FL', false),
  ('Minneapolis', 'MN', false),
  ('Portland', 'OR', false),
  ('Detroit', 'MI', false);