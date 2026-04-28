-- When a patient adds their phone number to an existing HealthPal profile,
-- automatically transfer any pre-registered WhatsApp documents to their real account
-- and clean up the orphan pre-registered profile.

CREATE OR REPLACE FUNCTION link_whatsapp_preregistered()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when phone is being set for the first time on a patient profile
  IF NEW.phone IS NOT NULL AND OLD.phone IS NULL AND NEW.role = 'patient' THEN
    -- Transfer documents from any pre-registered profile with the same phone
    UPDATE documents
    SET patient_id = NEW.id,
        owner_id   = NEW.id
    WHERE patient_id IN (
      SELECT id FROM profiles
      WHERE phone              = NEW.phone
        AND onboarding_step    = 'whatsapp_preregistro'
        AND id                != NEW.id
    );

    -- Remove the pre-registered duplicate profile (cascade handles patient_profiles FK)
    DELETE FROM profiles
    WHERE phone           = NEW.phone
      AND onboarding_step = 'whatsapp_preregistro'
      AND id             != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_phone_added ON profiles;

CREATE TRIGGER on_phone_added
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_whatsapp_preregistered();
