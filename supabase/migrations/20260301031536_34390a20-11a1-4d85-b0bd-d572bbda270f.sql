
-- Remove overly permissive storage policies that allow any authenticated user to upload/modify/delete
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read event images" ON storage.objects;

-- Ensure public read access remains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Anyone can view event images'
  ) THEN
    CREATE POLICY "Anyone can view event images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'event-images');
  END IF;
END $$;

-- Restore admin-only upload policy
DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;
CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images' AND
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'super_admin'::public.app_role, 'vc_manager'::public.app_role])
);

-- Restore admin-only update policy
DROP POLICY IF EXISTS "Admins can update event images" ON storage.objects;
CREATE POLICY "Admins can update event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'super_admin'::public.app_role, 'vc_manager'::public.app_role])
);

-- Restore admin-only delete policy
DROP POLICY IF EXISTS "Admins can delete event images" ON storage.objects;
CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'super_admin'::public.app_role, 'vc_manager'::public.app_role])
);
