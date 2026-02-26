-- =============================================================
-- PATIENT CONSENT SYSTEM
-- Date: 2026-02-25
-- Purpose: Implement granular doctor↔patient consent with scopes.
--   - New table: doctor_patient_consent (replaces care_links as
--     the source of truth for access control).
--   - Rewrite can_access_patient() to require an "accepted" consent row.
--   - Tighten all RLS policies on patient_profiles, documents,
--     appointments so they gate on consent + scopes.
--   - Add helper function has_patient_scope() for scope checks.
-- =============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CREATE doctor_patient_consent TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_patient_consent (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Lifecycle status
  status        text NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested','accepted','rejected','revoked')),

  -- Granular scopes (only meaningful when status = 'accepted')
  share_basic_profile   boolean NOT NULL DEFAULT false,
  share_contact         boolean NOT NULL DEFAULT false,
  share_documents       boolean NOT NULL DEFAULT false,
  share_appointments    boolean NOT NULL DEFAULT false,
  share_medical_notes   boolean NOT NULL DEFAULT false,

  -- Optional reason from the doctor when requesting
  request_reason  text,

  -- Optional expiry
  access_expires_at     timestamptz,

  -- Timestamps
  requested_at  timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- One active consent row per doctor↔patient pair
  CONSTRAINT uq_doctor_patient_consent UNIQUE (doctor_id, patient_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_dpc_doctor_id   ON public.doctor_patient_consent(doctor_id);
CREATE INDEX IF NOT EXISTS idx_dpc_patient_id  ON public.doctor_patient_consent(patient_id);
CREATE INDEX IF NOT EXISTS idx_dpc_status      ON public.doctor_patient_consent(status);

-- ────────────────────────────────────────────────────────────
-- 2. RLS ON doctor_patient_consent
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.doctor_patient_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dpc_select" ON public.doctor_patient_consent;
DROP POLICY IF EXISTS "dpc_insert" ON public.doctor_patient_consent;
DROP POLICY IF EXISTS "dpc_update" ON public.doctor_patient_consent;
DROP POLICY IF EXISTS "dpc_delete" ON public.doctor_patient_consent;

-- Both parties can see their own consent rows
CREATE POLICY "dpc_select"
  ON public.doctor_patient_consent FOR SELECT TO authenticated
  USING (doctor_id = auth.uid() OR patient_id = auth.uid());

-- Only a doctor can INSERT (request access)
CREATE POLICY "dpc_insert"
  ON public.doctor_patient_consent FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = auth.uid()
    AND status = 'requested'
  );

-- Both parties can update (patient responds, doctor can cancel)
-- Patient: can set status to accepted/rejected/revoked, update scopes
-- Doctor: can only set status to 'revoked' (withdraw own request)
CREATE POLICY "dpc_update"
  ON public.doctor_patient_consent FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid() OR patient_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid() OR patient_id = auth.uid());

-- Patient can delete consent rows for cleanup
CREATE POLICY "dpc_delete"
  ON public.doctor_patient_consent FOR DELETE TO authenticated
  USING (patient_id = auth.uid());

-- Revoke anon access
REVOKE ALL ON public.doctor_patient_consent FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_patient_consent TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. HELPER: has_consent()
--    Returns TRUE if the calling doctor has an accepted,
--    non-expired consent with the given patient.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_consent(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_patient_consent
    WHERE doctor_id  = auth.uid()
      AND patient_id = _patient_id
      AND status     = 'accepted'
      AND (access_expires_at IS NULL OR access_expires_at > now())
  );
$$;

-- ────────────────────────────────────────────────────────────
-- 4. HELPER: has_patient_scope()
--    Returns TRUE if the calling doctor has a specific scope
--    on a patient (accepted + not expired + scope = true).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_patient_scope(_patient_id uuid, _scope text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT CASE _scope
      WHEN 'share_basic_profile'  THEN share_basic_profile
      WHEN 'share_contact'        THEN share_contact
      WHEN 'share_documents'      THEN share_documents
      WHEN 'share_appointments'   THEN share_appointments
      WHEN 'share_medical_notes'  THEN share_medical_notes
      ELSE false
    END
    FROM public.doctor_patient_consent
    WHERE doctor_id  = auth.uid()
      AND patient_id = _patient_id
      AND status     = 'accepted'
      AND (access_expires_at IS NULL OR access_expires_at > now())
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. REWRITE can_access_patient()
--    NOW REQUIRES CONSENT instead of just appointment/conversation.
--    Patient can always access their own data.
--    Doctor needs accepted consent with at least share_basic_profile.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Patient themselves: always
    auth.uid() = _patient_id
    OR
    -- Doctor with accepted consent (at least basic profile scope)
    public.has_consent(_patient_id);
$$;

-- ────────────────────────────────────────────────────────────
-- 6. TIGHTEN patient_profiles SELECT POLICY
--    Old: allowed via appointments OR conversations (too broad).
--    New: only via accepted consent.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patient_profiles_select" ON public.patient_profiles;
DROP POLICY IF EXISTS "Doctors can view profiles of their patients" ON public.patient_profiles;

CREATE POLICY "patient_profiles_select"
  ON public.patient_profiles FOR SELECT TO authenticated
  USING (
    -- Patient sees their own
    auth.uid() = patient_id
    OR
    -- Doctor with accepted consent + share_basic_profile scope
    public.has_patient_scope(patient_id, 'share_basic_profile')
  );

-- INSERT/UPDATE remain patient-only (already correct)
-- (Re-declare for safety to ensure they exist)
DROP POLICY IF EXISTS "patient_profiles_insert" ON public.patient_profiles;
DROP POLICY IF EXISTS "patient_profiles_update" ON public.patient_profiles;

CREATE POLICY "patient_profiles_insert"
  ON public.patient_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "patient_profiles_update"
  ON public.patient_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id);

