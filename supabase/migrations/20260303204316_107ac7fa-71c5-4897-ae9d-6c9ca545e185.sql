CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text NOT NULL,
  date_label text,
  category text NOT NULL DEFAULT 'meetups',
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible photos"
  ON public.gallery_photos FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Admins can manage gallery photos"
  ON public.gallery_photos FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));