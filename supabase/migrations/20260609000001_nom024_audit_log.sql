-- ─────────────────────────────────────────────────────────────────────────────
-- NOM-024-SSA3-2012 §6.6 — Trazabilidad y registro de auditoría
-- §3.42: Registro cronológico de actividades que permite reconstruir
--        fielmente la información a estados anteriores.
-- §3.54: Trazabilidad — acciones asociadas de modo inequívoco a un individuo.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  action        text        NOT NULL,         -- 'read_document', 'upload_document', 'delete_document',
                                              -- 'update_clinical_history', 'consent_approved',
                                              -- 'consent_revoked', 'login', 'export_data', etc.
  resource_type text        NOT NULL,         -- 'document', 'clinical_history', 'appointment', 'consent'
  resource_id   uuid,                         -- PK of affected row
  patient_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,  -- whose data was touched
  details       jsonb,                        -- before/after states, extra context
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for compliance queries (who accessed what, when)
CREATE INDEX IF NOT EXISTS audit_log_actor_idx      ON audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_patient_idx    ON audit_log (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx   ON audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx     ON audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);

COMMENT ON TABLE audit_log IS 'NOM-024 §6.6 / §3.42: Registro de auditoría. Inmutable — no UPDATE/DELETE permitidos.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Nobody can delete or update audit records (immutability)
-- Only the log_audit_event RPC (SECURITY DEFINER) can INSERT.
-- Users can read their own events; doctors can read events on their patients.

CREATE POLICY "audit_log_select_own" ON audit_log
  FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'doctor')
    )
  );

-- No direct INSERT from client — only via RPC below
CREATE POLICY "audit_log_no_direct_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- ── RPC: log_audit_event ──────────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS so only this function can write to audit_log.
-- Call from client for read events; triggers call it for write events.
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action        text,
  p_resource_type text,
  p_resource_id   uuid    DEFAULT NULL,
  p_patient_id    uuid    DEFAULT NULL,
  p_details       jsonb   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (actor_id, action, resource_type, resource_id, patient_id, details)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_patient_id, p_details);
END;
$$;

-- ── Trigger function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action        text;
  v_resource_type text;
  v_resource_id   uuid;
  v_patient_id    uuid;
  v_details       jsonb;
BEGIN
  v_resource_type := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    v_action      := 'create_' || TG_TABLE_NAME;
    v_resource_id := NEW.id;
    v_details     := jsonb_build_object('op', 'INSERT');

    -- Extract patient_id where applicable
    IF TG_TABLE_NAME = 'documents' THEN
      v_patient_id := COALESCE(NEW.patient_id, NEW.owner_id);
    ELSIF TG_TABLE_NAME = 'clinical_histories' THEN
      v_patient_id := NEW.patient_id;
    ELSIF TG_TABLE_NAME = 'appointments' THEN
      v_patient_id := NEW.patient_id;
    ELSIF TG_TABLE_NAME = 'doctor_patient_consent' THEN
      v_patient_id := NEW.patient_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    v_action      := 'update_' || TG_TABLE_NAME;
    v_resource_id := NEW.id;
    v_details     := jsonb_build_object('op', 'UPDATE');

    IF TG_TABLE_NAME = 'documents' THEN
      v_patient_id := COALESCE(NEW.patient_id, NEW.owner_id);
    ELSIF TG_TABLE_NAME = 'clinical_histories' THEN
      v_patient_id := NEW.patient_id;
    ELSIF TG_TABLE_NAME = 'appointments' THEN
      v_patient_id := NEW.patient_id;
    ELSIF TG_TABLE_NAME = 'doctor_patient_consent' THEN
      v_patient_id    := NEW.patient_id;
      -- Record consent status transitions
      v_details := jsonb_build_object(
        'op',         'UPDATE',
        'old_status', OLD.status,
        'new_status', NEW.status
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    v_action      := 'delete_' || TG_TABLE_NAME;
    v_resource_id := OLD.id;
    v_details     := jsonb_build_object('op', 'DELETE');

    IF TG_TABLE_NAME = 'documents' THEN
      v_patient_id := COALESCE(OLD.patient_id, OLD.owner_id);
      v_details    := jsonb_build_object(
        'op',       'DELETE',
        'title',    OLD.title,
        'category', OLD.category
      );
    ELSIF TG_TABLE_NAME = 'doctor_patient_consent' THEN
      v_patient_id := OLD.patient_id;
    END IF;
  END IF;

  INSERT INTO audit_log (actor_id, action, resource_type, resource_id, patient_id, details)
  VALUES (auth.uid(), v_action, v_resource_type, v_resource_id, v_patient_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Attach triggers ───────────────────────────────────────────────────────────

-- documents: log all writes (NOM-024 §6.6.2 — registros inalterables)
CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- clinical_histories: log all writes
CREATE TRIGGER audit_clinical_histories
  AFTER INSERT OR UPDATE ON clinical_histories
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- appointments: log all writes
CREATE TRIGGER audit_appointments
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- doctor_patient_consent: log all writes (NOM-024 §6.6.6 — consentimientos)
CREATE TRIGGER audit_doctor_patient_consent
  AFTER INSERT OR UPDATE OR DELETE ON doctor_patient_consent
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
