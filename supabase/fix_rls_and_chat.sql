-- ============================================================
--  FIX: Permisos de lectura de perfiles y funciones de chat
--  Ejecutar en: Supabase Dashboard → SQL Editor
--  HealthPal.mx
-- ============================================================

-- ==========================================
-- PARTE 1: RLS para profiles
-- Permitir que doctores lean perfiles de sus pacientes y viceversa
-- ==========================================

-- Permitir a cualquier usuario autenticado leer perfiles básicos
-- de usuarios con los que comparten una cita (appointments)
DO $$
BEGIN
  -- Drop existing policy if it exists to avoid conflicts
  DROP POLICY IF EXISTS "Users can read counterpart profiles via appointments" ON public.profiles;
END $$;

CREATE POLICY "Users can read counterpart profiles via appointments"
  ON public.profiles
  FOR SELECT
  USING (
    -- Users can always read their own profile
    auth.uid() = id
    OR
    -- Doctors can read profiles of patients they have appointments with
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE (appointments.doctor_id = auth.uid() AND appointments.patient_id = profiles.id)
         OR (appointments.patient_id = auth.uid() AND appointments.doctor_id = profiles.id)
    )
  );

-- Also allow reading profiles of users in shared conversations
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read profiles of conversation partners" ON public.profiles;
END $$;

CREATE POLICY "Users can read profiles of conversation partners"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid() AND cp2.user_id = profiles.id
    )
  );


-- ==========================================
-- PARTE 2: RLS para conversations y conversation_participants
-- ==========================================

-- conversations: users can read conversations they participate in
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
  DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
END $$;

CREATE POLICY "Users can read own conversations"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (true);

-- conversation_participants: users can read their own participations + co-participants
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read conversation participants" ON public.conversation_participants;
  DROP POLICY IF EXISTS "Users can insert conversation participants" ON public.conversation_participants;
END $$;

CREATE POLICY "Users can read conversation participants"
  ON public.conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conversation participants"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (true);

-- conversation_participants: users can update their own last_read_at
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own participation" ON public.conversation_participants;
END $$;

CREATE POLICY "Users can update own participation"
  ON public.conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid());


-- ==========================================
-- PARTE 3: RLS para messages
-- ==========================================

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read messages in their conversations" ON public.messages;
  DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
END $$;

CREATE POLICY "Users can read messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );


-- ==========================================
-- PARTE 4: RPC Functions para chat
-- ==========================================

-- Function to find existing conversation between two users
CREATE OR REPLACE FUNCTION public.get_conversation_between_users(user_a uuid, user_b uuid)
RETURNS TABLE(id uuid) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp1.conversation_id AS id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user_a AND cp2.user_id = user_b
  LIMIT 1;
$$;

-- Function to start a new conversation
CREATE OR REPLACE FUNCTION public.start_new_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conv_id uuid;
  existing_conv_id uuid;
BEGIN
  -- Check if conversation already exists
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid() AND cp2.user_id = other_user_id
  LIMIT 1;

  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (created_at, last_message_at)
  VALUES (now(), now())
  RETURNING conversations.id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
  VALUES
    (new_conv_id, auth.uid(), now()),
    (new_conv_id, other_user_id, now());

  RETURN new_conv_id;
END;
$$;

-- Function to mark a conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$$;

-- Function to get unread total
CREATE OR REPLACE FUNCTION public.get_unread_total(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cnt), 0)::bigint
  FROM (
    SELECT COUNT(*) AS cnt
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE cp.user_id = p_user_id
      AND m.sender_id != p_user_id
      AND m.created_at > cp.last_read_at
  ) sub;
$$;


-- ==========================================
-- PARTE 5: Sync de full_name para pacientes existentes
-- Copiar full_name desde auth.users.raw_user_meta_data a profiles
-- ==========================================
UPDATE public.profiles p
SET full_name = (u.raw_user_meta_data ->> 'full_name')
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR p.full_name = '')
  AND u.raw_user_meta_data ->> 'full_name' IS NOT NULL
  AND u.raw_user_meta_data ->> 'full_name' != '';


-- ==========================================
-- Verificación
-- ==========================================
SELECT 'PROFILES CHECK' AS test, id, full_name, email, role
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;
