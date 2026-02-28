/**
 * Centralized list of medical specialties recognized in Mexico (CONACEM + common sub-specialties).
 * Grouped by clinical area. Used in onboarding, settings, directory, and doctor details.
 */

export interface SpecialtyDefinition {
  value: string
  label: string
  group: string
}

export const SPECIALTIES: SpecialtyDefinition[] = [
  // ── Atención Primaria ──
  { value: 'medicina_general', label: 'Medicina general', group: 'Atención Primaria' },
  { value: 'medicina_familiar', label: 'Medicina Familiar', group: 'Atención Primaria' },
  { value: 'medicina_interna', label: 'Medicina Interna', group: 'Atención Primaria' },
  { value: 'medicina_urgencias', label: 'Medicina de Urgencias', group: 'Atención Primaria' },
  { value: 'medicina_critica', label: 'Medicina Crítica / Intensivista', group: 'Atención Primaria' },

  // ── Cirugía ──
  { value: 'cirugia_general', label: 'Cirugía General', group: 'Cirugía' },
  { value: 'cirugia_cardiovascular', label: 'Cirugía Cardiovascular', group: 'Cirugía' },
  { value: 'cirugia_pediatrica', label: 'Cirugía Pediátrica', group: 'Cirugía' },
  { value: 'cirugia_plastica', label: 'Cirugía Plástica y Reconstructiva', group: 'Cirugía' },
  { value: 'cirugia_oncologica', label: 'Cirugía Oncológica', group: 'Cirugía' },
  { value: 'cirugia_maxilofacial', label: 'Cirugía Maxilofacial', group: 'Cirugía' },
  { value: 'cirugia_torax', label: 'Cirugía de Tórax', group: 'Cirugía' },
  { value: 'cirugia_vascular', label: 'Cirugía Vascular y Angiología', group: 'Cirugía' },
  { value: 'neurocirugia', label: 'Neurocirugía', group: 'Cirugía' },
  { value: 'cirugia_bariatrica', label: 'Cirugía Bariátrica', group: 'Cirugía' },
  { value: 'cirugia_mano', label: 'Cirugía de Mano', group: 'Cirugía' },
  { value: 'cirugia_trasplantes', label: 'Cirugía de Trasplantes', group: 'Cirugía' },
  { value: 'cirugia_robotica', label: 'Cirugía Robótica', group: 'Cirugía' },
  { value: 'cirugia_hepatobiliar', label: 'Cirugía Hepatobiliar', group: 'Cirugía' },

  // ── Pediatría ──
  { value: 'pediatria', label: 'Pediatría', group: 'Pediatría' },
  { value: 'neonatologia', label: 'Neonatología', group: 'Pediatría' },
  { value: 'pediatria_urgencias', label: 'Urgencias Pediátricas', group: 'Pediatría' },
  { value: 'pediatria_desarrollo', label: 'Pediatría del Desarrollo', group: 'Pediatría' },
  { value: 'cardiologia_pediatrica', label: 'Cardiología Pediátrica', group: 'Pediatría' },
  { value: 'gastroenterologia_pediatrica', label: 'Gastroenterología Pediátrica', group: 'Pediatría' },
  { value: 'neurologia_pediatrica', label: 'Neurología Pediátrica', group: 'Pediatría' },

  // ── Ginecología y Obstetricia ──
  { value: 'ginecologia', label: 'Ginecología y Obstetricia', group: 'Ginecología y Obstetricia' },
  { value: 'biologia_reproduccion', label: 'Biología de la Reproducción Humana', group: 'Ginecología y Obstetricia' },
  { value: 'medicina_materno_fetal', label: 'Medicina Materno Fetal', group: 'Ginecología y Obstetricia' },
  { value: 'ginecologia_oncologica', label: 'Ginecología Oncológica', group: 'Ginecología y Obstetricia' },
  { value: 'colposcopia', label: 'Colposcopía', group: 'Ginecología y Obstetricia' },
  { value: 'mastologia', label: 'Mastología', group: 'Ginecología y Obstetricia' },

  // ── Cardiovascular ──
  { value: 'cardiologia', label: 'Cardiología', group: 'Cardiovascular' },
  { value: 'cardiologia_intervencionista', label: 'Cardiología Intervencionista', group: 'Cardiovascular' },
  { value: 'electrofisiologia', label: 'Electrofisiología Cardíaca', group: 'Cardiovascular' },
  { value: 'hemodinamia', label: 'Hemodinamia', group: 'Cardiovascular' },

  // ── Neurociencias ──
  { value: 'neurologia', label: 'Neurología', group: 'Neurociencias' },
  { value: 'neurofisiologia', label: 'Neurofisiología Clínica', group: 'Neurociencias' },
  { value: 'neuropsicologia', label: 'Neuropsicología', group: 'Neurociencias' },

  // ── Salud Mental ──
  { value: 'psiquiatria', label: 'Psiquiatría', group: 'Salud Mental' },
  { value: 'psiquiatria_infantil', label: 'Psiquiatría Infantil y de la Adolescencia', group: 'Salud Mental' },
  { value: 'psicogeriatria', label: 'Psicogeriatría', group: 'Salud Mental' },
  { value: 'psicologia_clinica', label: 'Psicología Clínica', group: 'Salud Mental' },
  { value: 'psicologia_infantil', label: 'Psicología Infantil', group: 'Salud Mental' },
  { value: 'neuropsiquiatria', label: 'Neuropsiquiatría', group: 'Salud Mental' },
  { value: 'adicciones', label: 'Adicciones', group: 'Salud Mental' },
  { value: 'terapia_pareja_familia', label: 'Terapia de Pareja y Familia', group: 'Salud Mental' },

  // ── Aparato Digestivo ──
  { value: 'gastroenterologia', label: 'Gastroenterología', group: 'Aparato Digestivo' },
  { value: 'endoscopia', label: 'Endoscopia Gastrointestinal', group: 'Aparato Digestivo' },
  { value: 'hepatologia', label: 'Hepatología', group: 'Aparato Digestivo' },
  { value: 'coloproctologia', label: 'Coloproctología', group: 'Aparato Digestivo' },

  // ── Aparato Respiratorio ──
  { value: 'neumologia', label: 'Neumología', group: 'Aparato Respiratorio' },
  { value: 'neumologia_pediatrica', label: 'Neumología Pediátrica', group: 'Aparato Respiratorio' },
  { value: 'medicina_sueno', label: 'Medicina del Sueño', group: 'Aparato Respiratorio' },

  // ── Nefrología y Urología ──
  { value: 'nefrologia', label: 'Nefrología', group: 'Nefrología y Urología' },
  { value: 'nefrologia_pediatrica', label: 'Nefrología Pediátrica', group: 'Nefrología y Urología' },
  { value: 'urologia', label: 'Urología', group: 'Nefrología y Urología' },
  { value: 'urologia_ginecologica', label: 'Urología Ginecológica', group: 'Nefrología y Urología' },
  { value: 'andrologia', label: 'Andrología', group: 'Nefrología y Urología' },

  // ── Endocrinología ──
  { value: 'endocrinologia', label: 'Endocrinología', group: 'Endocrinología' },
  { value: 'endocrinologia_pediatrica', label: 'Endocrinología Pediátrica', group: 'Endocrinología' },
  { value: 'diabetologia', label: 'Diabetología', group: 'Endocrinología' },

  // ── Hematología e Inmunología ──
  { value: 'hematologia', label: 'Hematología', group: 'Hematología e Inmunología' },
  { value: 'hematologia_pediatrica', label: 'Hematología Pediátrica', group: 'Hematología e Inmunología' },
  { value: 'inmunologia_alergia', label: 'Alergia e Inmunología Clínica', group: 'Hematología e Inmunología' },
  { value: 'reumatologia', label: 'Reumatología', group: 'Hematología e Inmunología' },

  // ── Oncología ──
  { value: 'oncologia_medica', label: 'Oncología Médica', group: 'Oncología' },
  { value: 'oncologia_pediatrica', label: 'Oncología Pediátrica', group: 'Oncología' },
  { value: 'radio_oncologia', label: 'Radio-Oncología', group: 'Oncología' },
  { value: 'oncologia_quirurgica', label: 'Oncología Quirúrgica', group: 'Oncología' },

  // ── Dermatología ──
  { value: 'dermatologia', label: 'Dermatología', group: 'Dermatología' },
  { value: 'dermatologia_pediatrica', label: 'Dermatología Pediátrica', group: 'Dermatología' },
  { value: 'dermatologia_oncologica', label: 'Dermato-Oncología', group: 'Dermatología' },
  { value: 'tricologia', label: 'Tricología', group: 'Dermatología' },

  // ── Oftalmología ──
  { value: 'oftalmologia', label: 'Oftalmología', group: 'Oftalmología' },
  { value: 'retina', label: 'Retina y Vítreo', group: 'Oftalmología' },
  { value: 'oftalmologia_pediatrica', label: 'Oftalmología Pediátrica', group: 'Oftalmología' },
  { value: 'optometria', label: 'Optometría', group: 'Oftalmología' },
  { value: 'glaucoma', label: 'Glaucoma', group: 'Oftalmología' },
  { value: 'cirugia_refractiva', label: 'Cirugía Refractiva', group: 'Oftalmología' },

  // ── Otorrinolaringología ──
  { value: 'otorrinolaringologia', label: 'Otorrinolaringología', group: 'Otorrinolaringología' },
  { value: 'audiologia', label: 'Audiología y Otoneurología', group: 'Otorrinolaringología' },
  { value: 'foniatria', label: 'Foniatría', group: 'Otorrinolaringología' },

  // ── Traumatología y Ortopedia ──
  { value: 'traumatologia', label: 'Traumatología y Ortopedia', group: 'Traumatología y Ortopedia' },
  { value: 'ortopedia_pediatrica', label: 'Ortopedia Pediátrica', group: 'Traumatología y Ortopedia' },
  { value: 'columna_vertebral', label: 'Cirugía de Columna Vertebral', group: 'Traumatología y Ortopedia' },
  { value: 'medicina_deporte', label: 'Medicina del Deporte', group: 'Traumatología y Ortopedia' },
  { value: 'artroscopia', label: 'Artroscopía', group: 'Traumatología y Ortopedia' },
  { value: 'ortopedia_oncologica', label: 'Ortopedia Oncológica', group: 'Traumatología y Ortopedia' },

  // ── Rehabilitación ──
  { value: 'medicina_fisica_rehabilitacion', label: 'Medicina Física y Rehabilitación', group: 'Rehabilitación' },
  { value: 'fisioterapia', label: 'Fisioterapia', group: 'Rehabilitación' },
  { value: 'terapia_ocupacional', label: 'Terapia Ocupacional', group: 'Rehabilitación' },
  { value: 'terapia_lenguaje', label: 'Terapia de Lenguaje', group: 'Rehabilitación' },
  { value: 'quiropraxia', label: 'Quiropráctica', group: 'Rehabilitación' },

  // ── Dolor y Anestesia ──
  { value: 'anestesiologia', label: 'Anestesiología', group: 'Dolor y Anestesia' },
  { value: 'algologia', label: 'Algología (Clínica del Dolor)', group: 'Dolor y Anestesia' },
  { value: 'medicina_paliativa', label: 'Medicina Paliativa', group: 'Dolor y Anestesia' },

  // ── Diagnóstico ──
  { value: 'radiologia', label: 'Radiología e Imagen', group: 'Diagnóstico' },
  { value: 'medicina_nuclear', label: 'Medicina Nuclear', group: 'Diagnóstico' },
  { value: 'patologia', label: 'Anatomía Patológica', group: 'Diagnóstico' },
  { value: 'genetica_medica', label: 'Genética Médica', group: 'Diagnóstico' },
  { value: 'laboratorio_clinico', label: 'Patología Clínica / Laboratorio', group: 'Diagnóstico' },

  // ── Infectología ──
  { value: 'infectologia', label: 'Infectología', group: 'Infectología' },
  { value: 'infectologia_pediatrica', label: 'Infectología Pediátrica', group: 'Infectología' },

  // ── Geriatría ──
  { value: 'geriatria', label: 'Geriatría', group: 'Geriatría' },

  // ── Nutrición ──
  { value: 'nutriologia_clinica', label: 'Nutriología Clínica', group: 'Nutrición' },
  { value: 'bariatria', label: 'Bariatría (Obesidad)', group: 'Nutrición' },
  { value: 'nutricion', label: 'Nutrición', group: 'Nutrición' },

  // ── Salud Pública ──
  { value: 'medicina_trabajo', label: 'Medicina del Trabajo', group: 'Salud Pública' },
  { value: 'epidemiologia', label: 'Epidemiología', group: 'Salud Pública' },
  { value: 'medicina_preventiva', label: 'Medicina Preventiva', group: 'Salud Pública' },
  { value: 'salud_publica', label: 'Salud Pública', group: 'Salud Pública' },
  { value: 'medicina_legal', label: 'Medicina Legal y Forense', group: 'Salud Pública' },
  { value: 'toxicologia', label: 'Toxicología', group: 'Salud Pública' },

  // ── Medicina Estética ──
  { value: 'medicina_estetica', label: 'Medicina Estética', group: 'Medicina Estética' },
  { value: 'cirugia_estetica', label: 'Cirugía Estética', group: 'Medicina Estética' },

  // ── Odontología ──
  { value: 'odontologia_general', label: 'Odontología General', group: 'Odontología' },
  { value: 'ortodoncia', label: 'Ortodoncia', group: 'Odontología' },
  { value: 'endodoncia', label: 'Endodoncia', group: 'Odontología' },
  { value: 'periodoncia', label: 'Periodoncia', group: 'Odontología' },
  { value: 'odontopediatria', label: 'Odontopediatría', group: 'Odontología' },
  { value: 'protesis_dental', label: 'Prótesis Dental', group: 'Odontología' },
  { value: 'cirugia_oral', label: 'Cirugía Oral y Maxilofacial', group: 'Odontología' },
  { value: 'implantologia', label: 'Implantología Dental', group: 'Odontología' },
  { value: 'odontologia_estetica', label: 'Odontología Estética', group: 'Odontología' },

  // ── Podología ──
  { value: 'podologia', label: 'Podología', group: 'Podología' },

  // ── Medicina Alternativa / Complementaria ──
  { value: 'homeopatia', label: 'Homeopatía', group: 'Medicina Alternativa' },
  { value: 'acupuntura', label: 'Acupuntura', group: 'Medicina Alternativa' },
  { value: 'medicina_tradicional', label: 'Medicina Tradicional', group: 'Medicina Alternativa' },

  // ── Medicina Hiperbárica ──
  { value: 'medicina_hiperbarica', label: 'Medicina Hiperbárica', group: 'Medicina Hiperbárica' },

  // ── Otros ──
  { value: 'otro', label: 'Otra especialidad', group: 'Otros' },
]

/** Pre-built lookup map: value → label (O(1) access) */
const _lookup = new Map(SPECIALTIES.map((s) => [s.value, s.label]))

/**
 * Convert a specialty slug like `medicina_general` to its Spanish label.
 * Falls back to title-casing the slug if not found in the list.
 */
export function formatSpecialty(slug: string | null | undefined): string {
  if (!slug) return 'Médico General'
  return (
    _lookup.get(slug) ??
    slug
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}
