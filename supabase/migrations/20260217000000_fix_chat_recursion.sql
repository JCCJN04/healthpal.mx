-- ============================================================
-- FIX CRITICAL: conversation_participants INFINITE RECURSION
-- Created: 2026-02-17
--
-- Root cause: The policy "participants_select_own_conv" on
-- conversation_participants references conversation_participants
-- IN ITS OWN POLICY → infinite recursion.
--
-- This also cascades to:
--   - conversations (its SELECT policy queries conversation_participants)
--   - messages (same)
--   - patient_profiles (its doctor-access policy queries conversation_participants)
--   - can_access_patient() function (queries conversation_participants but is
--     SECURITY DEFINER, so that one is fine)
--
-- Fix: Create is_conversation_participant() as SECURITY DEFINER
--      so it bypasses RLS when checking the table, then use it
--      in all policies that need to verify membership.
-- ============================================================

-- 1. Create the helper function (SECURITY DEFINER = bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = auth.uid()
  );
$$;


-- 2. Fix conversation_participants policies
DROP POLICY IF EXISTS "participants_select_own_conv" ON public.conversation_participants;
DROP POLICY IF EXISTS "chat_part_all" ON public.conversation_participants;

CREATE POLICY "participants_select_own_conv"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    public.is_conversation_participant(conversation_id)
  );

-- Keep insert policy (no recursion risk)
DROP POLICY IF EXISTS "participants_insert_authenticated" ON public.conversation_participants;
CREATE POLICY "participants_insert_authenticated"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);


-- 3. Fix conversations policies (they also query conversation_participants)
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON public.conversations;
DROP POLICY IF EXISTS "chat_conv_all" ON public.conversations;

CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id));

CREATE POLICY "conversations_insert_authenticated"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "conversations_update_participant"
  ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(id));


-- 4. Fix messages policies (they also query conversation_participants)
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
DROP POLICY IF EXISTS "chat_msg_all" ON public.messages;

CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id)
  );

CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());


-- 5. Fix patient_profiles policy (it queries conversation_participants directly)
DROP POLICY IF EXISTS "Doctors can view profiles of their patients" ON public.patient_profiles;
DROP POLICY IF EXISTS "patient_profiles_select" ON public.patient_profiles;

-- Patients own their profile; doctors connect via appointments or conversations
CREATE POLICY "patient_profiles_select"
  ON public.patient_profiles FOR SELECT TO authenticated
  USING (
    -- Patient sees their own
    auth.uid() = patient_id
    OR
    -- Doctor with an appointment for this patient
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.doctor_id = auth.uid()
        AND a.patient_id = patient_profiles.patient_id
    )
    OR
    -- Doctor in a conversation with this patient (uses SECURITY DEFINER helper)
    public.can_access_patient(patient_id)
  );

-- Ensure INSERT/UPDATE policies exist for patient_profiles
DROP POLICY IF EXISTS "patient_profiles_insert" ON public.patient_profiles;
DROP POLICY IF EXISTS "patient_profiles_update" ON public.patient_profiles;

CREATE POLICY "patient_profiles_insert"
  ON public.patient_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "patient_profiles_update"
  ON public.patient_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id);
