-- ─────────────────────────────────────────────────────────────────────────────
-- Prescriptions (Recetas Médicas)
-- Medications stored as JSONB array for flexibility.
-- is_template = true rows have no patient info and serve as reusable templates.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE prescriptions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  appointment_id   uuid        REFERENCES appointments(id) ON DELETE SET NULL,

  -- Prescription metadata
  folio            text,
  issued_at        date        NOT NULL DEFAULT CURRENT_DATE,

  -- Patient snapshot (stored directly for PDF; patient may not have an account)
  patient_name     text,
  patient_age      text,
  patient_sex      text,

  -- Clinical content
  diagnosis        text,
  medications      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  indications      text,

  -- Template support
  is_template      boolean     NOT NULL DEFAULT false,
  template_name    text,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX prescriptions_doctor_id_idx  ON prescriptions (doctor_id);
CREATE INDEX prescriptions_patient_id_idx ON prescriptions (patient_id);
CREATE INDEX prescriptions_is_template_idx ON prescriptions (doctor_id, is_template) WHERE is_template = true;

-- Updated-at trigger (reuse existing function if it exists, else create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Doctors own their prescriptions
CREATE POLICY "doctors_manage_own_prescriptions"
  ON prescriptions FOR ALL
  USING  (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Patients can read prescriptions issued to them
CREATE POLICY "patients_read_own_prescriptions"
  ON prescriptions FOR SELECT
  USING (patient_id = auth.uid());
