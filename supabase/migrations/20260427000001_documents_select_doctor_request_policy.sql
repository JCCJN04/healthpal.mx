-- Allow a doctor to see documents they explicitly requested (fulfilled document_requests).
-- This lets documents uploaded via WhatsApp appear in the patient's expediente
-- without requiring a broad doctor_patient_consent record.
CREATE POLICY "documents_select_doctor_request"
ON documents FOR SELECT
USING (
  is_doctor() AND EXISTS (
    SELECT 1 FROM document_requests dr
    WHERE dr.document_id = documents.id
      AND dr.doctor_id = auth.uid()
      AND dr.status = 'fulfilled'
  )
);
