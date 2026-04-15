
-- Step 1: Backfill null created_by with the oldest super_admin user id
UPDATE public.events
SET created_by = (
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'super_admin'
  ORDER BY ur.created_at ASC
  LIMIT 1
)
WHERE created_by IS NULL;

-- Step 2: Add NOT NULL constraint (all nulls are now filled)
ALTER TABLE public.events
  ALTER COLUMN created_by SET NOT NULL;
