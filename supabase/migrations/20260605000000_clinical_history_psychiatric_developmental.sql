-- Add psychiatric and developmental history columns to clinical_histories
ALTER TABLE clinical_histories
    ADD COLUMN IF NOT EXISTS psychiatric_history  JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS developmental_history JSONB DEFAULT NULL;

COMMENT ON COLUMN clinical_histories.psychiatric_history   IS 'Antecedentes psiquiátricos del paciente (diagnósticos, tratamientos, hospitalizaciones)';
COMMENT ON COLUMN clinical_histories.developmental_history IS 'Antecedentes de desarrollo del paciente (perinatal, psicomotor, escolar)';
