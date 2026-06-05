-- ── patient_insurances ──────────────────────────────────────────────────────
-- Stores detailed insurance info per patient. Multiple rows allowed
-- (one per policy). Doctor can read if patient granted share_insurance.

-- Add column first — referenced by doctor_read_insurance policy below
ALTER TABLE doctor_patient_consent
  ADD COLUMN IF NOT EXISTS share_insurance boolean NOT NULL DEFAULT false;

CREATE TABLE patient_insurances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_name         text NOT NULL,          -- from select list
  provider_other        text,                   -- custom name when provider_name='Otro'
  policy_number         text,
  group_number          text,
  member_id             text,
  holder_name           text,                   -- titular del seguro
  holder_relationship   text DEFAULT 'self',    -- self|spouse|parent|child|other
  phone_claims          text,                   -- teléfono reclamaciones
  phone_emergency       text,                   -- teléfono urgencias
  valid_from            date,
  valid_until           date,
  coverage_type         text DEFAULT 'individual', -- individual|family|employer
  is_primary            boolean NOT NULL DEFAULT true,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_insurances_patient ON patient_insurances(patient_id);

ALTER TABLE patient_insurances ENABLE ROW LEVEL SECURITY;

-- Patient: full CRUD on own rows
CREATE POLICY "patient_own_insurance_all" ON patient_insurances
  FOR ALL
  USING  (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Doctor: read-only if active consent with share_insurance = true
CREATE POLICY "doctor_read_insurance" ON patient_insurances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_consent
      WHERE doctor_id   = auth.uid()
        AND patient_id  = patient_insurances.patient_id
        AND status      = 'accepted'
        AND share_insurance = true
    )
  );

-- updated_at trigger
CREATE TRIGGER trg_patient_insurances_updated_at
  BEFORE UPDATE ON patient_insurances
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

