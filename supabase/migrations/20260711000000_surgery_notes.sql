-- ─────────────────────────────────────────────────────────────────────────────
-- Notas de Cirugía — NOM-004-SSA3-2012 "Del Expediente Clínico"
--
-- Secciones aplicables:
--   §8.6  Nota preoperatoria
--   §8.8  Nota postoperatoria
--   §8.13 Nota de evolución (seguimiento postquirúrgico)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE surgery_note_type AS ENUM (
  'preoperatoria',   -- NOM-004 §8.6
  'postoperatoria',  -- NOM-004 §8.8
  'seguimiento'      -- NOM-004 §8.13 (nota de evolución posquirúrgica)
);

CREATE TABLE surgery_notes (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id               uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id                uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Tipo de nota (determina campos relevantes en el frontend)
  tipo_nota                surgery_note_type NOT NULL DEFAULT 'postoperatoria',

  -- Fecha de la cirugía o consulta (requerida en todos los tipos — NOM-004 §8.6, §8.8, §8.13)
  fecha_cirugia            date,

  -- ── NOM-004 §8.6 Nota preoperatoria ──────────────────────────────────────
  -- y §8.8 campo compartido: diagnóstico preoperatorio
  diagnostico_preoperatorio text,

  -- §8.6: plan quirúrgico / §8.8: operación planeada
  operacion_planeada        text,

  -- §8.6: tipo de anestesia propuesta
  tipo_anestesia            text,

  -- §8.6: riesgo quirúrgico
  riesgo_quirurgico         text,

  -- §8.6: cuidados y plan terapéutico / §8.8: plan postoperatorio
  plan_terapeutico          text,

  -- ── NOM-004 §8.8 Nota postoperatoria ─────────────────────────────────────
  operacion_realizada       text,
  diagnostico_postoperatorio text,

  -- §8.8: descripción de la técnica quirúrgica
  tecnica_quirurgica        text,

  -- §8.8: hallazgos transoperatorios
  hallazgos                 text,

  -- §8.8: reporte de gasas y compresas
  gasas_compresas           text,

  -- §8.8: incidentes y accidentes
  incidentes_accidentes     text,

  -- §8.8: cuantificación de sangrado (mL)
  sangrado_ml               integer     CHECK (sangrado_ml >= 0),

  -- §8.8: estado postquirúrgico inmediato
  estado_postquirurgico     text,

  -- §8.8: envío de piezas o biopsias
  piezas_biopsias           text,

  -- ── NOM-004 §8.13 Nota de evolución ──────────────────────────────────────
  -- Evolución y actualización del cuadro clínico
  evolucion                 text,

  -- Resultados de estudios (laboratorio, imagen, etc.)
  resultados_estudios       text,

  -- ── Campo compartido §8.6, §8.8, §8.13 ──────────────────────────────────
  pronostico                text,

  -- Observaciones libres adicionales
  observaciones             text,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX surgery_notes_patient_idx ON surgery_notes (patient_id, created_at DESC);
CREATE INDEX surgery_notes_doctor_idx  ON surgery_notes (doctor_id);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER surgery_notes_updated_at
  BEFORE UPDATE ON surgery_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE surgery_notes ENABLE ROW LEVEL SECURITY;

-- Doctors manage their own notes
CREATE POLICY "surgery_notes_doctor_all"
  ON surgery_notes FOR ALL
  TO authenticated
  USING  (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());
