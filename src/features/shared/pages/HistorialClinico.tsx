import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, ShieldCheck, Plus, Pencil, ChevronDown, ChevronUp, Trash, Save, Loader2, Info, X as XIcon } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthContext'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { getPatientProfile, upsertPatientProfile } from '@/features/patient/services/patientProfile'

// ── Suggestion catalogues ─────────────────────────────────────────────────────

const ALLERGEN_SUGGESTIONS: { name: string; icon: string }[] = [
  // Medicamentos
  { name: 'Penicilina', icon: '💊' }, { name: 'Amoxicilina', icon: '💊' },
  { name: 'Cefalosporinas', icon: '💊' }, { name: 'Sulfonamidas', icon: '💊' },
  { name: 'Aspirina', icon: '💊' }, { name: 'Ibuprofeno', icon: '💊' },
  { name: 'Naproxeno', icon: '💊' }, { name: 'Diclofenaco', icon: '💊' },
  { name: 'Metamizol', icon: '💊' }, { name: 'Paracetamol', icon: '💊' },
  { name: 'Codeína', icon: '💊' }, { name: 'Morfina', icon: '💊' },
  { name: 'Contraste yodado', icon: '💊' }, { name: 'Anestesia local', icon: '💊' },
  { name: 'Lidocaína', icon: '💊' }, { name: 'Látex', icon: '💊' },
  { name: 'Ciprofloxacino', icon: '💊' }, { name: 'Claritromicina', icon: '💊' },
  { name: 'Azitromicina', icon: '💊' }, { name: 'Tetraciclinas', icon: '💊' },
  // Alimentos
  { name: 'Mariscos', icon: '🍎' }, { name: 'Camarones', icon: '🍎' },
  { name: 'Pescado', icon: '🍎' }, { name: 'Nueces', icon: '🍎' },
  { name: 'Cacahuates / Maní', icon: '🍎' }, { name: 'Almendras', icon: '🍎' },
  { name: 'Leche de vaca', icon: '🍎' }, { name: 'Huevo', icon: '🍎' },
  { name: 'Trigo / Gluten', icon: '🍎' }, { name: 'Soya', icon: '🍎' },
  { name: 'Fresa', icon: '🍎' }, { name: 'Kiwi', icon: '🍎' },
  { name: 'Mango', icon: '🍎' }, { name: 'Sulfitos / Conservadores', icon: '🍎' },
  // Ambientales
  { name: 'Polen (gramíneas)', icon: '🌿' }, { name: 'Polen (árboles)', icon: '🌿' },
  { name: 'Ácaros del polvo', icon: '🌿' }, { name: 'Polvo doméstico', icon: '🌿' },
  { name: 'Pelo de gato', icon: '🌿' }, { name: 'Pelo de perro', icon: '🌿' },
  { name: 'Moho / Hongos', icon: '🌿' }, { name: 'Níquel', icon: '🌿' },
  { name: 'Fragancias / Perfumes', icon: '🌿' },
]

const CONDITION_SUGGESTIONS: { name: string; icon: string }[] = [
  { name: 'Diabetes Mellitus tipo 1', icon: '🔴' },
  { name: 'Diabetes Mellitus tipo 2', icon: '🔴' },
  { name: 'Hipertensión arterial', icon: '🔴' },
  { name: 'Dislipidemias', icon: '🔴' },
  { name: 'Obesidad', icon: '🔴' },
  { name: 'Hipotiroidismo', icon: '🔴' },
  { name: 'Hipertiroidismo', icon: '🔴' },
  { name: 'Asma', icon: '🔴' },
  { name: 'EPOC', icon: '🔴' },
  { name: 'Artritis reumatoide', icon: '🔴' },
  { name: 'Lupus eritematoso sistémico', icon: '🔴' },
  { name: 'Enfermedad renal crónica', icon: '🔴' },
  { name: 'Insuficiencia cardíaca', icon: '🔴' },
  { name: 'Fibrilación auricular', icon: '🔴' },
  { name: 'Epilepsia', icon: '🔴' },
  { name: 'Migraña', icon: '🔴' },
  { name: 'Depresión', icon: '🔴' },
  { name: 'Ansiedad', icon: '🔴' },
  { name: 'Gastritis crónica', icon: '🔴' },
  { name: 'Colon irritable', icon: '🔴' },
  { name: 'Enfermedad de Crohn', icon: '🔴' },
  { name: 'Colitis ulcerosa', icon: '🔴' },
  { name: 'Hepatitis B crónica', icon: '🔴' },
  { name: 'Hepatitis C crónica', icon: '🔴' },
  { name: 'Osteoartritis', icon: '🔴' },
  { name: 'Osteoporosis', icon: '🔴' },
  { name: 'Anemia crónica', icon: '🔴' },
  { name: 'VIH / SIDA', icon: '🔴' },
  { name: 'Psoriasis', icon: '🔴' },
  { name: 'Dermatitis atópica', icon: '🔴' },
]

