-- MODULO DE MENSAJERÍA (CHAT) - ULTIMATE REPAIR SCRIPT
-- Pegar esto en el SQL Editor de Supabase y darle a "Run".

-- 1. SANEAR TABLAS (Añadir lo que falte si ya existen)
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_text text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Participantes
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    last_read_at timestamptz DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

-- Mensajes
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    body text NOT NULL,
    created_at timestamptz DEFAULT now(),
    read_at timestamptz,
    attachment_path text,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 2. RESET TOTAL DE SEGURIDAD (Permisivo para MVP)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('conversations', 'conversation_participants', 'messages') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Nuevas políticas definitivas
CREATE POLICY "chat_conv_all" ON public.conversations FOR ALL TO authenticated USING (true);
CREATE POLICY "chat_part_all" ON public.conversation_participants FOR ALL TO authenticated USING (true);
CREATE POLICY "chat_msg_all" ON public.messages FOR ALL TO authenticated USING (true);

-- Perfiles (Asegurar que se puedan ver nombres)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_read_v1" ON public.profiles;
CREATE POLICY "profiles_read_v1" ON public.profiles FOR SELECT TO authenticated USING (true);

-- 3. FUNCIONES RPC (SECURITY DEFINER para saltar RLS en creación)
CREATE OR REPLACE FUNCTION public.get_conversation_between_users(user_a uuid, user_b uuid)
RETURNS TABLE (id uuid) AS $$
BEGIN
    RETURN QUERY
    SELECT cp1.conversation_id
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = user_a
      AND cp2.user_id = user_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.start_new_conversation(other_user_id uuid)
RETURNS uuid AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO public.conversations (last_message_at) VALUES (now()) RETURNING id INTO new_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (new_id, auth.uid()), (new_id, other_user_id);
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REALTIME
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN END; $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN OTHERS THEN END; $$;
