
-- Fix trigger to also handle YYYYMMDD 8-digit format (e.g. 19810701)
CREATE OR REPLACE FUNCTION public.sync_dob_from_quiz_demographics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_dob TEXT;
  parsed_dob DATE;
  yr INT;
BEGIN
  raw_dob := NEW.demographics->>'dateOfBirth';
  IF raw_dob IS NULL OR raw_dob = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    IF raw_dob ~ '^\d{4}-\d{2}-\d{2}$' THEN
      -- Already ISO: YYYY-MM-DD
      parsed_dob := raw_dob::date;
    ELSIF raw_dob ~ '^\d{2}/\d{2}/\d{4}$' THEN
      -- MM/DD/YYYY
      parsed_dob := to_date(raw_dob, 'MM/DD/YYYY');
    ELSIF raw_dob ~ '^\d{8}$' THEN
      -- 8 digits: detect YYYYMMDD vs MMDDYYYY by checking if first 4 digits look like a year
      yr := substring(raw_dob FROM 1 FOR 4)::int;
      IF yr >= 1900 AND yr <= 2100 THEN
        parsed_dob := to_date(raw_dob, 'YYYYMMDD');
      ELSE
        parsed_dob := to_date(raw_dob, 'MMDDYYYY');
      END IF;
    ELSE
      RETURN NEW;
    END IF;

    UPDATE public.profiles
    SET date_of_birth = parsed_dob
    WHERE id = NEW.id
      AND date_of_birth IS NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Silently skip on parse errors
  END;

  RETURN NEW;
END;
$$;