const MEDICATION_SUGGESTIONS: { name: string; icon: string }[] = [
  // Cardiovascular / HTA
  { name: 'Losartán 50 mg', icon: '💊' }, { name: 'Losartán 100 mg', icon: '💊' },
  { name: 'Enalapril 10 mg', icon: '💊' }, { name: 'Amlodipino 5 mg', icon: '💊' },
  { name: 'Amlodipino 10 mg', icon: '💊' }, { name: 'Metoprolol 50 mg', icon: '💊' },
  { name: 'Atenolol 50 mg', icon: '💊' }, { name: 'Hidroclorotiazida 25 mg', icon: '💊' },
  { name: 'Espironolactona 25 mg', icon: '💊' }, { name: 'Furosemida 40 mg', icon: '💊' },
  // Diabetes
  { name: 'Metformina 500 mg', icon: '💊' }, { name: 'Metformina 850 mg', icon: '💊' },
  { name: 'Metformina 1000 mg', icon: '💊' }, { name: 'Glibenclamida 5 mg', icon: '💊' },
  { name: 'Insulina NPH', icon: '💊' }, { name: 'Insulina glargina', icon: '💊' },
  { name: 'Sitagliptina 100 mg', icon: '💊' }, { name: 'Empagliflozina 10 mg', icon: '💊' },
  // Colesterol / Lípidos
  { name: 'Atorvastatina 10 mg', icon: '💊' }, { name: 'Atorvastatina 20 mg', icon: '💊' },
  { name: 'Atorvastatina 40 mg', icon: '💊' }, { name: 'Rosuvastatina 10 mg', icon: '💊' },
  { name: 'Simvastatina 20 mg', icon: '💊' }, { name: 'Ezetimiba 10 mg', icon: '💊' },
  // Tiroides
  { name: 'Levotiroxina 25 mcg', icon: '💊' }, { name: 'Levotiroxina 50 mcg', icon: '💊' },
  { name: 'Levotiroxina 100 mcg', icon: '💊' },
  // Analgésicos / AINES
  { name: 'Paracetamol 500 mg', icon: '💊' }, { name: 'Paracetamol 1 g', icon: '💊' },
  { name: 'Ibuprofeno 400 mg', icon: '💊' }, { name: 'Ibuprofeno 600 mg', icon: '💊' },
  { name: 'Naproxeno 250 mg', icon: '💊' }, { name: 'Naproxeno 500 mg', icon: '💊' },
  { name: 'Diclofenaco 50 mg', icon: '💊' }, { name: 'Ketorolaco 10 mg', icon: '💊' },
  // Gástrico / GI
  { name: 'Omeprazol 20 mg', icon: '💊' }, { name: 'Omeprazol 40 mg', icon: '💊' },
  { name: 'Pantoprazol 40 mg', icon: '💊' }, { name: 'Ranitidina 150 mg', icon: '💊' },
  // Antibióticos
  { name: 'Amoxicilina 500 mg', icon: '💊' }, { name: 'Azitromicina 500 mg', icon: '💊' },
  { name: 'Ciprofloxacino 500 mg', icon: '💊' }, { name: 'Claritromicina 500 mg', icon: '💊' },
  // Psiquiátrico / Neurológico
  { name: 'Sertralina 50 mg', icon: '💊' }, { name: 'Fluoxetina 20 mg', icon: '💊' },
  { name: 'Escitalopram 10 mg', icon: '💊' }, { name: 'Alprazolam 0.5 mg', icon: '💊' },
  { name: 'Clonazepam 0.5 mg', icon: '💊' }, { name: 'Carbamazepina 200 mg', icon: '💊' },
  { name: 'Ácido valproico 500 mg', icon: '💊' }, { name: 'Topiramato 25 mg', icon: '💊' },
  // Respiratorio
  { name: 'Salbutamol inhalador', icon: '💊' }, { name: 'Budesonida inhalador', icon: '💊' },
  { name: 'Montelukast 10 mg', icon: '💊' }, { name: 'Loratadina 10 mg', icon: '💊' },
  { name: 'Cetirizina 10 mg', icon: '💊' }, { name: 'Fexofenadina 120 mg', icon: '💊' },
]

// ── TagInput component ────────────────────────────────────────────────────────

interface TagInputProps {
  value: string
  onChange: (v: string) => void
  suggestions: { name: string; icon: string }[]
  placeholder?: string
  tagClass?: string
}

