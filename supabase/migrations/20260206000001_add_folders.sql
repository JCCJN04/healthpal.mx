-- ============================================
-- MIGRATION: GESTIÓN DE FOLDERS (DRIVE STYLE)
-- ============================================

-- 1. Crear tabla de folders
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#33C7BE',
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS en folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para folders
CREATE POLICY "Users can view their own folders" 
ON public.folders FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own folders" 
ON public.folders FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own folders" 
ON public.folders FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own folders" 
ON public.folders FOR DELETE USING (auth.uid() = owner_id);

-- 4. Actualizar relación en documents (ya existe folder_id pero aseguramos FK)
-- Nota: Si la columna folder_id ya existe, esto solo agrega la constraint si falta
-- ALTER TABLE public.documents ADD CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;

-- 5. Función para recuento de items en folder (opcional para UI)
CREATE OR REPLACE FUNCTION get_folder_item_count(folder_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM public.documents WHERE folder_id = folder_id
    ) + (
        SELECT COUNT(*) FROM public.folders WHERE parent_id = folder_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
