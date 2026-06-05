-- Historial de medidas biométricas del paciente
CREATE TABLE IF NOT EXISTS patient_biometric_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  height_cm   numeric(5,1),
  weight_kg   numeric(5,1),
  blood_type  text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biometric_history_patient
  ON patient_biometric_history (patient_id, recorded_at DESC);

ALTER TABLE patient_biometric_history ENABLE ROW LEVEL SECURITY;

-- Patient: full access to own records
CREATE POLICY patient_own_biometrics_all ON patient_biometric_history
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Doctor: read-only if active consent with share_medical_notes=true
CREATE POLICY doctor_read_biometrics ON patient_biometric_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_consent dpc
      WHERE dpc.doctor_id     = auth.uid()
        AND dpc.patient_id    = patient_biometric_history.patient_id
        AND dpc.status        = 'accepted'
        AND dpc.share_medical_notes = true
    )
  );