function TagInput({ value, onChange, suggestions, placeholder, tagClass }: TagInputProps) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const tags = value.split(',').map(s => s.trim()).filter(Boolean)

  const filtered = input.length > 0
    ? suggestions.filter(s =>
        s.name.toLowerCase().includes(input.toLowerCase()) &&
        !tags.map(t => t.toLowerCase()).includes(s.name.toLowerCase())
      ).slice(0, 7)
    : []

  const commitTag = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (tags.map(t => t.toLowerCase()).includes(trimmed.toLowerCase())) {
      setInput('')
      setOpen(false)
      return
    }
    onChange([...tags, trimmed].join(', '))
    setInput('')
    setOpen(false)
    setFocusedIdx(-1)
  }, [tags, onChange])

  const removeTag = useCallback((idx: number) => {
    onChange(tags.filter((_, i) => i !== idx).join(', '))
  }, [tags, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIdx >= 0 && filtered[focusedIdx]) {
        commitTag(filtered[focusedIdx].name)
      } else if (input.trim()) {
        commitTag(input.trim())
      }
    } else if ((e.key === ',' || e.key === 'Tab') && input.trim()) {
      e.preventDefault()
      commitTag(input.trim())
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags.length - 1)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setFocusedIdx(-1)
    }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setFocusedIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1.5 min-h-[44px] px-3 py-2 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#33C7BE]/40 focus-within:border-[#33C7BE] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${tagClass ?? 'bg-teal-50 text-teal-700 border border-teal-200'}`}
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(i) }}
              className="ml-0.5 hover:text-red-500 transition-colors"
              aria-label={`Eliminar ${tag}`}
            >
              <XIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); setFocusedIdx(-1) }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (input) setOpen(true) }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent py-0.5"
        />
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {filtered.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={e => { e.preventDefault(); commitTag(s.name) }}
              className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors ${i === focusedIdx ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span>{s.icon}</span>
              <span>{s.name}</span>
            </button>
          ))}
          {input.trim() && !filtered.some(s => s.name.toLowerCase() === input.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); commitTag(input.trim()) }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-500 hover:bg-gray-50 border-t border-gray-100"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              Agregar "<span className="font-semibold text-gray-700">{input.trim()}</span>"
            </button>
          )}
        </div>
      )}
      {open && filtered.length === 0 && input.trim().length > 0 && (
        <div ref={dropdownRef} className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); commitTag(input.trim()) }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-500 hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0" />
            Agregar "<span className="font-semibold text-gray-700">{input.trim()}</span>"
          </button>
        </div>
      )}
    </div>
  )
}
import { PatientProfile, PatientInsurance, BiometricRecord } from '@/shared/types/database'
import {
  getMyInsurances,
  upsertInsurance,
  deleteInsurance,
  updateInsurance,
  INSURANCE_PROVIDERS,
  HOLDER_RELATIONSHIPS,
  COVERAGE_TYPES,
  insuranceDisplayName,
} from '@/shared/lib/queries/insurance'
import { getBiometricHistory, insertBiometricRecord } from '@/shared/lib/queries/biometrics'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

// ── NoteEditForm ─────────────────────────────────────────────────────────────

const NOTE_SNIPPETS = [
  { label: '🤒 Síntoma nuevo',          snippet: 'Síntoma nuevo: ' },
  { label: '❓ Tengo una pregunta',     snippet: 'Quisiera preguntar: ' },
  { label: '😟 Me preocupa algo',       snippet: 'Me preocupa: ' },
  { label: '📅 Desde hace un tiempo',   snippet: 'Desde hace: ' },
  { label: '💉 Reacción a tratamiento', snippet: 'Reacción a tratamiento: ' },
  { label: '😴 Problema para dormir',   snippet: 'Tengo problemas para dormir porque: ' },
]

