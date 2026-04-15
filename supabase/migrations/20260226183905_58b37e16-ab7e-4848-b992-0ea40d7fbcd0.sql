
-- Allow authenticated users (admins) to upload to event-images bucket
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

-- Allow authenticated users to update/replace event images
CREATE POLICY "Authenticated users can update event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images');

-- Allow authenticated users to delete event images
CREATE POLICY "Authenticated users can delete event images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images');

-- Allow public read access (bucket is already public but ensure SELECT policy exists)
CREATE POLICY "Public can read event images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');
