-- Fix for documents folder_id foreign key constraint
-- The existing constraint might be too restrictive or malformed.
-- We will drop it and recreate it with the correct configuration (ON DELETE SET NULL).

DO $$
BEGIN
    -- 1. Drop the constraint if it exists by its likely names
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_folder_id_fkey') THEN
        ALTER TABLE public.documents DROP CONSTRAINT documents_folder_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_folder') THEN
        ALTER TABLE public.documents DROP CONSTRAINT fk_folder;
    END IF;

    -- 2. Ensure folder_id column is nullable (to allow moving to Root/Sin Carpeta)
    ALTER TABLE public.documents ALTER COLUMN folder_id DROP NOT NULL;

    -- 3. Add the foreign key constraint correctly
    -- This ensures that if a folder is deleted, the document is moved to Root (NULL) instead of being deleted or blocking deletion.
    ALTER TABLE public.documents
    ADD CONSTRAINT documents_folder_id_fkey
    FOREIGN KEY (folder_id)
    REFERENCES public.folders(id)
    ON DELETE SET NULL;

END
$$;
