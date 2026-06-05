import { useState, useEffect, useCallback, useRef } from 'react'
import { Save, Loader2, ClipboardList, ChevronDown, ChevronUp, X } from 'lucide-react'
import { showToast } from '@/shared/components/ui/Toast'
import { getClinicalHistory, upsertClinicalHistory } from '@/shared/lib/queries/clinicalHistory'
import { logger } from '@/shared/lib/logger'

// ── Systems review types & config ────────────────────────────────────────────

interface SystemEntry {
    normal: boolean
    symptoms: string[]
    notes: string
}

type SystemKey = 'digestivo' | 'cardiovascular' | 'respiratorio' | 'urinario' | 'genital' | 'hematologico' | 'endocrino' | 'osteomuscular' | 'nervioso' | 'sensorial' | 'psicosomatico'
type SystemsReviewData = Record<SystemKey, SystemEntry>

const SYSTEMS_CONFIG: { key: SystemKey; label: string; short: string; icon: string; symptoms: string[] }[] = [
    { key: 'digestivo',     label: 'Aparato digestivo',     short: 'Digestivo',     icon: '🫃', symptoms: ['Halitosis', 'Boca seca', 'Masticación', 'Disfagia / odinofagia', 'Pirosis', 'Náusea', 'Vómito', 'Dolor abdominal', 'Meteorismo / flatulencias', 'Constipación', 'Diarrea', 'Rectorragia', 'Melenas', 'Pujo y tenesmo', 'Ictericia', 'Coluria / acolia', 'Prurito cutáneo', 'Hemorragias'] },
    { key: 'cardiovascular',label: 'Aparato cardiovascular',short: 'Cardiovascular', icon: '🫀', symptoms: ['Disnea', 'Tos', 'Hemoptisis', 'Dolor precordial', 'Palpitaciones', 'Cianosis', 'Edema', 'Manifestaciones periféricas'] },
    { key: 'respiratorio',  label: 'Aparato respiratorio',  short: 'Respiratorio',  icon: '🫁', symptoms: ['Tos', 'Disnea', 'Dolor torácico', 'Hemoptisis', 'Cianosis', 'Vómica', 'Alteraciones de la voz'] },
    { key: 'urinario',      label: 'Aparato urinario',      short: 'Urinario',      icon: '💧', symptoms: ['Poliuria', 'Anuria', 'Polaquiuria', 'Oliguria', 'Nicturia', 'Opsiuria', 'Disuria', 'Tenesmo vesical', 'Urgencia miccional', 'Alteración del chorro', 'Enuresis', 'Incontinencia', 'Dolor lumbar', 'Edema renal', 'Hipertensión arterial'] },
    { key: 'genital',       label: 'Aparato genital',       short: 'Genital',       icon: '🔬', symptoms: ['Criptorquidia', 'Fimosis', 'Alteración función sexual', 'Sangrado genital', 'Flujo / leucorrea', 'Dolor ginecológico', 'Prurito vulvar'] },
    { key: 'hematologico',  label: 'Aparato hematológico',  short: 'Hematológico',  icon: '🩸', symptoms: ['Palidez', 'Astenia', 'Adinamia', 'Hemorragias', 'Adenopatías', 'Esplenomegalia'] },
    { key: 'endocrino',     label: 'Sistema endocrino',     short: 'Endocrino',     icon: '⚡', symptoms: ['Bocio', 'Letargia / bradipsiquia', 'Intolerancia al calor', 'Intolerancia al frío', 'Nerviosismo', 'Hiperquinesis', 'Galactorrea', 'Amenorrea', 'Ginecomastia', 'Obesidad', 'Ruborización'] },
    { key: 'osteomuscular', label: 'Sistema osteomuscular', short: 'Osteomuscular', icon: '🦴', symptoms: ['Ganglios visibles', 'Xeroftalmia', 'Fotosensibilidad', 'Artralgias', 'Mialgias', 'Fenómeno de Raynaud'] },
    { key: 'nervioso',      label: 'Sistema nervioso',      short: 'Nervioso',      icon: '🧠', symptoms: ['Cefalea', 'Síncope', 'Convulsiones', 'Déficit transitorio', 'Vértigo', 'Confusión', 'Alteración vigilia/sueño', 'Alteración de la marcha', 'Alteración del equilibrio', 'Alteración de la sensibilidad'] },
    { key: 'sensorial',     label: 'Sistema sensorial',     short: 'Sensorial',     icon: '👁️', symptoms: ['Visión borrosa', 'Fosfenos', 'Dolor ocular', 'Fotofobia', 'Xeroftalmia', 'Amaurosis', 'Otalgia', 'Otorrea / otorragia', 'Hipoacusia', 'Tinitus', 'Epistaxis', 'Secreción nasal', 'Dolor de garganta', 'Alteración de la fonación'] },
    { key: 'psicosomatico', label: 'Psicosomático',         short: 'Psicosomático', icon: '🧘', symptoms: ['Ansiedad', 'Depresión', 'Alteración de la afectividad', 'Emotividad', 'Amnesia', 'Alteración de la voluntad', 'Alteración del pensamiento', 'Alteración de la atención', 'Ideación suicida', 'Delirios'] },
]

const DEF_SYSTEM_ENTRY: SystemEntry = { normal: false, symptoms: [], notes: '' }

function makeDefaultSystems(): SystemsReviewData {
    return Object.fromEntries(SYSTEMS_CONFIG.map(s => [s.key, { ...DEF_SYSTEM_ENTRY }])) as SystemsReviewData
}

function parseAllergies(raw: string | null | undefined): AllergyItem[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
            if (parsed.length === 0) return []
            if (typeof parsed[0].name === 'string') return parsed as AllergyItem[]
            return []
        }
    } catch { /* legacy */ }
    // Legacy comma-separated string → convert to basic AllergyItem[]
    return raw.split(',').map(s => s.trim()).filter(Boolean).map(name => ({
        id: name,
        name,
        type: 'otro' as const,
        severity: 'leve' as const,
        reaction: '',
    }))
}

function parseSystemsReview(raw: string | null | undefined): SystemsReviewData {
    if (!raw) return makeDefaultSystems()
    try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && 'digestivo' in parsed) {
            // Merge with defaults so new keys are always present
            const defaults = makeDefaultSystems()
            const merged: Partial<SystemsReviewData> = {}
            for (const s of SYSTEMS_CONFIG) {
                merged[s.key] = { ...DEF_SYSTEM_ENTRY, ...defaults[s.key], ...(parsed[s.key] || {}) }
            }
            return merged as SystemsReviewData
        }
    } catch { /* legacy plain text — ignore */ }
    return makeDefaultSystems()
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AllergyItem {
    id: string
    name: string
    type: 'medicamento' | 'alimento' | 'ambiental' | 'otro'
    severity: 'leve' | 'moderada' | 'grave'
    reaction: string
}

const ALLERGY_TYPES: { key: AllergyItem['type']; label: string; icon: string }[] = [
    { key: 'medicamento', label: 'Medicamento', icon: '💊' },
    { key: 'alimento',    label: 'Alimento',    icon: '🍎' },
    { key: 'ambiental',   label: 'Ambiental',   icon: '🌿' },
    { key: 'otro',        label: 'Otro',        icon: '⚠️' },
]

