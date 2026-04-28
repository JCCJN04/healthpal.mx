-- Table: archivos_recibidos
-- Stores metadata for files received via WhatsApp webhook.
CREATE TABLE IF NOT EXISTS archivos_recibidos (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  telefono      text        NOT NULL,
  nombre_archivo text,
  storage_path  text,
  tipo          text,
  mime_type     text,
  recibido_en   timestamptz DEFAULT now()
);

-- Only the service-role key (used by the Edge Function) can insert/read.
-- Authenticated users have no direct access to this table by default.
ALTER TABLE archivos_recibidos ENABLE ROW LEVEL SECURITY;

-- Storage bucket: documentos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;
