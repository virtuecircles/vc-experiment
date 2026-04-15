-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view event images (public bucket)
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- Allow admins to upload event images
CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update event images
CREATE POLICY "Admins can update event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete event images
CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);