const ALLERGEN_DB: { name: string; type: AllergyItem['type'] }[] = [
    // Medicamentos
    { name: 'Penicilina',            type: 'medicamento' },
    { name: 'Amoxicilina',           type: 'medicamento' },
    { name: 'Ampicilina',            type: 'medicamento' },
    { name: 'Cefalosporinas',        type: 'medicamento' },
    { name: 'Sulfonamidas (Sulfa)',   type: 'medicamento' },
    { name: 'Aspirina',              type: 'medicamento' },
    { name: 'Ibuprofeno',            type: 'medicamento' },
    { name: 'Naproxeno',             type: 'medicamento' },
    { name: 'Diclofenaco',           type: 'medicamento' },
    { name: 'AINES',                 type: 'medicamento' },
    { name: 'Metamizol',             type: 'medicamento' },
    { name: 'Paracetamol',           type: 'medicamento' },
    { name: 'Codeína',               type: 'medicamento' },
    { name: 'Morfina',               type: 'medicamento' },
    { name: 'Contraste yodado',      type: 'medicamento' },
    { name: 'Anestesia local',       type: 'medicamento' },
    { name: 'Lidocaína',             type: 'medicamento' },
    { name: 'Metformina',            type: 'medicamento' },
    { name: 'Ciprofloxacino',        type: 'medicamento' },
    { name: 'Claritromicina',        type: 'medicamento' },
    { name: 'Azitromicina',          type: 'medicamento' },
    { name: 'Tetraciclinas',         type: 'medicamento' },
    { name: 'Vancomicina',           type: 'medicamento' },
    { name: 'Carbamazepina',         type: 'medicamento' },
    { name: 'Fenitoína',             type: 'medicamento' },
    { name: 'Alopurinol',            type: 'medicamento' },
    { name: 'Látex',                 type: 'medicamento' },
    // Alimentos
    { name: 'Mariscos',              type: 'alimento' },
    { name: 'Camarones',             type: 'alimento' },
    { name: 'Cangrejo',              type: 'alimento' },
    { name: 'Langosta',              type: 'alimento' },
    { name: 'Pescado',               type: 'alimento' },
    { name: 'Nueces',                type: 'alimento' },
    { name: 'Cacahuates / Maní',     type: 'alimento' },
    { name: 'Almendras',             type: 'alimento' },
    { name: 'Pistaches',             type: 'alimento' },
    { name: 'Leche de vaca',         type: 'alimento' },
    { name: 'Huevo',                 type: 'alimento' },
    { name: 'Trigo / Gluten',        type: 'alimento' },
    { name: 'Soya',                  type: 'alimento' },
    { name: 'Ajonjolí',              type: 'alimento' },
    { name: 'Fresa',                 type: 'alimento' },
    { name: 'Kiwi',                  type: 'alimento' },
    { name: 'Mango',                 type: 'alimento' },
    { name: 'Melocotón / Durazno',   type: 'alimento' },
    { name: 'Sulfitos / Conservadores', type: 'alimento' },
    // Ambiental / Contacto
    { name: 'Polen (gramíneas)',      type: 'ambiental' },
    { name: 'Polen (árboles)',        type: 'ambiental' },
    { name: 'Polen (maleza)',         type: 'ambiental' },
    { name: 'Ácaros del polvo',       type: 'ambiental' },
    { name: 'Polvo doméstico',        type: 'ambiental' },
    { name: 'Pelo de gato',           type: 'ambiental' },
    { name: 'Pelo de perro',          type: 'ambiental' },
    { name: 'Moho / Hongos',          type: 'ambiental' },
    { name: 'Cucaracha',              type: 'ambiental' },
    { name: 'Níquel',                 type: 'ambiental' },
    { name: 'Cromo',                  type: 'ambiental' },
    { name: 'Fragancias / Perfumes',  type: 'ambiental' },
    { name: 'Formaldehído',           type: 'ambiental' },
]

