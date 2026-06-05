-- Add edit scope to consent table
ALTER TABLE doctor_patient_consent
  ADD COLUMN IF NOT EXISTS edit_clinical_history boolean NOT NULL DEFAULT false;

-- Fix clinical_histories RLS:
-- READ  → patient OR doctor with share_medical_notes=true
-- INSERT → patient only
-- UPDATE → patient OR doctor with edit_clinical_history=true

DROP POLICY IF EXISTS clinical_history_read   ON clinical_histories;
DROP POLICY IF EXISTS clinical_history_insert ON clinical_histories;
DROP POLICY IF EXISTS clinical_history_update ON clinical_histories;

CREATE POLICY "clinical_history_read" ON clinical_histories
  FOR SELECT
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM doctor_patient_consent dpc
      WHERE dpc.doctor_id  = auth.uid()
        AND dpc.patient_id = clinical_histories.patient_id
        AND dpc.status     = 'accepted'
        AND dpc.share_medical_notes = true
    )
  );

CREATE POLICY "clinical_history_insert" ON clinical_histories
  FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "clinical_history_update" ON clinical_histories
  FOR UPDATE
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM doctor_patient_consent dpc
      WHERE dpc.doctor_id  = auth.uid()
        AND dpc.patient_id = clinical_histories.patient_id
        AND dpc.status     = 'accepted'
        AND dpc.edit_clinical_history = true
    )
  );
