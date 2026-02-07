-- ============================================
-- FIX: PERMISOS DE ELIMINACIÓN PARA DOCUMENTOS
-- ============================================
-- Este script habilita la política de RLS para que los usuarios
-- puedan eliminar sus propios documentos de la base de datos.

-- 1. Verificar si la política ya existe y eliminarla para evitar duplicados
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'documents' 
        AND policyname = 'Users can delete their own documents'
    ) THEN
        DROP POLICY "Users can delete their own documents" ON public.documents;
    END IF;
END $$;

-- 2. Crear la política de eliminación vinculada al owner_id
CREATE POLICY "Users can delete their own documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = owner_id);

-- 3. Asegurar que RLS esté habilitado
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 4. (Opcional) Verificar otras políticas necesarias para el flujo completo
-- SELECT
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'documents' 
        AND policyname = 'Users can view their own documents'
    ) THEN
        CREATE POLICY "Users can view their own documents" 
        ON public.documents 
        FOR SELECT 
        USING (auth.uid() = owner_id);
    END IF;
END $$;

-- INSERT
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'documents' 
        AND policyname = 'Users can upload their own documents'
    ) THEN
        CREATE POLICY "Users can upload their own documents" 
        ON public.documents 
        FOR INSERT 
        WITH CHECK (auth.uid() = owner_id);
    END IF;
END $$;

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Políticas de documentos actualizadas correctamente.';
END $$;
