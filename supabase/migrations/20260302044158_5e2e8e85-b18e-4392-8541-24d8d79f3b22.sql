
-- Create trigger function first (safe, no data processing yet)
CREATE OR REPLACE FUNCTION public.sync_dob_from_quiz_demographics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_dob TEXT;
  parsed_dob DATE;
BEGIN
  raw_dob := NEW.demographics->>'dateOfBirth';
  IF raw_dob IS NULL OR raw_dob = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    IF raw_dob ~ '^\d{4}-\d{2}-\d{2}$' THEN
      parsed_dob := raw_dob::date;
    ELSIF raw_dob ~ '^\d{2}/\d{2}/\d{4}$' THEN
      parsed_dob := to_date(raw_dob, 'MM/DD/YYYY');
    ELSIF raw_dob ~ '^\d{8}$' THEN
      parsed_dob := to_date(raw_dob, 'MMDDYYYY');
    ELSE
      RETURN NEW;
    END IF;

    UPDATE public.profiles
    SET date_of_birth = parsed_dob
    WHERE id = NEW.id
      AND date_of_birth IS NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Silently skip on parse errors (invalid dates like test data)
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_dob_on_quiz_update ON public.quiz_progress;
CREATE TRIGGER sync_dob_on_quiz_update
  AFTER INSERT OR UPDATE OF demographics ON public.quiz_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_dob_from_quiz_demographics();