const ALLERGY_SEVERITY: { key: AllergyItem['severity']; label: string; color: string }[] = [
    { key: 'leve',     label: 'Leve',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { key: 'moderada', label: 'Moderada', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { key: 'grave',    label: 'Grave',    color: 'bg-red-100 text-red-700 border-red-200' },
]

const IMPLANTS_LIST = [
    'Marcapasos / DAI', 'Stent coronario', 'Prótesis valvular', 'Prótesis articular',
    'DIU / Implante anticonceptivo', 'Implante coclear', 'Neuroestimulador',
    'Puerto venoso', 'Catéter permanente', 'Otro implante',
]

interface ToggleItem {
    present: boolean
    details: string
}

interface FHMemberRecord {
    diseases: string[]   // disease keys this family member has
    notes: string
}

type FamilyHistory = Record<string, FHMemberRecord>

// ── Family history constants ──────────────────────────────────────────────────

const FAMILY_MEMBERS = [
    { key: 'padre',    label: 'Padre',         icon: '👨' },
    { key: 'madre',    label: 'Madre',          icon: '👩' },
    { key: 'ab_pat',   label: 'Abuelos paternos', icon: '👴' },
    { key: 'ab_mat',   label: 'Abuelos maternos', icon: '👵' },
    { key: 'hermanos', label: 'Hermanos',        icon: '👫' },
]

const FH_DISEASES = [
    { key: 'diabetes_mellitus',     label: 'Diabetes Mellitus' },
    { key: 'hipertension_arterial', label: 'Hipertensión Arterial Sistémica' },
    { key: 'dislipidemias',         label: 'Dislipidemias' },
    { key: 'neoplasias',            label: 'Neoplasias' },
    { key: 'malformaciones',        label: 'Malformaciones hereditarias / congénitas' },
    { key: 'alergias',              label: 'Alergias' },
    { key: 'psiquiatricas',         label: 'Enf. Psiquiátricas' },
    { key: 'neurologicas',          label: 'Enf. Neurológicas' },
    { key: 'cardiovasculares',      label: 'Enf. Cardiovasculares' },
    { key: 'broncopulmonares',      label: 'Enf. Broncopulmonares' },
    { key: 'tiroideas',             label: 'Enf. Tiroideas' },
    { key: 'renales',               label: 'Enf. Renales' },
    { key: 'osteoarticulares',      label: 'Enf. Osteoarticulares' },
    { key: 'infectocontagiosas',    label: 'Enf. Infectocontagiosas' },
] as const

interface HepatitisItem {
    a: boolean
    b: boolean
    c: boolean
    details: string
}

interface CDItem {
    present: boolean
    year: string
    details: string
}

// ── Patho constants ───────────────────────────────────────────────────────────

const CD_DISEASES = [
    { key: 'diabetes_mellitus',    label: 'Diabetes Mellitus' },
    { key: 'hipertension_arterial', label: 'Hipertensión Arterial Sistémica' },
    { key: 'dislipidemias',         label: 'Dislipidemias' },
    { key: 'obesidad',              label: 'Obesidad' },
    { key: 'neoplasicas',           label: 'Neoplásicas' },
    { key: 'reumatologicas',        label: 'Enf. Reumatológicas' },
    { key: 'gota',                  label: 'Enfermedad de Gota' },
    { key: 'psiquiatricas',         label: 'Enf. Psiquiátricas' },
    { key: 'nervioso',              label: 'Sistema Nervioso' },
    { key: 'cardiovascular',        label: 'Cardiovascular' },
    { key: 'respiratorio',          label: 'Respiratorio' },
    { key: 'gastrointestinal',      label: 'Gastrointestinal' },
    { key: 'urinario',              label: 'Urinario' },
    { key: 'musculoesqueletico',    label: 'Musculoesquelético' },
    { key: 'tegumentario',          label: 'Tegumentario' },
    { key: 'endocrinologicas',      label: 'Endocrinológicas' },
    { key: 'inmunologicas',         label: 'Inmunológicas' },
] as const

const EXANTEMATICAS_LIST = ['Exantema súbito', 'Roséola escarlatina', 'Rubéola', 'Sarampión', 'Varicela'] as const
const INFECTOCONTAGIOSAS_LIST = ['Faringoamigdalitis', 'Fiebre Reumática', 'Hepatitis', 'Parasitosis', 'Tifoidea', 'Transmisión sexual', 'Tuberculosis'] as const

const ANTECEDENTES_PREVIOS = [
    { key: 'generales',        label: 'Generales',          emoji: '⚕️' },
    { key: 'alergicos',        label: 'Alérgicos',          emoji: '🌿' },
    { key: 'hospitalizaciones', label: 'Hospitalizaciones', emoji: '🏥' },
    { key: 'surgeries',        label: 'Quirúrgicos',        emoji: '🔪' },
    { key: 'traumaticos',      label: 'Traumáticos',        emoji: '🩹' },
    { key: 'transfusions',     label: 'Transfusiones',      emoji: '🩸' },
] as const

interface SmokingItem {
    present: boolean
    frequency: string
    details: string
}

interface ExerciseItem {
    present: boolean
    frequency: string
    details: string
}

interface AlcoholItem {
    present: boolean
    frequency_per_week: string
    cups_per_day: string
    details: string
}

interface PathologicalHistory {
    medications: ToggleItem
    // Antecedentes previos
    generales: ToggleItem
    alergicos: ToggleItem
    hospitalizaciones: ToggleItem
    surgeries: ToggleItem
    traumaticos: ToggleItem
    transfusions: ToggleItem
    // Adicciones
    addiction_alcohol: ToggleItem
    addiction_tabaco: ToggleItem
    addiction_otras: ToggleItem
    // Enfermedades por contagio
    exantematicas: string[]
    exantematica_otra: string
    infectocontagiosas: string[]
    infectocontagiosa_otra: string
    hepatitis_types: { a: boolean; b: boolean; c: boolean }
    // Crónico-Degenerativas
    cd: Record<string, CDItem>
    // Implantes y dispositivos
    implants: string[]
    vaccination: { status: string; notes: string }
    // Legacy fields (backward compat – kept for migration)
    other_diseases?: ToggleItem
    hepatitis?: HepatitisItem
    diabetes?: ToggleItem
    hypertension?: ToggleItem
}

interface NonPathologicalHistory {
    smoking: SmokingItem
    alcohol: AlcoholItem
    drugs: ToggleItem
    exercise: ExerciseItem
}

interface GynecologicalHistory {
    applicable: boolean
    menarche: string
    gestations: string
    births: string
    cesareans: string
    abortions: string
    stillbirths: string
    ectopics: string
    last_gestation_date: string
    still_menstruating: boolean
    duration_days: string
    frequency_days: string
    irregular_cycles: boolean
    contraceptives: ToggleItem
    last_period_date: string
    pregnant: boolean
    gestational_age: string
    probable_birth_date: string
    trimester: string
    details: string
}

interface FormData {
    patient_id: string
    allergies: string
    referral_source: string
    consultation_reason: string
    patient_observations: string
    family_history: FamilyHistory
    pathological_history: PathologicalHistory
    non_pathological_history: NonPathologicalHistory
    gynecological_history: GynecologicalHistory
    systems_review: string
    updated_at?: string
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEF_TOGGLE: ToggleItem = { present: false, details: '' }

function makeDefaultFH(): FamilyHistory {
    const r: FamilyHistory = {}
    FAMILY_MEMBERS.forEach(m => { r[m.key] = { diseases: [], notes: '' } })
    return r
}

const DEF_FAMILY: FamilyHistory = makeDefaultFH()

/** Migrate any previous FamilyHistory format to member-first FHMemberRecord format. */
function migrateFH(raw: Record<string, unknown>): FamilyHistory {
    const base = makeDefaultFH()

    // Detect new member-first format (keys are member keys like 'padre')
    const isMemberFirst = FAMILY_MEMBERS.some(m => raw[m.key] !== undefined)
    if (isMemberFirst) {
        FAMILY_MEMBERS.forEach(({ key }) => {
            const existing = raw[key] as Record<string, unknown>
            if (existing && typeof existing === 'object') {
                base[key] = {
                    diseases: Array.isArray(existing.diseases) ? existing.diseases : [],
                    notes: existing.notes || '',
                }
            }
        })
        return base
    }

    // Old disease-first format: invert disease→members into member→diseases
    FH_DISEASES.forEach(({ key: dKey }) => {
        const item = raw[dKey] as Record<string, unknown>
        if (!item) return
        const memberKeys: string[] = Array.isArray(item.members)
            ? item.members
            : typeof item.members === 'object' && item.members !== null
                ? Object.keys(item.members)
                : []
        memberKeys.forEach(mKey => {
            if (base[mKey]) base[mKey].diseases.push(dKey)
        })
    })

    return base
}

function makeDefaultCD(): Record<string, CDItem> {
    const r: Record<string, CDItem> = {}
    CD_DISEASES.forEach(d => { r[d.key] = { present: false, year: '', details: '' } })
    return r
}

const DEF_PATHO: PathologicalHistory = {
    medications:      { ...DEF_TOGGLE },
    generales:        { ...DEF_TOGGLE },
    alergicos:        { ...DEF_TOGGLE },
    hospitalizaciones:{ ...DEF_TOGGLE },
    surgeries:        { ...DEF_TOGGLE },
    traumaticos:      { ...DEF_TOGGLE },
    transfusions:     { ...DEF_TOGGLE },
    addiction_alcohol: { ...DEF_TOGGLE },
    addiction_tabaco:  { ...DEF_TOGGLE },
    addiction_otras:   { ...DEF_TOGGLE },
    exantematicas:    [],
    exantematica_otra:'',
    infectocontagiosas:[],
    infectocontagiosa_otra: '',
    hepatitis_types:  { a: false, b: false, c: false },
    cd:               makeDefaultCD(),
    implants:         [],
    vaccination:      { status: '', notes: '' },
}

/** Migrate legacy PathologicalHistory data to the new schema on load. */
function migratePatho(raw: Record<string, unknown>): PathologicalHistory {
    const base: PathologicalHistory = {
        ...DEF_PATHO,
        ...(raw as Partial<PathologicalHistory>),
        cd: { ...makeDefaultCD(), ...((raw.cd as Record<string, CDItem>) || {}) },
        exantematicas:  Array.isArray(raw.exantematicas)  ? raw.exantematicas as string[]  : [],
        infectocontagiosas: Array.isArray(raw.infectocontagiosas) ? raw.infectocontagiosas as string[] : [],
        hepatitis_types: (raw.hepatitis_types as { a: boolean; b: boolean; c: boolean }) ?? { a: false, b: false, c: false },
    }
    // Migrate old diabetes → cd
    const legDiab = raw.diabetes as ToggleItem | undefined
    if (legDiab?.present && !base.cd.diabetes_mellitus?.present) {
        base.cd.diabetes_mellitus = { present: true, year: '', details: legDiab.details || '' }
    }
    // Migrate old hypertension → cd
    const legHtn = raw.hypertension as ToggleItem | undefined
    if (legHtn?.present && !base.cd.hipertension_arterial?.present) {
        base.cd.hipertension_arterial = { present: true, year: '', details: legHtn.details || '' }
    }
    // Migrate old hepatitis → infectocontagiosas + hepatitis_types
    const legHep = raw.hepatitis as HepatitisItem | undefined
    if (legHep && (legHep.a || legHep.b || legHep.c)) {
        if (!base.infectocontagiosas.includes('Hepatitis')) {
            base.infectocontagiosas = [...base.infectocontagiosas, 'Hepatitis']
        }
        base.hepatitis_types = {
            a: legHep.a || base.hepatitis_types.a,
            b: legHep.b || base.hepatitis_types.b,
            c: legHep.c || base.hepatitis_types.c,
        }
    }
    return base
}

const DEF_NON_PATHO: NonPathologicalHistory = {
    smoking: { present: false, frequency: '', details: '' },
    alcohol: { present: false, frequency_per_week: '', cups_per_day: '', details: '' },
    drugs: { ...DEF_TOGGLE },
    exercise: { present: false, frequency: '', details: '' },
}

const DEF_GYNECO: GynecologicalHistory = {
    applicable: false,
    menarche: '',
    gestations: '',
    births: '',
    cesareans: '',
    abortions: '',
    stillbirths: '',
    ectopics: '',
    last_gestation_date: '',
    still_menstruating: false,
    duration_days: '',
    frequency_days: '',
    irregular_cycles: false,
    contraceptives: { ...DEF_TOGGLE },
    last_period_date: '',
    pregnant: false,
    gestational_age: '',
    probable_birth_date: '',
    trimester: '',
    details: '',
}

function makeDefault(patientId: string): FormData {
    return {
        patient_id: patientId,
        allergies: '',
        referral_source: '',
        consultation_reason: '',
        patient_observations: '',
        family_history: { ...DEF_FAMILY },
        pathological_history: { ...DEF_PATHO },
        non_pathological_history: { ...DEF_NON_PATHO },
        gynecological_history: { ...DEF_GYNECO },
        systems_review: '',
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function strToChips(s: string): string[] {
    if (!s || !s.trim()) return []
    return s.split(/,\s*/).map(c => c.trim()).filter(Boolean)
}

function chipsToStr(chips: string[]): string {
    return chips.join(', ')
}

// ── Mini UI components ────────────────────────────────────────────────────────

function SectionCard({ title, children, defaultOpen = true, readOnly = false }: {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
    readOnly?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
                <span className="text-sm font-bold text-gray-800">{title}</span>
                {open
                    ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                    : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                }
            </button>
            {open && (
                <div className={`px-5 pb-5 pt-4 border-t border-gray-100 space-y-4 ${readOnly ? 'pointer-events-none select-none [&_.view-toggle]:pointer-events-auto' : ''}`}>
                    {children}
                </div>
            )}
        </div>
    )
}

function TextAreaField({ label, value, onChange, placeholder = 'Escribe más detalles aquí...', rows = 2 }: {
    label?: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    rows?: number
}) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-xs font-semibold text-gray-500">{label}</label>}
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none resize-none bg-gray-50/50"
            />
        </div>
    )
}

function TextField({ label, value, onChange, placeholder = '', type = 'text' }: {
    label?: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    type?: string
}) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-xs font-semibold text-gray-500">{label}</label>}
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none bg-gray-50/50"
            />
        </div>
    )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#33C7BE]' : 'bg-gray-200'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </label>
    )
}

