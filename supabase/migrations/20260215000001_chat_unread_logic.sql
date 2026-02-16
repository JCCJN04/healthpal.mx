-- 1. Actualizar metadatos de conversación cuando llega un mensaje nuevo
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_text = NEW.body
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- 2. Función para marcar conversación como leída
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.conversation_participants
    SET last_read_at = now()
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para obtener el total de mensajes sin leer (opcional para simplificar queries)
CREATE OR REPLACE FUNCTION public.get_unread_total(p_user_id uuid)
RETURNS bigint AS $$
DECLARE
    total bigint;
BEGIN
    SELECT count(m.id)
    FROM public.messages m
    JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = p_user_id
        AND m.sender_id != p_user_id
        AND m.created_at > cp.last_read_at
    INTO total;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Asegurar que las columnas existan (por si acaso no se corrieron migraciones previas)
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS last_read_at timestamptz DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_text text;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_id ON public.conversation_participants(user_id);