function NoteEditForm({
  draft, onDraftChange, onSave, onCancel, isSaving,
}: {
  draft: string
  onDraftChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
}) {
  return (
    <div className="space-y-2">
      {/* Quick-prompt chips */}
      <div className="flex flex-wrap gap-1.5">
        {NOTE_SNIPPETS.map(({ label, snippet }) => (
          <button
            key={snippet}
            type="button"
            onClick={() => {
              const prefix = draft && !draft.endsWith('\n') ? '\n' : ''
              onDraftChange(draft + prefix + snippet)
            }}
            className="px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          autoFocus
          rows={4}
          value={draft}
          onChange={e => onDraftChange(e.target.value)}
          placeholder="Escribe síntomas, preguntas o recordatorios…"
          maxLength={1000}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] resize-none"
        />
        <span className={`absolute bottom-2 right-3 text-[10px] ${draft.length > 900 ? 'text-amber-500' : 'text-gray-300'}`}>
          {draft.length}/1000
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition-colors">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !draft.trim()}
          className="inline-flex items-center gap-2 px-5 py-2 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-[#2ab5ac] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><Save className="w-4 h-4" />Guardar nota</>}
        </button>
      </div>
    </div>
  )
}

export default function HistorialClinico() {
  const { user, profile: authProfile } = useAuth()
  const isPatient = authProfile?.role === 'patient'

  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)
  const [biometricHistory, setBiometricHistory] = useState<BiometricRecord[]>([])
  const medicalFormInitialized = useRef(false)

  const [medicalForm, setMedicalForm] = useState({
    height_cm: '' as string | number,
    weight_kg: '' as string | number,
    blood_type: '',
  })
  const [isSavingMedical, setIsSavingMedical] = useState(false)

  // Patient-entered health notes (allergies, chronic conditions, current medications)
  // These fields belong to patient_profiles and are patient-maintained.
  // They are distinct from the clinical history (expediente clínico) which is maintained
  // exclusively by the healthcare professional per NOM-004-SSA3-2012 §7.
  const [healthNotesForm, setHealthNotesForm] = useState({
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    notes_for_doctor: '',
  })
  const healthNotesInitialized = useRef(false)
  const [isSavingHealthNotes, setIsSavingHealthNotes] = useState(false)

  // Personal notes — multi-note list stored as JSON in notes_for_doctor
  interface PersonalNote { id: string; text: string; savedAt: string }

  function parseNotes(raw: string): PersonalNote[] {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length && typeof parsed[0].id === 'string') return parsed
    } catch { /* legacy plain text */ }
    // Legacy: single plain-text string → wrap as one note
    return [{ id: 'legacy', text: raw, savedAt: '' }]
  }

  function serializeNotes(notes: PersonalNote[]): string {
    return notes.length ? JSON.stringify(notes) : ''
  }

  const [personalNotes, setPersonalNotes] = useState<PersonalNote[]>([])
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null) // null = not editing; 'new' = adding
  const [notesDraft, setNotesDraft] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Insurance state
  const [insurances, setInsurances] = useState<PatientInsurance[]>([])
  const [showInsuranceForm, setShowInsuranceForm] = useState(false)
  const [editingInsurance, setEditingInsurance] = useState<PatientInsurance | null>(null)
  const [isSavingInsurance, setIsSavingInsurance] = useState(false)
  const [expandedInsurance, setExpandedInsurance] = useState<string | null>(null)
  const [insuranceForm, setInsuranceForm] = useState({
    provider_name: '',
    provider_other: '',
    policy_number: '',
    group_number: '',
    member_id: '',
    holder_name: '',
    holder_relationship: 'self',
    phone_claims: '',
    phone_emergency: '',
    valid_from: '',
    valid_until: '',
    coverage_type: 'individual',
    is_primary: true,
    notes: '',
  })

  useEffect(() => {
    if (!user || !isPatient) return
    getPatientProfile(user.id).then(setPatientProfile).catch(() => {})
    getMyInsurances(user.id).then(setInsurances).catch(() => {})
    getBiometricHistory(user.id).then(setBiometricHistory).catch(() => {})
  }, [user, isPatient])

  useEffect(() => {
    if (patientProfile && !medicalFormInitialized.current) {
      medicalFormInitialized.current = true
      setMedicalForm({
        height_cm: patientProfile.height_cm ?? '',
        weight_kg: patientProfile.weight_kg ?? '',
        blood_type: patientProfile.blood_type ?? '',
      })
    }
    if (patientProfile && !healthNotesInitialized.current) {
      healthNotesInitialized.current = true
      setHealthNotesForm({
        allergies: patientProfile.allergies ?? '',
        chronic_conditions: patientProfile.chronic_conditions ?? '',
        current_medications: patientProfile.current_medications ?? '',
        notes_for_doctor: patientProfile.notes_for_doctor ?? '',
      })
      setPersonalNotes(parseNotes(patientProfile.notes_for_doctor ?? ''))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientProfile])

  const validatePhone = (val: string): boolean => {
    if (!val) return true
    const digits = val.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15
  }

  const sanitizePhone = (val: string): string =>
    val.replace(/[^\d+\s\-()]/g, '').slice(0, 20)

  const handleSavePatientProfile = async (data: object) => {
    if (!user) return
    const updated = await upsertPatientProfile(user.id, data)
    setPatientProfile(updated)
  }

  const handleSaveMedical = async () => {
    if (!user) return
    try {
      setIsSavingMedical(true)
      const heightNum = medicalForm.height_cm !== '' ? Number(medicalForm.height_cm) : null
      const weightNum = medicalForm.weight_kg !== '' ? Number(medicalForm.weight_kg) : null
      await handleSavePatientProfile({
        ...medicalForm,
        height_cm: heightNum,
        weight_kg: weightNum,
      })
      if (heightNum !== null || weightNum !== null || medicalForm.blood_type) {
        const record = await insertBiometricRecord({
          patient_id: user.id,
          recorded_at: new Date().toISOString(),
          height_cm: heightNum,
          weight_kg: weightNum,
          blood_type: medicalForm.blood_type || null,
          notes: null,
        })
        if (record) setBiometricHistory(prev => [record, ...prev])
      }
      showToast('Datos biométricos guardados', 'success')
    } catch (err) {
      logger.error('HistorialClinico:saveMedical', err)
      showToast('Error al guardar datos', 'error')
    } finally {
      setIsSavingMedical(false)
    }
  }

  const handleSaveHealthNotes = async () => {
    if (!user) return
    try {
      setIsSavingHealthNotes(true)
      await handleSavePatientProfile({
        allergies: healthNotesForm.allergies || null,
        chronic_conditions: healthNotesForm.chronic_conditions || null,
        current_medications: healthNotesForm.current_medications || null,
      })
      showToast('Información de salud guardada', 'success')
    } catch (err) {
      logger.error('HistorialClinico:saveHealthNotes', err)
      showToast('Error al guardar', 'error')
    } finally {
      setIsSavingHealthNotes(false)
    }
  }

  const handleSaveNote = async () => {
    if (!user || !notesDraft.trim()) return
    try {
      setIsSavingNote(true)
      let updated: PersonalNote[]
      if (editingNoteId === 'new') {
        const newNote: PersonalNote = {
          id: crypto.randomUUID(),
          text: notesDraft.trim(),
          savedAt: new Date().toISOString(),
        }
        updated = [newNote, ...personalNotes]
      } else {
        updated = personalNotes.map(n =>
          n.id === editingNoteId ? { ...n, text: notesDraft.trim(), savedAt: new Date().toISOString() } : n
        )
      }
      const serialized = serializeNotes(updated)
      await handleSavePatientProfile({ notes_for_doctor: serialized || null })
      setPersonalNotes(updated)
      setHealthNotesForm(f => ({ ...f, notes_for_doctor: serialized }))
      setEditingNoteId(null)
      setNotesDraft('')
      showToast('Nota guardada', 'success')
    } catch (err) {
      logger.error('HistorialClinico:saveNote', err)
      showToast('Error al guardar nota', 'error')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleDeleteNote = async (id: string) => {
    if (!user) return
    const updated = personalNotes.filter(n => n.id !== id)
    const serialized = serializeNotes(updated)
    await handleSavePatientProfile({ notes_for_doctor: serialized || null })
    setPersonalNotes(updated)
    setHealthNotesForm(f => ({ ...f, notes_for_doctor: serialized }))
  }

  const resetInsuranceForm = () => setInsuranceForm({
    provider_name: '', provider_other: '', policy_number: '', group_number: '',
    member_id: '', holder_name: '', holder_relationship: 'self', phone_claims: '',
    phone_emergency: '', valid_from: '', valid_until: '', coverage_type: 'individual',
    is_primary: true, notes: '',
  })

  const openNewInsuranceForm = () => {
    resetInsuranceForm()
    setEditingInsurance(null)
    setShowInsuranceForm(true)
  }

  const openEditInsuranceForm = (ins: PatientInsurance) => {
    setEditingInsurance(ins)
    setInsuranceForm({
      provider_name: ins.provider_name,
      provider_other: ins.provider_other || '',
      policy_number: ins.policy_number || '',
      group_number: ins.group_number || '',
      member_id: ins.member_id || '',
      holder_name: ins.holder_name || '',
      holder_relationship: ins.holder_relationship || 'self',
      phone_claims: ins.phone_claims || '',
      phone_emergency: ins.phone_emergency || '',
      valid_from: ins.valid_from || '',
      valid_until: ins.valid_until || '',
      coverage_type: ins.coverage_type || 'individual',
      is_primary: ins.is_primary,
      notes: ins.notes || '',
    })
    setShowInsuranceForm(true)
  }

  const handleSaveInsurance = async () => {
    if (!user || !insuranceForm.provider_name) return
    if (!validatePhone(insuranceForm.phone_emergency)) {
      showToast('Tel. urgencias inválido (10–15 dígitos)', 'error')
      return
    }
    if (!validatePhone(insuranceForm.phone_claims)) {
      showToast('Tel. reclamaciones inválido (10–15 dígitos)', 'error')
      return
    }
    setIsSavingInsurance(true)
    try {
      const payload = {
        ...insuranceForm,
        provider_other: insuranceForm.provider_name === 'Otro' ? insuranceForm.provider_other || null : null,
        policy_number: insuranceForm.policy_number || null,
        group_number: insuranceForm.group_number || null,
        member_id: insuranceForm.member_id || null,
        holder_name: insuranceForm.holder_name || null,
        phone_claims: insuranceForm.phone_claims || null,
        phone_emergency: insuranceForm.phone_emergency || null,
        valid_from: insuranceForm.valid_from || null,
        valid_until: insuranceForm.valid_until || null,
        notes: insuranceForm.notes || null,
      }
      if (editingInsurance) {
        await updateInsurance(editingInsurance.id, payload)
      } else {
        await upsertInsurance(user.id, payload)
        await upsertPatientProfile(user.id, {
          insurance_provider: insuranceForm.provider_name === 'Otro'
            ? (insuranceForm.provider_other || null)
            : insuranceForm.provider_name,
        })
      }
      const updated = await getMyInsurances(user.id)
      setInsurances(updated)
      setShowInsuranceForm(false)
      resetInsuranceForm()
      setEditingInsurance(null)
      showToast('Seguro guardado', 'success')
    } catch (err) {
      logger.error('HistorialClinico:saveInsurance', err)
      showToast('Error al guardar seguro', 'error')
    } finally {
      setIsSavingInsurance(false)
    }
  }

  const handleDeleteInsurance = async (id: string) => {
    if (!confirm('¿Eliminar este seguro?')) return
    const { ok } = await deleteInsurance(id)
    if (ok) {
      setInsurances(prev => prev.filter(i => i.id !== id))
      showToast('Seguro eliminado', 'success')
    }
  }

  if (!isPatient) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
          <p className="text-gray-500 text-sm">Esta sección es solo para pacientes.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F8F9FB] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Historial Clínico</h1>
            <p className="text-sm text-gray-500">Tu información médica, seguros y antecedentes</p>
          </div>

          {/* Datos biométricos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#33C7BE]" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Datos biométricos</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Altura (cm)</label>
                <input type="number" min={0} max={300} value={medicalForm.height_cm} onChange={e => setMedicalForm(f => ({ ...f, height_cm: e.target.value }))} placeholder="170" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Peso (kg)</label>
                <input type="number" min={0} max={500} value={medicalForm.weight_kg} onChange={e => setMedicalForm(f => ({ ...f, weight_kg: e.target.value }))} placeholder="70" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo de sangre</label>
                <select value={medicalForm.blood_type} onChange={e => setMedicalForm(f => ({ ...f, blood_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] bg-white">
                  <option value="">--</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveMedical} disabled={isSavingMedical} className="inline-flex items-center gap-2 px-5 py-2 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-[#2ab5ac] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                {isSavingMedical ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><Save className="w-4 h-4" />Guardar</>}
              </button>
            </div>

            {biometricHistory.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Historial de medidas</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {biometricHistory.map((rec) => {
                    const date = new Date(rec.recorded_at).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                    return (
                      <div key={rec.id} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg text-xs">
                        <span className="text-gray-400 w-24 flex-shrink-0">{date}</span>
                        <div className="flex items-center gap-3 flex-wrap">
                          {rec.height_cm !== null && (
                            <span className="text-gray-700"><span className="text-gray-400">Altura:</span> {rec.height_cm} cm</span>
                          )}
                          {rec.weight_kg !== null && (
                            <span className="text-gray-700"><span className="text-gray-400">Peso:</span> {rec.weight_kg} kg</span>
                          )}
                          {rec.blood_type && (
                            <span className="text-gray-700"><span className="text-gray-400">Sangre:</span> {rec.blood_type}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Seguro médico */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Seguro médico</h3>
              </div>
              {!showInsuranceForm && (
                <button
                  onClick={openNewInsuranceForm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#33C7BE] border border-[#33C7BE]/30 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              )}
            </div>

            {insurances.length === 0 && !showInsuranceForm && (
              <p className="text-sm text-gray-400 text-center py-4">No has registrado seguros médicos.</p>
            )}

            {insurances.map((ins) => {
              const isExpanded = expandedInsurance === ins.id
              const displayName = insuranceDisplayName(ins)
              return (
                <div key={ins.id} className="border border-gray-200 rounded-xl mb-3 overflow-hidden">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                        <p className="text-[11px] text-gray-400">{ins.policy_number ? `Póliza: ${ins.policy_number}` : 'Sin número de póliza'}</p>
                      </div>
                      {ins.is_primary && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Principal</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEditInsuranceForm(ins)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteInsurance(ins.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setExpandedInsurance(isExpanded ? null : ins.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-3 bg-gray-50 grid grid-cols-2 gap-2 text-xs">
                      {ins.member_id && <div><span className="text-gray-400">ID Miembro:</span> <span className="font-semibold text-gray-700">{ins.member_id}</span></div>}
                      {ins.group_number && <div><span className="text-gray-400">Grupo:</span> <span className="font-semibold text-gray-700">{ins.group_number}</span></div>}
                      {ins.holder_name && <div><span className="text-gray-400">Titular:</span> <span className="font-semibold text-gray-700">{ins.holder_name}</span></div>}
                      {ins.coverage_type && <div><span className="text-gray-400">Cobertura:</span> <span className="font-semibold text-gray-700">{COVERAGE_TYPES.find(c => c.value === ins.coverage_type)?.label || ins.coverage_type}</span></div>}
                      {ins.valid_until && <div><span className="text-gray-400">Vigencia:</span> <span className="font-semibold text-gray-700">hasta {ins.valid_until}</span></div>}
                      {ins.phone_emergency && <div><span className="text-gray-400">Tel. urgencias:</span> <span className="font-semibold text-gray-700">{ins.phone_emergency}</span></div>}
                      {ins.phone_claims && <div><span className="text-gray-400">Tel. reclamaciones:</span> <span className="font-semibold text-gray-700">{ins.phone_claims}</span></div>}
                      {ins.notes && <div className="col-span-2"><span className="text-gray-400">Notas:</span> <span className="font-semibold text-gray-700">{ins.notes}</span></div>}
                    </div>
                  )}
                </div>
              )
            })}

            {showInsuranceForm && (
              <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/30 space-y-3 mt-3">
                <p className="text-xs font-bold text-gray-700">{editingInsurance ? 'Editar seguro' : 'Nuevo seguro'}</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Aseguradora *</label>
                  <select value={insuranceForm.provider_name} onChange={e => setInsuranceForm(f => ({ ...f, provider_name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]">
                    <option value="">Seleccionar aseguradora</option>
                    {INSURANCE_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {insuranceForm.provider_name === 'Otro' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre de la aseguradora</label>
                    <input type="text" value={insuranceForm.provider_other} onChange={e => setInsuranceForm(f => ({ ...f, provider_other: e.target.value }))} placeholder="Nombre" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Núm. póliza</label>
                    <input type="text" value={insuranceForm.policy_number} onChange={e => setInsuranceForm(f => ({ ...f, policy_number: e.target.value }))} placeholder="Ej: GNP-123456" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ID Miembro / Afiliado</label>
                    <input type="text" value={insuranceForm.member_id} onChange={e => setInsuranceForm(f => ({ ...f, member_id: e.target.value }))} placeholder="Núm. afiliado" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Núm. grupo</label>
                    <input type="text" value={insuranceForm.group_number} onChange={e => setInsuranceForm(f => ({ ...f, group_number: e.target.value }))} placeholder="Grupo" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de cobertura</label>
                    <select value={insuranceForm.coverage_type} onChange={e => setInsuranceForm(f => ({ ...f, coverage_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]">
                      {COVERAGE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del titular</label>
                    <input type="text" value={insuranceForm.holder_name} onChange={e => setInsuranceForm(f => ({ ...f, holder_name: e.target.value }))} placeholder="Nombre del titular" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Relación con titular</label>
                    <select value={insuranceForm.holder_relationship} onChange={e => setInsuranceForm(f => ({ ...f, holder_relationship: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]">
                      {HOLDER_RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Vigencia desde</label>
                    <input type="date" value={insuranceForm.valid_from} onChange={e => setInsuranceForm(f => ({ ...f, valid_from: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Vigencia hasta</label>
                    <input type="date" value={insuranceForm.valid_until} onChange={e => setInsuranceForm(f => ({ ...f, valid_until: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tel. urgencias</label>
                    <input type="tel" value={insuranceForm.phone_emergency} onChange={e => setInsuranceForm(f => ({ ...f, phone_emergency: sanitizePhone(e.target.value) }))} placeholder="8001234567" maxLength={20} className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] ${insuranceForm.phone_emergency && !validatePhone(insuranceForm.phone_emergency) ? 'border-red-400' : 'border-gray-200'}`} />
                    {insuranceForm.phone_emergency && !validatePhone(insuranceForm.phone_emergency) && (
                      <p className="text-[11px] text-red-500 mt-1">Debe tener 10–15 dígitos</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tel. reclamaciones</label>
                    <input type="tel" value={insuranceForm.phone_claims} onChange={e => setInsuranceForm(f => ({ ...f, phone_claims: sanitizePhone(e.target.value) }))} placeholder="8001234567" maxLength={20} className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] ${insuranceForm.phone_claims && !validatePhone(insuranceForm.phone_claims) ? 'border-red-400' : 'border-gray-200'}`} />
                    {insuranceForm.phone_claims && !validatePhone(insuranceForm.phone_claims) && (
                      <p className="text-[11px] text-red-500 mt-1">Debe tener 10–15 dígitos</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Notas adicionales</label>
                  <textarea value={insuranceForm.notes} onChange={e => setInsuranceForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Coberturas especiales, restricciones, etc." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] resize-none" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_primary" checked={insuranceForm.is_primary} onChange={e => setInsuranceForm(f => ({ ...f, is_primary: e.target.checked }))} className="accent-[#33C7BE]" />
                  <label htmlFor="is_primary" className="text-xs font-semibold text-gray-600">Seguro principal</label>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => { setShowInsuranceForm(false); setEditingInsurance(null); resetInsuranceForm() }} disabled={isSavingInsurance} className="px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100">Cancelar</button>
                  <button onClick={handleSaveInsurance} disabled={isSavingInsurance || !insuranceForm.provider_name} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-[#2ab5ac] disabled:opacity-50 transition-colors">
                    {isSavingInsurance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notas de salud — patient-maintained fields (NOM-004-SSA3-2012 §7) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#33C7BE]" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Notas de salud</h3>
              </div>
              <p className="text-xs text-gray-400 ml-9">
                Escribe o selecciona de la lista. Presiona <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> o <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">,</kbd> para agregar. Haz clic en ✕ para quitar.
              </p>
            </div>

            <div className="p-5 space-y-5">
              {/* Alergias */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-base">⚠️</span>
                  <label className="text-xs font-bold text-gray-700">Alergias conocidas</label>
                  <span className="text-[10px] text-gray-400">(medicamentos, alimentos, ambientales)</span>
                </div>
                <TagInput
                  value={healthNotesForm.allergies}
                  onChange={v => setHealthNotesForm(f => ({ ...f, allergies: v }))}
                  suggestions={ALLERGEN_SUGGESTIONS}
                  placeholder="Buscar o escribir alergia…"
                  tagClass="bg-red-50 text-red-700 border border-red-200"
                />
              </div>

              {/* Condiciones crónicas */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-base">🔴</span>
                  <label className="text-xs font-bold text-gray-700">Condiciones crónicas</label>
                  <span className="text-[10px] text-gray-400">(diagnósticos que ya tienes)</span>
                </div>
                <TagInput
                  value={healthNotesForm.chronic_conditions}
                  onChange={v => setHealthNotesForm(f => ({ ...f, chronic_conditions: v }))}
                  suggestions={CONDITION_SUGGESTIONS}
                  placeholder="Buscar o escribir condición…"
                  tagClass="bg-orange-50 text-orange-700 border border-orange-200"
                />
              </div>

              {/* Medicamentos */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-base">💊</span>
                  <label className="text-xs font-bold text-gray-700">Medicamentos actuales</label>
                  <span className="text-[10px] text-gray-400">(incluye dosis si la conoces)</span>
                </div>
                <TagInput
                  value={healthNotesForm.current_medications}
                  onChange={v => setHealthNotesForm(f => ({ ...f, current_medications: v }))}
                  suggestions={MEDICATION_SUGGESTIONS}
                  placeholder="Buscar o escribir medicamento…"
                  tagClass="bg-blue-50 text-blue-700 border border-blue-200"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveHealthNotes}
                  disabled={isSavingHealthNotes}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-[#2ab5ac] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSavingHealthNotes
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                    : <><Save className="w-4 h-4" />Guardar cambios</>}
                </button>
              </div>
            </div>
          </div>

          {/* Mis notas — multi-note list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📝</span>
                  <h3 className="text-sm font-bold text-gray-900">Mis notas</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 ml-7">
                  Anota síntomas, preguntas o recordatorios para tu próxima consulta.
                </p>
              </div>
              {editingNoteId === null && (
                <button
                  onClick={() => { setNotesDraft(''); setEditingNoteId('new') }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#33C7BE] border border-[#33C7BE]/30 rounded-lg hover:bg-teal-50 transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar nota
                </button>
              )}
            </div>

            <div className="p-5 space-y-3">
              {/* ── NEW NOTE FORM (shown at top when adding) ── */}
              {editingNoteId === 'new' && (
                <NoteEditForm
                  draft={notesDraft}
                  onDraftChange={setNotesDraft}
                  onSave={handleSaveNote}
                  onCancel={() => { setEditingNoteId(null); setNotesDraft('') }}
                  isSaving={isSavingNote}
                />
              )}

              {/* ── NOTE LIST ── */}
              {personalNotes.length === 0 && editingNoteId !== 'new' ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No tienes notas guardadas aún.</p>
                  <p className="text-xs text-gray-300 mt-1">Usa el botón "Agregar nota" para empezar.</p>
                </div>
              ) : (
                personalNotes.map(note => (
                  <div key={note.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    {editingNoteId === note.id ? (
                      /* ── INLINE EDIT ── */
                      <div className="p-4">
                        <NoteEditForm
                          draft={notesDraft}
                          onDraftChange={setNotesDraft}
                          onSave={handleSaveNote}
                          onCancel={() => { setEditingNoteId(null); setNotesDraft('') }}
                          isSaving={isSavingNote}
                        />
                      </div>
                    ) : (
                      /* ── VIEW ── */
                      <div className="p-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {note.text}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                          {note.savedAt ? (
                            <span className="text-[11px] text-gray-300">
                              {new Date(note.savedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : <span />}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setNotesDraft(note.text); setEditingNoteId(note.id) }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* NOM-004 notice — expediente clínico belongs to the healthcare institution */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-0.5">
              <p className="font-semibold">Expediente clínico</p>
              <p>
                El expediente clínico detallado — incluyendo antecedentes familiares, patológicos,
                ginecológicos, psiquiátricos, revisión por aparatos y sistemas, y notas médicas —
                es elaborado y resguardado exclusivamente por tu médico conforme a la
                <strong> NOM-004-SSA3-2012 §7</strong>. Para solicitar una copia de tu expediente,
                comunícate directamente con tu establecimiento de salud.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
