-- Create testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  virtue TEXT,
  image_url TEXT,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can view visible testimonials
CREATE POLICY "Anyone can view visible testimonials"
ON public.testimonials
FOR SELECT
USING (is_visible = true);

-- Admins can manage all testimonials
CREATE POLICY "Admins can manage testimonials"
ON public.testimonials
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role]));

-- Create storage bucket for testimonial images
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonial-images', 'testimonial-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view testimonial images"
ON storage.objects FOR SELECT
USING (bucket_id = 'testimonial-images');

CREATE POLICY "Admins can upload testimonial images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'testimonial-images' 
  AND public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role])
);

CREATE POLICY "Admins can update testimonial images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'testimonial-images'
  AND public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role])
);

CREATE POLICY "Admins can delete testimonial images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'testimonial-images'
  AND public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'vc_manager'::app_role])
);

-- Add trigger for updated_at
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some seed testimonials
INSERT INTO public.testimonials (name, location, rating, review, virtue, display_order) VALUES
('Sarah M.', 'Austin, TX', 5, 'Virtue Circles helped me find genuine friends who share my values. The discussions are always meaningful and I leave feeling inspired.', 'Humanity', 1),
('Michael R.', 'Nashville, TN', 5, 'As someone new to the city, this community gave me a sense of belonging I was missing. The events are well-organized and the people are authentic.', 'Justice', 2),
('Emily K.', 'Denver, CO', 5, 'I was skeptical at first, but the virtue-based matching really works. I''ve made connections that go beyond surface-level friendships.', 'Wisdom', 3);