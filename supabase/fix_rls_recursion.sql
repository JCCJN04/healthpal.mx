-- ============================================================
--  FIX: Corregir recursión infinita en RLS de chat
--  Ejecutar en: Supabase Dashboard → SQL Editor
--  ⚠️  EJECUTAR ESTE SCRIPT COMPLETO (reemplaza las políticas rotas)
-- ============================================================

-- ==========================================
-- PASO 1: Función helper SECURITY DEFINER
-- Esta función evita la recursión porque bypasea RLS
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_participant_of(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;


-- ==========================================
-- PASO 2: Borrar TODAS las políticas rotas de chat
-- ==========================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all policies on conversation_participants
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'conversation_participants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_participants', pol.policyname);
  END LOOP;

  -- Drop all policies on conversations
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'conversations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.policyname);
  END LOOP;

  -- Drop all policies on messages
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'messages' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
  END LOOP;

  -- Drop the broken profile conversation policy
  DROP POLICY IF EXISTS "Users can read profiles of conversation partners" ON public.profiles;
END $$;


-- ==========================================
-- PASO 3: Políticas SIMPLES para conversation_participants
-- ==========================================

-- Users can see their own participation rows
CREATE POLICY "cp_select_own"
  ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert participation rows
CREATE POLICY "cp_insert"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (true);

-- Users can update their own participation (last_read_at)
CREATE POLICY "cp_update_own"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());


-- ==========================================
-- PASO 4: Políticas para conversations (usa helper function)
-- ==========================================

-- Users can read conversations they participate in
CREATE POLICY "conv_select"
  ON public.conversations FOR SELECT
  USING (public.is_participant_of(id));

-- Any authenticated user can create a conversation
CREATE POLICY "conv_insert"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

-- Participants can update their conversation (last_message_at, etc.)
CREATE POLICY "conv_update"
  ON public.conversations FOR UPDATE
  USING (public.is_participant_of(id));


-- ==========================================
-- PASO 5: Políticas para messages (usa helper function)
-- ==========================================

-- Users can read messages in their conversations
CREATE POLICY "msg_select"
  ON public.messages FOR SELECT
  USING (public.is_participant_of(conversation_id));

-- Users can send messages to their conversations
CREATE POLICY "msg_insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_participant_of(conversation_id)
  );


-- ==========================================
-- PASO 6: Asegurar que RLS está habilitado en todas las tablas
-- ==========================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- Verificación: mostrar todas las políticas
-- ==========================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'conversations', 'conversation_participants', 'messages')
ORDER BY tablename, policyname;
