-- Make backups bucket public for download capability
-- RLS still restricts access to admins only
UPDATE storage.buckets 
SET public = true 
WHERE id = 'backups';