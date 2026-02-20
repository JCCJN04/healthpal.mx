-- Tabla para rastrear la última conexión de los usuarios
CREATE TABLE IF NOT EXISTS public.user_status (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Política: Un usuario puede ver su propio estado y actualizarlo
CREATE POLICY "Users can manage their own status"
ON public.user_status
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política: Un usuario puede ver el estado de otros si comparten una conversación
-- Usamos una subconsulta eficiente en conversation_participants
CREATE POLICY "Users can view status of chat participants"
ON public.user_status
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.conversation_participants buddy
        JOIN public.conversation_participants me ON buddy.conversation_id = me.conversation_id
        WHERE me.user_id = auth.uid()
          AND buddy.user_id = public.user_status.user_id
    )
);

-- Habilitar Realtime para user_status
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;
EXCEPTION WHEN OTHERS THEN END; $$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
