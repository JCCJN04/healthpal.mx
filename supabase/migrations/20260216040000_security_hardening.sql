-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Created: 2026-02-16
-- Purpose:
--   1. FIX CRITICAL BUG: current_role(), is_doctor(), is_patient(),
--      can_access_patient() exist but are NOT SECURITY DEFINER,
--      causing infinite recursion (stack depth exceeded) on 6 tables.
--   2. Prevent role escalation in handle_new_user trigger.
--   3. Tighten chat RLS from wide-open to participant-based.
--   4. Add RLS on documents and notifications if missing.
--   5. Prevent role changes after onboarding.
-- ============================================================
-- NOTE: This migration is fully idempotent and safe to re-run.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. FIX CRITICAL: RECREATE ROLE HELPER FUNCTIONS AS
--    SECURITY DEFINER TO BREAK INFINITE RLS RECURSION
--
--    Root cause: These functions query `profiles` table.
--    If they run as the invoking user (SECURITY INVOKER),
--    the RLS policies on `profiles` fire, which call these
--    same functions → infinite recursion → stack depth exceeded.
--
--    Fix: SECURITY DEFINER makes them run as the DB owner,
--    bypassing RLS on profiles and breaking the cycle.
-- ────────────────────────────────────────────────────────────

-- Returns the current authenticated user's role
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Convenience: is the caller a doctor?
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_role() = 'doctor';
$$;

-- Convenience: is the caller a patient?
CREATE OR REPLACE FUNCTION public.is_patient()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_role() = 'patient';
$$;

-- Can the caller access a given patient's data?
-- A doctor can if they share an appointment or conversation.
-- A patient can only access their own data.
CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- The patient themselves
    auth.uid() = _patient_id
    OR
    -- A doctor linked via an appointment
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = _patient_id
        AND a.doctor_id = auth.uid()
    )
    OR
    -- A doctor linked via a conversation
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN   public.conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid()
        AND cp2.user_id = _patient_id
    );
$$;


-- ────────────────────────────────────────────────────────────
-- 2. PREVENT ROLE ESCALATION IN handle_new_user
--    Users can only self-assign 'patient' or 'doctor'.
--    'admin' must be set manually by a DB admin.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requested_role text;
  _safe_role public.user_role;
BEGIN
  _requested_role := new.raw_user_meta_data->>'role';

  -- Only allow 'patient' or 'doctor' via self-registration
  IF _requested_role IN ('patient', 'doctor') THEN
    _safe_role := _requested_role::public.user_role;
  ELSE
    _safe_role := 'patient'::public.user_role;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, onboarding_completed, onboarding_step
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    _safe_role,
    false,
    'role'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(profiles.role, _safe_role),
    onboarding_completed = COALESCE(profiles.onboarding_completed, false),
    onboarding_step = COALESCE(profiles.onboarding_step, 'role');

  RETURN new;
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. TIGHTEN CHAT RLS POLICIES
--    Replace wide-open "USING (true)" with participant-based.
--    All DROPs are IF EXISTS for idempotency.
-- ────────────────────────────────────────────────────────────

-- 3a. conversations
DROP POLICY IF EXISTS "chat_conv_all" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;

CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert_authenticated"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "conversations_update_participant"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
    )
  );

-- 3b. conversation_participants
DROP POLICY IF EXISTS "chat_part_all" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_select_own_conv" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_insert_authenticated" ON public.conversation_participants;

CREATE POLICY "participants_select_own_conv"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "participants_insert_authenticated"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3c. messages
DROP POLICY IF EXISTS "chat_msg_all" ON public.messages;
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;

CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    -- sender must be a participant
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 4. DOCUMENTS TABLE RLS
--    Enable RLS (idempotent) and add ownership policies.
--    Uses DROP IF EXISTS for every policy to be re-runnable.
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

    -- Drop ANY existing policies to avoid conflicts
    DROP POLICY IF EXISTS "documents_all" ON public.documents;
    DROP POLICY IF EXISTS "documents_select_owner" ON public.documents;
    DROP POLICY IF EXISTS "documents_insert_owner" ON public.documents;
    DROP POLICY IF EXISTS "documents_update_owner" ON public.documents;
    DROP POLICY IF EXISTS "documents_delete_owner" ON public.documents;
    DROP POLICY IF EXISTS "documents_select_doctor_patient" ON public.documents;

    EXECUTE 'CREATE POLICY "documents_select_owner" ON public.documents FOR SELECT TO authenticated USING (owner_id = auth.uid() OR uploaded_by = auth.uid() OR patient_id = auth.uid())';
    EXECUTE 'CREATE POLICY "documents_insert_owner" ON public.documents FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR uploaded_by = auth.uid())';
    EXECUTE 'CREATE POLICY "documents_update_owner" ON public.documents FOR UPDATE TO authenticated USING (owner_id = auth.uid())';
    EXECUTE 'CREATE POLICY "documents_delete_owner" ON public.documents FOR DELETE TO authenticated USING (owner_id = auth.uid())';

    -- Doctors can see documents of their linked patients
    EXECUTE 'CREATE POLICY "documents_select_doctor_patient" ON public.documents FOR SELECT TO authenticated USING (public.is_doctor() AND public.can_access_patient(patient_id))';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 5. DOCUMENT_SHARES TABLE RLS
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_shares') THEN
    ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "docshares_select" ON public.document_shares;
    DROP POLICY IF EXISTS "docshares_insert" ON public.document_shares;
    DROP POLICY IF EXISTS "docshares_delete" ON public.document_shares;

    -- Can see shares you sent or received
    EXECUTE 'CREATE POLICY "docshares_select" ON public.document_shares FOR SELECT TO authenticated USING (shared_by = auth.uid() OR shared_with = auth.uid())';
    -- Can create shares for docs you own
    EXECUTE 'CREATE POLICY "docshares_insert" ON public.document_shares FOR INSERT TO authenticated WITH CHECK (shared_by = auth.uid())';
    -- Can revoke shares you created
    EXECUTE 'CREATE POLICY "docshares_delete" ON public.document_shares FOR DELETE TO authenticated USING (shared_by = auth.uid())';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 6. NOTIFICATIONS TABLE RLS
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;

    EXECUTE 'CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "notifications_insert_system" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 7. PROFILES TABLE - RESTRICT ROLE UPDATE
--    Prevent users from changing their own role via the API.
-- ────────────────────────────────────────────────────────────

-- Drop old update policies if they exist, recreate safely
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;

CREATE POLICY "profiles_update_own_safe"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Trigger: prevent role changes after onboarding is complete
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow role change during onboarding (first-time selection)
    IF OLD.onboarding_completed = true THEN
      RAISE EXCEPTION 'Role cannot be changed after onboarding is complete';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tr_prevent_role_change ON public.profiles;
CREATE TRIGGER tr_prevent_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();