// ChipInput: suggestion pills + custom text input → string[]
function ChipInput({ label, value, onChange, suggestions }: {
    label?: string
    value: string[]
    onChange: (v: string[]) => void
    suggestions: string[]
}) {
    const [inputVal, setInputVal] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const toggle = (chip: string) => {
        if (value.includes(chip)) {
            onChange(value.filter(c => c !== chip))
        } else {
            onChange([...value, chip])
        }
    }

    const addCustom = () => {
        const trimmed = inputVal.trim()
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed])
        }
        setInputVal('')
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addCustom()
        }
        if (e.key === 'Backspace' && !inputVal && value.length) {
            onChange(value.slice(0, -1))
        }
    }

    return (
        <div className="space-y-2">
            {label && <label className="text-xs font-semibold text-gray-500">{label}</label>}
            {/* Suggestion pills */}
            <div className="flex flex-wrap gap-1.5">
                {suggestions.map(s => {
                    const active = value.includes(s)
                    return (
                        <button
                            key={s}
                            type="button"
                            onClick={() => toggle(s)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${active
                                ? 'bg-[#33C7BE] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {active && <span className="mr-1">✓</span>}{s}
                        </button>
                    )
                })}
            </div>
            {/* Selected custom chips + input */}
            <div className="flex flex-wrap gap-1.5 min-h-[36px] px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus-within:ring-2 focus-within:ring-[#33C7BE]/30">
                {value.filter(v => !suggestions.includes(v)).map(chip => (
                    <span key={chip} className="flex items-center gap-1 px-2 py-0.5 bg-[#33C7BE] text-white text-xs rounded-full">
                        {chip}
                        <button type="button" onClick={() => onChange(value.filter(c => c !== chip))} className="hover:opacity-70">
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addCustom}
                    placeholder={value.length === 0 ? 'Agregar personalizado...' : ''}
                    className="flex-1 min-w-[120px] text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400"
                />
            </div>
            {value.length > 0 && (
                <p className="text-[10px] text-gray-400">
                    {value.join(', ')}
                </p>
            )}
        </div>
    )
}

// FrequencyPills: radio-style pill row
interface FreqOption {
    value: string
    label: string
}

function FrequencyPills({ label, options, value, onChange }: {
    label?: string
    options: FreqOption[]
    value: string
    onChange: (v: string) => void
}) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-xs font-semibold text-gray-500">{label}</label>}
            <div className="flex flex-wrap gap-2">
                {options.map(opt => {
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(active ? '' : opt.value)}
                            className={`px-3 py-1.5 rounded-full text-xs transition-all ${active
                                ? 'bg-[#33C7BE] text-white font-semibold'
                                : 'border border-gray-200 text-gray-600 hover:border-[#33C7BE] bg-white'
                            }`}
                        >
                            {opt.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// Stepper: label + − value +
function Stepper({ label, value, onChange, min = 0 }: {
    label: string
    value: string
    onChange: (v: string) => void
    min?: number
}) {
    const num = parseInt(value || '0', 10)
    const safe = isNaN(num) ? 0 : num

    const decrement = () => {
        const next = Math.max(min, safe - 1)
        onChange(String(next))
    }
    const increment = () => {
        onChange(String(safe + 1))
    }

    return (
        <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 text-center leading-tight">{label}</span>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={decrement}
                    disabled={safe <= min}
                    className="w-8 h-8 rounded-full border border-gray-200 hover:border-[#33C7BE] flex items-center justify-center text-lg font-bold text-gray-500 disabled:opacity-30 transition-colors"
                >
                    −
                </button>
                <span className="w-6 text-center text-sm font-bold text-gray-800">{safe}</span>
                <button
                    type="button"
                    onClick={increment}
                    className="w-8 h-8 rounded-full border border-gray-200 hover:border-[#33C7BE] flex items-center justify-center text-lg font-bold text-gray-500 transition-colors"
                >
                    +
                </button>
            </div>
        </div>
    )
}

// ConditionCard: emoji + label card, click to toggle present
function ConditionCard({ emoji, label, item, onChange, fullWidth = false }: {
    emoji: string
    label: string
    item: ToggleItem
    onChange: (v: ToggleItem) => void
    fullWidth?: boolean
}) {
    return (
        <div className={`flex flex-col gap-2 ${fullWidth ? 'w-full' : ''}`}>
            <button
                type="button"
                onClick={() => onChange({ ...item, present: !item.present })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all w-full ${item.present
                    ? 'border-[#33C7BE] bg-[#33C7BE]/5 text-[#33C7BE]'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
            >
                <span className="text-2xl leading-none">{emoji}</span>
                <span className="text-xs font-semibold text-center leading-tight">{label}</span>
            </button>
            {item.present && (
                <textarea
                    value={item.details}
                    onChange={e => onChange({ ...item, details: e.target.value })}
                    placeholder="Detalles opcionales..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none resize-none bg-gray-50/50"
                />
            )}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClinicalHistoryTab({
    patientId,
    editorId,
    readOnly = false,
}: {
    patientId: string
    editorId: string
    readOnly?: boolean
}) {
    const [data, setData] = useState<FormData>(makeDefault(patientId))
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<string | null>(null)

    // Chip arrays managed as state; synced to string fields on save
    const [allergyItems, setAllergyItems] = useState<AllergyItem[]>([])
    const [newAllergy, setNewAllergy] = useState<{
        open: boolean; search: string; name: string; showDropdown: boolean
        type: AllergyItem['type']; severity: AllergyItem['severity']; reaction: string
    }>({ open: false, search: '', name: '', showDropdown: false, type: 'medicamento', severity: 'leve', reaction: '' })
    const [medicationChips, setMedicationChips] = useState<string[]>([])
    const [otherDiseaseChips, setOtherDiseaseChips] = useState<string[]>([])
    const [drugChips, setDrugChips] = useState<string[]>([])
    const [systemsReview, setSystemsReview] = useState<SystemsReviewData>(makeDefaultSystems())
    const [expandedFH, setExpandedFH] = useState<string[]>([])
    const [activeSystem, setActiveSystem] = useState<SystemKey>('digestivo')

    useEffect(() => {
        setLoading(true)
        getClinicalHistory(patientId)
            .then(existing => {
                if (existing) {
                    const loaded: FormData = {
                        ...makeDefault(patientId),
                        allergies: existing.allergies ?? '',
                        referral_source: existing.referral_source ?? '',
                        consultation_reason: existing.consultation_reason ?? '',
                        patient_observations: existing.patient_observations ?? '',
                        systems_review: existing.systems_review ?? '',
                        family_history: migrateFH((existing.family_history as Record<string, unknown>) || {}),
                        pathological_history: migratePatho((existing.pathological_history as Record<string, unknown>) || {}),
                        non_pathological_history: { ...DEF_NON_PATHO, ...(existing.non_pathological_history || {}) },
                        gynecological_history: { ...DEF_GYNECO, ...(existing.gynecological_history || {}) },
                    }
                    setData(loaded)
                    setAllergyItems(parseAllergies(existing.allergies ?? ''))
                    const ph = loaded.pathological_history
                    setMedicationChips(strToChips(ph.medications?.details ?? ''))
                    setOtherDiseaseChips(strToChips(ph.other_diseases?.details ?? ''))
                    setDrugChips(strToChips(loaded.non_pathological_history.drugs?.details ?? ''))
                    if (existing.updated_at) setLastSaved(existing.updated_at)
                    setSystemsReview(parseSystemsReview(existing.systems_review))
                }
            })
            .catch(e => logger.error('ClinicalHistoryTab.load', e))
            .finally(() => setLoading(false))
    }, [patientId])

const setFH = useCallback((key: string, value: FHMemberRecord) => {
        setData(prev => ({ ...prev, family_history: { ...makeDefaultFH(), ...prev.family_history, [key]: value } }))
    }, [])

    const setPH = useCallback(<K extends keyof PathologicalHistory>(key: K, value: PathologicalHistory[K]) => {
        setData(prev => ({ ...prev, pathological_history: { ...prev.pathological_history, [key]: value } }))
    }, [])

    const setNPH = useCallback(<K extends keyof NonPathologicalHistory>(key: K, value: NonPathologicalHistory[K]) => {
        setData(prev => ({ ...prev, non_pathological_history: { ...prev.non_pathological_history, [key]: value } }))
    }, [])

    const setGH = useCallback(<K extends keyof GynecologicalHistory>(key: K, value: GynecologicalHistory[K]) => {
        setData(prev => ({ ...prev, gynecological_history: { ...prev.gynecological_history, [key]: value } }))
    }, [])

    const setSystemEntry = useCallback((key: SystemKey, patch: Partial<SystemEntry>) => {
        setSystemsReview(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
    }, [])

    const setCDItem = useCallback((key: string, value: CDItem) => {
        setData(prev => ({
            ...prev,
            pathological_history: {
                ...prev.pathological_history,
                cd: { ...(prev.pathological_history.cd || makeDefaultCD()), [key]: value },
            },
        }))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            // Sync chip arrays → string fields before saving
            const saveData: FormData = {
                ...data,
                systems_review: JSON.stringify(systemsReview),
                allergies: allergyItems.length > 0 ? JSON.stringify(allergyItems) : null,
                pathological_history: {
                    ...data.pathological_history,
                    medications: {
                        ...data.pathological_history.medications,
                        present: medicationChips.length > 0,
                        details: chipsToStr(medicationChips),
                    },
                    other_diseases: {
                        ...data.pathological_history.other_diseases,
                        present: otherDiseaseChips.length > 0,
                        details: chipsToStr(otherDiseaseChips),
                    },
                },
                non_pathological_history: {
                    ...data.non_pathological_history,
                    drugs: {
                        ...data.non_pathological_history.drugs,
                        present: data.non_pathological_history.drugs.present,
                        details: chipsToStr(drugChips),
                    },
                },
            }
            const saved = await upsertClinicalHistory({ ...saveData, last_edited_by: editorId })
            if (saved?.updated_at) setLastSaved(saved.updated_at)
            showToast('Historial guardado correctamente', 'success')
        } catch (e) {
            logger.error('ClinicalHistoryTab.save', e)
            showToast('Error al guardar el historial', 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-[#33C7BE] animate-spin" />
            </div>
        )
    }

    const fh = data.family_history
    const ph = data.pathological_history
    const nph = data.non_pathological_history
    const gh = data.gynecological_history

    const SaveBtn = ({ bottom = false }: { bottom?: boolean }) => (
        <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 bg-[#33C7BE] text-white text-sm font-bold rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-all ${bottom ? 'px-6 py-2.5' : 'px-5 py-2'}`}
        >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {bottom ? 'Guardar cambios' : 'Guardar'}
        </button>
    )

    return (
        <div className="w-full space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-[#33C7BE]" />
                    <h2 className="text-base font-black text-gray-900">Historial Clínico</h2>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-3">
                        {lastSaved && (
                            <span className="text-[10px] text-gray-400 hidden sm:block">
                                Guardado {new Date(lastSaved).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <SaveBtn />
                    </div>
                )}
                {readOnly && (
                    <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                        Solo lectura
                    </span>
                )}
            </div>

            {/* Read-only notice */}
            {readOnly && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    <span className="text-base">🔒</span>
                    <span>Estás viendo el historial en modo de solo lectura. El paciente debe autorizar la edición desde su apartado de Permisos.</span>
                </div>
            )}

            <div>

            {/* ── 1. Antecedentes Importantes ── */}
            <SectionCard title="Antecedentes Importantes" readOnly={readOnly}>

                {/* ─ Alergias ─ */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-700">Alergias conocidas</p>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => setNewAllergy(prev => ({ ...prev, open: !prev.open }))}
                                className="text-[11px] font-semibold text-[#33C7BE] hover:text-teal-700 flex items-center gap-1"
                            >
                                <span className="text-base leading-none">+</span> Agregar
                            </button>
                        )}
                    </div>

                    {/* Add form */}
                    {newAllergy.open && (
                        <div className="mb-3 p-3 rounded-xl border border-[#33C7BE]/30 bg-teal-50/30 space-y-2">
                            {/* Search / select allergen */}
                            <div className="relative">
                                {newAllergy.name ? (
                                    /* Selected state */
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#33C7BE] bg-white">
                                        <span className="text-sm">{ALLERGY_TYPES.find(t => t.key === newAllergy.type)?.icon}</span>
                                        <span className="flex-1 text-sm font-semibold text-gray-800">{newAllergy.name}</span>
                                        <button type="button" onClick={() => setNewAllergy(prev => ({ ...prev, name: '', search: '', showDropdown: false }))}
                                            className="text-gray-300 hover:text-red-400 transition-colors">
                                            <X size={13} />
                                        </button>
                                    </div>
                                ) : (
                                    /* Search input */
                                    <div>
                                        <input
                                            type="text"
                                            autoFocus
                                            value={newAllergy.search}
                                            onChange={e => setNewAllergy(prev => ({ ...prev, search: e.target.value, showDropdown: true }))}
                                            onFocus={() => setNewAllergy(prev => ({ ...prev, showDropdown: true }))}
                                            onBlur={() => setTimeout(() => setNewAllergy(prev => ({ ...prev, showDropdown: false })), 150)}
                                            placeholder="Buscar alérgeno (Penicilina, Mariscos, Polen...)"
                                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none bg-white"
                                        />
                                        {newAllergy.showDropdown && (
                                            <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                                                {(() => {
                                                    const q = newAllergy.search.toLowerCase()
                                                    const matches = ALLERGEN_DB.filter(a => !q || a.name.toLowerCase().includes(q))
                                                    return (
                                                        <>
                                                            {matches.length > 0 ? matches.map(a => {
                                                                const typeInfo = ALLERGY_TYPES.find(t => t.key === a.type)!
                                                                return (
                                                                    <button
                                                                        key={a.name}
                                                                        type="button"
                                                                        onMouseDown={() => setNewAllergy(prev => ({
                                                                            ...prev, name: a.name, search: a.name,
                                                                            type: a.type, showDropdown: false,
                                                                        }))}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                                                    >
                                                                        <span className="text-sm flex-shrink-0">{typeInfo.icon}</span>
                                                                        <span className="flex-1 text-xs text-gray-800">{a.name}</span>
                                                                        <span className="text-[10px] text-gray-400">{typeInfo.label}</span>
                                                                    </button>
                                                                )
                                                            }) : (
                                                                <div className="px-3 py-2 text-xs text-gray-400">Sin resultados — escribe para agregar personalizado</div>
                                                            )}
                                                            {/* Allow custom entry */}
                                                            {newAllergy.search && !ALLERGEN_DB.find(a => a.name.toLowerCase() === newAllergy.search.toLowerCase()) && (
                                                                <button
                                                                    type="button"
                                                                    onMouseDown={() => setNewAllergy(prev => ({ ...prev, name: prev.search, showDropdown: false }))}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-teal-50 border-t border-gray-100 transition-colors"
                                                                >
                                                                    <span className="text-xs text-[#33C7BE] font-semibold">+ Agregar "{newAllergy.search}"</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Type selector (shown after name selected) */}
                            {newAllergy.name && (
                                <>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ALLERGY_TYPES.map(t => (
                                            <button key={t.key} type="button"
                                                onClick={() => setNewAllergy(prev => ({ ...prev, type: t.key }))}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${newAllergy.type === t.key ? 'bg-[#33C7BE] text-white' : 'border border-gray-200 text-gray-500 bg-white'}`}
                                            >
                                                <span>{t.icon}</span>{t.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-1.5">
                                        {ALLERGY_SEVERITY.map(s => (
                                            <button key={s.key} type="button"
                                                onClick={() => setNewAllergy(prev => ({ ...prev, severity: s.key }))}
                                                className={`flex-1 py-1 rounded-full text-[11px] font-bold border transition-all ${newAllergy.severity === s.key ? s.color : 'border-gray-200 text-gray-400 bg-white'}`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={newAllergy.reaction}
                                        onChange={e => setNewAllergy(prev => ({ ...prev, reaction: e.target.value }))}
                                        placeholder="Tipo de reacción (urticaria, angioedema, anafilaxia...)"
                                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllergyItems(prev => [...prev, {
                                                id: Date.now().toString(),
                                                name: newAllergy.name.trim(),
                                                type: newAllergy.type,
                                                severity: newAllergy.severity,
                                                reaction: newAllergy.reaction.trim(),
                                            }])
                                            setNewAllergy({ open: false, search: '', name: '', showDropdown: false, type: 'medicamento', severity: 'leve', reaction: '' })
                                        }}
                                        className="w-full py-1.5 bg-[#33C7BE] text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors"
                                    >
                                        Guardar alergia
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Allergy list */}
                    {allergyItems.length > 0 ? (
                        <div className="space-y-2">
                            {allergyItems.map(item => {
                                const typeInfo = ALLERGY_TYPES.find(t => t.key === item.type)!
                                const sevInfo = ALLERGY_SEVERITY.find(s => s.key === item.severity)!
                                return (
                                    <div key={item.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-white">
                                        <span className="text-lg leading-none mt-0.5 flex-shrink-0">{typeInfo.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 leading-tight">{item.name}</p>
                                            {item.reaction && <p className="text-[11px] text-gray-500 mt-0.5">{item.reaction}</p>}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 self-start ${sevInfo.color}`}>
                                            {sevInfo.label}
                                        </span>
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => setAllergyItems(prev => prev.filter(a => a.id !== item.id))}
                                                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 self-start mt-0.5"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-xl">Sin alergias registradas</p>
                    )}
                </div>

                {/* ─ Implantes y dispositivos ─ */}
                <div className="pt-1">
                    <p className="text-xs font-bold text-gray-700 mb-2">Implantes y dispositivos médicos</p>
                    <div className="flex flex-wrap gap-1.5">
                        {IMPLANTS_LIST.map(implant => {
                            const active = (ph.implants ?? []).includes(implant)
                            return (
                                <button
                                    key={implant}
                                    type="button"
                                    onClick={() => setPH('implants', active
                                        ? ph.implants.filter(i => i !== implant)
                                        : [...(ph.implants ?? []), implant]
                                    )}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active
                                        ? 'bg-violet-500 text-white shadow-sm'
                                        : 'border border-gray-200 text-gray-500 hover:border-violet-300 bg-white'
                                    }`}
                                >
                                    {implant}
                                </button>
                            )
                        })}
                    </div>
                </div>


            </SectionCard>

            {/* ── 2. Antecedentes Familiares ── */}
            <SectionCard title="Antecedentes Familiares" defaultOpen={false} readOnly={readOnly}>
                <div className="space-y-2">
                    {FAMILY_MEMBERS.map(m => {
                        const record: FHMemberRecord = (fh[m.key] as FHMemberRecord | undefined) ?? { diseases: [], notes: '' }
                        const count = record.diseases.length
                        const hasAny = count > 0
                        const isExpanded = readOnly ? hasAny : expandedFH.includes(m.key)

                        return (
                            <div key={m.key} className={`rounded-xl border transition-all overflow-hidden ${hasAny ? 'border-teal-200' : 'border-gray-100'}`}>
                                {/* Card header — tap to expand */}
                                <button
                                    type="button"
                                    onClick={() => setExpandedFH(prev =>
                                        prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key]
                                    )}
                                    className={`view-toggle w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${hasAny ? 'bg-teal-50/40 hover:bg-teal-50/60' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    <span className="text-xl leading-none">{m.icon}</span>
                                    <span className={`flex-1 text-sm font-semibold ${hasAny ? 'text-gray-800' : 'text-gray-500'}`}>{m.label}</span>
                                    {hasAny && (
                                        <span className="text-[11px] font-bold text-[#33C7BE] bg-teal-100 px-2 py-0.5 rounded-full">
                                            {count} {count === 1 ? 'enf.' : 'enf.'}
                                        </span>
                                    )}
                                    <ChevronDown
                                        size={14}
                                        className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Expanded: disease checklist + notes */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-3">
                                            {FH_DISEASES.map(({ key: dKey, label }) => {
                                                const checked = record.diseases.includes(dKey)
                                                return (
                                                    <label key={dKey} className="flex items-start gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => setFH(m.key, {
                                                                ...record,
                                                                diseases: checked
                                                                    ? record.diseases.filter(d => d !== dKey)
                                                                    : [...record.diseases, dKey],
                                                            })}
                                                            className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded accent-[#33C7BE]"
                                                        />
                                                        <span className={`text-xs leading-tight ${checked ? 'text-gray-800 font-semibold' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                                            {label}
                                                        </span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                        <input
                                            type="text"
                                            value={record.notes}
                                            onChange={e => setFH(m.key, { ...record, notes: e.target.value })}
                                            placeholder="Notas: edades de diagnóstico, tratamientos..."
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none bg-gray-50/50 placeholder:text-gray-300"
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </SectionCard>

            {/* ── 3. A. Personales Patológicos ── */}
            <SectionCard title="A. Personales Patológicos" defaultOpen={false} readOnly={readOnly}>

                {/* Medicamentos actuales */}
                <ChipInput
                    label="Medicamentos actuales"
                    value={medicationChips}
                    onChange={setMedicationChips}
                    suggestions={['Metformina', 'Losartán', 'Atorvastatina', 'Omeprazol', 'Levotiroxina', 'Amlodipino', 'Enalapril', 'Aspirina', 'Paracetamol', 'Ibuprofeno', 'Insulina', 'Warfarina']}
                />

                {/* ─ Antecedentes previos ─ */}
                <div className="pt-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Antecedentes previos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ANTECEDENTES_PREVIOS.map(({ key, label, emoji }) => (
                            <ConditionCard
                                key={key}
                                emoji={emoji}
                                label={label}
                                item={(ph[key as keyof PathologicalHistory] as ToggleItem) ?? DEF_TOGGLE}
                                onChange={v => setPH(key as keyof PathologicalHistory, v as PathologicalHistory[typeof key])}
                            />
                        ))}
                    </div>
                </div>

                {/* ─ Adicciones ─ */}
                <div className="pt-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Adicciones</p>
                    <div className="space-y-2">
                        {([
                            { key: 'addiction_alcohol' as const, label: 'Alcoholismo' },
                            { key: 'addiction_tabaco'  as const, label: 'Tabaquismo' },
                            { key: 'addiction_otras'   as const, label: 'Otras sustancias psicoactivas' },
                        ]).map(({ key, label }) => (
                            <div key={key} className={`rounded-xl border p-3 transition-all ${ph[key].present ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-white'}`}>
                                <Toggle
                                    label={label}
                                    checked={ph[key].present}
                                    onChange={v => setPH(key, { ...ph[key], present: v })}
                                />
                                {ph[key].present && (
                                    <div className="mt-2">
                                        <TextAreaField
                                            value={ph[key].details}
                                            onChange={v => setPH(key, { ...ph[key], details: v })}
                                            placeholder="Sustancia, frecuencia, cantidad, tiempo..."
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─ Patologías por contagio ─ */}
                <div className="pt-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Patologías por contagio</p>

                    {/* Exantemáticas */}
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Exantemáticas</p>
                        <div className="flex flex-wrap gap-2">
                            {EXANTEMATICAS_LIST.map(disease => {
                                const active = ph.exantematicas.includes(disease)
                                return (
                                    <button
                                        key={disease}
                                        type="button"
                                        onClick={() => setPH('exantematicas', active
                                            ? ph.exantematicas.filter(d => d !== disease)
                                            : [...ph.exantematicas, disease]
                                        )}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active
                                            ? 'bg-rose-500 text-white'
                                            : 'border border-gray-200 text-gray-600 hover:border-rose-300 bg-white'
                                        }`}
                                    >
                                        {disease}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="mt-2">
                            <input
                                type="text"
                                value={ph.exantematica_otra}
                                onChange={e => setPH('exantematica_otra', e.target.value)}
                                placeholder="Otra exantemática..."
                                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Infectocontagiosas */}
                    <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Infectocontagiosas</p>
                        <div className="flex flex-wrap gap-2">
                            {INFECTOCONTAGIOSAS_LIST.map(disease => {
                                const active = ph.infectocontagiosas.includes(disease)
                                return (
                                    <button
                                        key={disease}
                                        type="button"
                                        onClick={() => setPH('infectocontagiosas', active
                                            ? ph.infectocontagiosas.filter(d => d !== disease)
                                            : [...ph.infectocontagiosas, disease]
                                        )}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active
                                            ? 'bg-orange-500 text-white'
                                            : 'border border-gray-200 text-gray-600 hover:border-orange-300 bg-white'
                                        }`}
                                    >
                                        {disease}
                                    </button>
                                )
                            })}
                        </div>
                        {ph.infectocontagiosas.includes('Hepatitis') && (
                            <div className="mt-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl flex flex-wrap gap-5">
                                {(['a', 'b', 'c'] as const).map(t => (
                                    <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ph.hepatitis_types[t]}
                                            onChange={e => setPH('hepatitis_types', { ...ph.hepatitis_types, [t]: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded accent-orange-500"
                                        />
                                        <span className="text-xs text-gray-700 font-medium">Hepatitis {t.toUpperCase()}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        <div className="mt-2">
                            <input
                                type="text"
                                value={ph.infectocontagiosa_otra}
                                onChange={e => setPH('infectocontagiosa_otra', e.target.value)}
                                placeholder="Otra infectocontagiosa..."
                                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* ─ Enfermedades Crónico-Degenerativas ─ */}
                <div className="pt-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Enf. Crónico-Degenerativas</p>
                    <div className="space-y-1.5">
                        {CD_DISEASES.map(({ key, label }) => {
                            const item = (ph.cd?.[key]) ?? { present: false, year: '', details: '' }
                            return (
                                <div key={key} className={`rounded-xl border transition-all ${item.present ? 'border-teal-200 bg-teal-50/30' : 'border-gray-100 bg-white'}`}>
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setCDItem(key, { ...item, present: !item.present })}
                                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center ${item.present ? 'bg-[#33C7BE] border-[#33C7BE]' : 'border-gray-300'}`}
                                        >
                                            {item.present && <span className="text-white text-[10px] font-bold">✓</span>}
                                        </button>
                                        <span className={`text-sm flex-1 leading-tight ${item.present ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{label}</span>
                                        {item.present && (
                                            <input
                                                type="text"
                                                value={item.year}
                                                onChange={e => setCDItem(key, { ...item, year: e.target.value })}
                                                placeholder="Año"
                                                maxLength={4}
                                                className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none"
                                            />
                                        )}
                                    </div>
                                    {item.present && (
                                        <div className="px-3 pb-3">
                                            <TextAreaField
                                                value={item.details}
                                                onChange={v => setCDItem(key, { ...item, details: v })}
                                                placeholder="Detalles, tratamiento, evolución..."
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

            </SectionCard>

            {/* ── 4. A. Personales NO Patológicos ── */}
            <SectionCard title="A. Personales NO Patológicos" defaultOpen={false} readOnly={readOnly}>
                <FrequencyPills
                    label="Tabaquismo"
                    options={[
                        { value: 'never', label: 'No fumador' },
                        { value: 'ex', label: 'Ex-fumador' },
                        { value: 'occasional', label: 'Ocasional' },
                        { value: 'moderate', label: 'Moderado' },
                        { value: 'heavy', label: 'Fuerte' },
                    ]}
                    value={nph.smoking.frequency}
                    onChange={v => setNPH('smoking', {
                        ...nph.smoking,
                        frequency: v,
                        present: v !== 'never' && v !== '',
                    })}
                />

                <div className="space-y-3">
                    <Toggle
                        label="Toma bebidas alcohólicas"
                        checked={nph.alcohol.present}
                        onChange={v => setNPH('alcohol', { ...nph.alcohol, present: v })}
                    />
                    {nph.alcohol.present && (
                        <div className="flex justify-around pt-1 pb-2 px-2 bg-gray-50 rounded-xl border border-gray-100">
                            <Stepper
                                label="Veces / semana"
                                value={nph.alcohol.frequency_per_week}
                                onChange={v => setNPH('alcohol', { ...nph.alcohol, frequency_per_week: v })}
                            />
                            <div className="w-px bg-gray-200 self-stretch" />
                            <Stepper
                                label="Copas / día"
                                value={nph.alcohol.cups_per_day}
                                onChange={v => setNPH('alcohol', { ...nph.alcohol, cups_per_day: v })}
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <Toggle
                        label="Consume drogas"
                        checked={nph.drugs.present}
                        onChange={v => setNPH('drugs', { ...nph.drugs, present: v })}
                    />
                    {nph.drugs.present && (
                        <ChipInput
                            value={drugChips}
                            onChange={setDrugChips}
                            suggestions={['Marihuana', 'Cocaína', 'Alcohol en exceso', 'Tabaco', 'Benzodiacepinas', 'Opioides', 'Otros']}
                        />
                    )}
                </div>

                <FrequencyPills
                    label="Ejercicio"
                    options={[
                        { value: 'never', label: 'No hace' },
                        { value: 'occasional', label: 'Ocasional' },
                        { value: 'regular', label: 'Regular (3x/sem)' },
                        { value: 'daily', label: 'Diario' },
                    ]}
                    value={nph.exercise.frequency}
                    onChange={v => setNPH('exercise', {
                        ...nph.exercise,
                        frequency: v,
                        present: v !== 'never' && v !== '',
                    })}
                />
            </SectionCard>

            {/* ── 5. A. Ginecológicos ── */}
            <SectionCard title="A. Ginecológicos" defaultOpen={false} readOnly={readOnly}>
                <Toggle
                    label="Aplica a este paciente"
                    checked={gh.applicable}
                    onChange={v => setGH('applicable', v)}
                />

                {gh.applicable && (
                    <div className="space-y-4 pt-1">
                        <TextField
                            label="Menarca (edad)"
                            value={gh.menarche}
                            onChange={v => setGH('menarche', v)}
                            placeholder="Edad de la primera menstruación"
                        />

                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-3">Gestas</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 justify-items-center bg-gray-50 rounded-xl p-4 border border-gray-100">
                                {([
                                    ['gestations', 'Gestaciones'],
                                    ['births', 'Partos'],
                                    ['cesareans', 'Cesáreas'],
                                    ['abortions', 'Abortos'],
                                    ['stillbirths', 'Óbitos'],
                                    ['ectopics', 'Ectópicos'],
                                ] as [keyof GynecologicalHistory, string][]).map(([key, label]) => (
                                    <Stepper
                                        key={key}
                                        label={label}
                                        value={gh[key] as string}
                                        onChange={v => setGH(key, v)}
                                    />
                                ))}
                            </div>
                        </div>

                        <TextField
                            label="Fecha de última gestación"
                            value={gh.last_gestation_date}
                            onChange={v => setGH('last_gestation_date', v)}
                            type="date"
                        />

                        <Toggle
                            label="Continúa menstruando"
                            checked={gh.still_menstruating}
                            onChange={v => setGH('still_menstruating', v)}
                        />
                        {gh.still_menstruating && (
                            <div className="space-y-3">
                                <div className="flex justify-around py-3 px-2 bg-gray-50 rounded-xl border border-gray-100">
                                    <Stepper
                                        label="Duración (días)"
                                        value={gh.duration_days}
                                        onChange={v => setGH('duration_days', v)}
                                    />
                                    <div className="w-px bg-gray-200 self-stretch" />
                                    <Stepper
                                        label="Frecuencia (días)"
                                        value={gh.frequency_days}
                                        onChange={v => setGH('frequency_days', v)}
                                    />
                                </div>
                                <Toggle
                                    label="Ciclos menstruales irregulares"
                                    checked={gh.irregular_cycles}
                                    onChange={v => setGH('irregular_cycles', v)}
                                />
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">Anticonceptivos</p>
                            <ConditionCard
                                emoji="💊"
                                label="Anticonceptivos"
                                item={gh.contraceptives}
                                onChange={v => setGH('contraceptives', v)}
                                fullWidth
                            />
                        </div>

                        <TextField
                            label="Fecha Última Regla"
                            value={gh.last_period_date}
                            onChange={v => setGH('last_period_date', v)}
                            type="date"
                        />

                        <Toggle
                            label="Embarazo actual"
                            checked={gh.pregnant}
                            onChange={v => setGH('pregnant', v)}
                        />
                        {gh.pregnant && (
                            <div className="space-y-3 pl-1">
                                <TextField
                                    label="Semanas de gestación"
                                    value={gh.gestational_age}
                                    onChange={v => setGH('gestational_age', v)}
                                    placeholder="Semanas"
                                />
                                <TextField
                                    label="Fecha probable de parto"
                                    value={gh.probable_birth_date}
                                    onChange={v => setGH('probable_birth_date', v)}
                                    type="date"
                                />
                                <FrequencyPills
                                    label="Trimestre"
                                    options={[
                                        { value: '1', label: '1er trimestre' },
                                        { value: '2', label: '2do trimestre' },
                                        { value: '3', label: '3er trimestre' },
                                    ]}
                                    value={gh.trimester}
                                    onChange={v => setGH('trimester', v)}
                                />
                            </div>
                        )}

                        <TextAreaField
                            label="Observaciones ginecológicas"
                            value={gh.details}
                            onChange={v => setGH('details', v)}
                        />
                    </div>
                )}
            </SectionCard>

            {/* ── 6. Interrogatorio por Aparatos y Sistemas ── */}
            <SectionCard title="Interrogatorio por Aparatos y Sistemas" defaultOpen={false} readOnly={readOnly}>
                {/* "Mark all normal" shortcut */}
                <div className="flex items-center justify-between -mt-1 mb-3">
                    <p className="text-[11px] text-gray-400">Selecciona un sistema para registrar hallazgos.</p>
                    <button
                        type="button"
                        onClick={() => {
                            const allNormal = makeDefaultSystems()
                            SYSTEMS_CONFIG.forEach(s => { allNormal[s.key] = { normal: true, symptoms: [], notes: '' } })
                            setSystemsReview(allNormal)
                        }}
                        className="text-[11px] font-semibold text-green-600 hover:text-green-700 flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                    >
                        <span className="text-xs">✓</span> Todo normal
                    </button>
                </div>

                {/* System grid — 3 columns */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {SYSTEMS_CONFIG.map(({ key, short, icon }) => {
                        const entry = systemsReview[key]
                        const hasFindings = entry.symptoms.length > 0
                        const isNormal = entry.normal && !hasFindings
                        const isSelected = activeSystem === key
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveSystem(key)}
                                className={`view-toggle relative flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border-2 transition-all ${
                                    isSelected
                                        ? hasFindings  ? 'border-amber-400 bg-amber-50 shadow-md scale-[1.03]'
                                        : isNormal     ? 'border-green-400 bg-green-50 shadow-md scale-[1.03]'
                                                       : 'border-[#33C7BE] bg-teal-50 shadow-md scale-[1.03]'
                                        : hasFindings  ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                                        : isNormal     ? 'border-green-200 bg-green-50/50 hover:border-green-300'
                                                       : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <span className="text-xl leading-none">{icon}</span>
                                <span className={`text-[10px] font-semibold text-center leading-tight px-1 ${isSelected || hasFindings || isNormal ? 'text-gray-800' : 'text-gray-500'}`}>
                                    {short}
                                </span>
                                {/* Status badge */}
                                {hasFindings && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                                        {entry.symptoms.length}
                                    </span>
                                )}
                                {isNormal && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm">✓</span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Detail panel for selected system */}
                {(() => {
                    const cfg = SYSTEMS_CONFIG.find(s => s.key === activeSystem)!
                    const entry = systemsReview[activeSystem]
                    const hasFindings = entry.symptoms.length > 0
                    const isNormal = entry.normal && !hasFindings
                    return (
                        <div className={`rounded-2xl border-2 p-4 transition-all ${
                            hasFindings ? 'border-amber-200 bg-amber-50/20'
                            : isNormal  ? 'border-green-200 bg-green-50/20'
                                        : 'border-gray-100 bg-white'
                        }`}>
                            {/* Panel header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl leading-none">{cfg.icon}</span>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 leading-tight">{cfg.label}</p>
                                        {hasFindings && (
                                            <p className="text-[10px] text-amber-600 font-semibold">{entry.symptoms.length} hallazgos</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSystemEntry(activeSystem, { normal: !entry.normal, symptoms: [], notes: '' })}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex-shrink-0 ${isNormal
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'border border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600 bg-white'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isNormal ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    Normal
                                </button>
                            </div>

                            {/* Symptom chips */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {cfg.symptoms.map(symptom => {
                                    const active = entry.symptoms.includes(symptom)
                                    return (
                                        <button
                                            key={symptom}
                                            type="button"
                                            onClick={() => {
                                                const next = active
                                                    ? entry.symptoms.filter(s => s !== symptom)
                                                    : [...entry.symptoms, symptom]
                                                setSystemEntry(activeSystem, { symptoms: next, normal: false })
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active
                                                ? 'bg-amber-400 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {symptom}
                                        </button>
                                    )
                                })}
                            </div>

                            {hasFindings && (
                                <textarea
                                    value={entry.notes}
                                    onChange={e => setSystemEntry(activeSystem, { notes: e.target.value })}
                                    placeholder="Detalles de los hallazgos..."
                                    rows={2}
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none resize-none bg-white"
                                />
                            )}
                        </div>
                    )
                })()}
            </SectionCard>

            </div>

            {/* Save bottom */}
            {!readOnly && (
                <div className="flex justify-end pb-4">
                    <SaveBtn bottom />
                </div>
            )}
        </div>
    )
}
