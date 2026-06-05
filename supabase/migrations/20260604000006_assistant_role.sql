-- Add 'assistant' value to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'assistant';

-- doctor_assistants table
CREATE TABLE IF NOT EXISTS doctor_assistants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assistant_id    uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  assistant_email text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'suspended')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, assistant_email)
);

ALTER TABLE doctor_assistants ENABLE ROW LEVEL SECURITY;

-- Doctor manages their own assistants
CREATE POLICY "da_doctor_manage" ON doctor_assistants
  FOR ALL
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Assistant can read their own link
CREATE POLICY "da_assistant_read" ON doctor_assistants
  FOR SELECT
  USING (assistant_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_assistants_doctor_id    ON doctor_assistants(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_assistants_assistant_id ON doctor_assistants(assistant_id);
CREATE INDEX IF NOT EXISTS idx_doctor_assistants_email        ON doctor_assistants(assistant_email);

-- Appointments: allow active assistants to read + insert + update for their doctor
CREATE POLICY "appointments_assistant_all" ON appointments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM doctor_assistants da
      WHERE da.doctor_id    = appointments.doctor_id
        AND da.assistant_id = auth.uid()
        AND da.status       = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM doctor_assistants da
      WHERE da.doctor_id    = appointments.doctor_id
        AND da.assistant_id = auth.uid()
        AND da.status       = 'active'
    )
  );