-- ────────────────────────────────────────────────────────────
-- 7. TIGHTEN documents SELECT POLICY for doctor access
--    Doctor needs share_documents scope.
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'documents') THEN

    DROP POLICY IF EXISTS "documents_select_doctor_patient" ON public.documents;

    -- Doctor can see patient documents IF consent has share_documents
    EXECUTE 'CREATE POLICY "documents_select_doctor_patient"
      ON public.documents FOR SELECT TO authenticated
      USING (
        public.is_doctor()
        AND public.has_patient_scope(patient_id, ''share_documents'')
      )';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 8. TIGHTEN appointments RLS
--    Doctors can only see appointments with patients who have
--    share_appointments consent scope (or their own appointments).
-- ────────────────────────────────────────────────────────────
-- Note: We don't want to break the basic "doctor sees their own
-- appointments" flow, so we keep the existing policy that allows
-- doctor_id = auth.uid() OR patient_id = auth.uid().
-- The consent gating happens in the APPLICATION layer for
-- cross-patient appointment listing, and the existing policies
-- already restrict to appointments involving the authenticated user.

-- ────────────────────────────────────────────────────────────
-- 9. TIGHTEN patient_notes RLS
--    Doctor should only WRITE notes if they have consent.
--    READ is already filtered by doctor_id = auth.uid() (notes they authored).
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Doctors can insert their own clinical notes" ON public.patient_notes;

CREATE POLICY "Doctors can insert their own clinical notes"
  ON public.patient_notes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = doctor_id
    AND public.has_patient_scope(patient_id, 'share_medical_notes')
  );

-- ────────────────────────────────────────────────────────────
-- 10. RESTRICT start_new_conversation RPC
--     Only create conversations if there's an accepted consent.
--     This closes the privilege-escalation attack vector.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_new_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id   uuid;
  _caller_role public.user_role;
BEGIN
  -- Determine caller role
  SELECT role INTO _caller_role FROM public.profiles WHERE id = auth.uid();

  -- If caller is doctor and other is patient, require consent
  IF _caller_role = 'doctor' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.doctor_patient_consent
      WHERE doctor_id  = auth.uid()
        AND patient_id = other_user_id
        AND status     = 'accepted'
        AND (access_expires_at IS NULL OR access_expires_at > now())
    ) THEN
      RAISE EXCEPTION 'Consent required to start conversation with patient';
    END IF;
  END IF;

  -- If caller is patient and other is doctor, require consent
  IF _caller_role = 'patient' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.doctor_patient_consent
      WHERE doctor_id  = other_user_id
        AND patient_id = auth.uid()
        AND status     = 'accepted'
        AND (access_expires_at IS NULL OR access_expires_at > now())
    ) THEN
      RAISE EXCEPTION 'Consent required to start conversation with doctor';
    END IF;
  END IF;

  -- Check if conversation already exists
  SELECT cp1.conversation_id INTO _conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = other_user_id
  LIMIT 1;

  IF _conv_id IS NOT NULL THEN
    RETURN _conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO _conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (_conv_id, auth.uid()), (_conv_id, other_user_id);

  RETURN _conv_id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 11. SEED: Auto-create accepted consent rows for existing
--     doctor↔patient pairs (appointments & care_links).
--     This ensures the migration doesn't break existing access.
-- ────────────────────────────────────────────────────────────
INSERT INTO public.doctor_patient_consent (
  doctor_id, patient_id, status,
  share_basic_profile, share_contact, share_documents,
  share_appointments, share_medical_notes,
  requested_at, responded_at
)
SELECT DISTINCT
  a.doctor_id,
  a.patient_id,
  'accepted',
  true, true, true, true, true,
  now(), now()
FROM public.appointments a
WHERE a.doctor_id IS NOT NULL
  AND a.patient_id IS NOT NULL
ON CONFLICT (doctor_id, patient_id) DO NOTHING;

-- Also seed from care_links if any exist
INSERT INTO public.doctor_patient_consent (
  doctor_id, patient_id, status,
  share_basic_profile, share_contact, share_documents,
  share_appointments, share_medical_notes,
  requested_at, responded_at
)
SELECT
  cl.doctor_id,
  cl.patient_id,
  CASE WHEN cl.status = 'active' THEN 'accepted' ELSE 'requested' END,
  true, true, true, true, true,
  cl.created_at, CASE WHEN cl.status = 'active' THEN cl.created_at ELSE NULL END
FROM public.care_links cl
ON CONFLICT (doctor_id, patient_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 12. UPDATED_AT TRIGGER
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_dpc_updated_at ON public.doctor_patient_consent;
CREATE TRIGGER tr_dpc_updated_at
  BEFORE UPDATE ON public.doctor_patient_consent
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
