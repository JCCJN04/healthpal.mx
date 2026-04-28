-- Add patient_phone column to document_requests
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS patient_phone text;

-- WhatsApp sessions table: tracks requests sent via WhatsApp waiting for file reply
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_phone       text        NOT NULL,
  doctor_id           uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  document_request_id uuid        REFERENCES document_requests(id) ON DELETE CASCADE,
  status              text        DEFAULT 'waiting'
                                  CHECK (status IN ('waiting', 'fulfilled', 'expired')),
  expires_at          timestamptz DEFAULT now() + interval '48 hours',
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone
  ON whatsapp_sessions(patient_phone, status);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Only the service role (Edge Functions) can read/write whatsapp_sessions
-- No authenticated user policies needed for direct client access
