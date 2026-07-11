import { useState, useEffect } from 'react'
import { Plus, Trash2, FlaskConical, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  getStudyResultsByAppointment,
  createStudyResult,
  deleteStudyResult,
  STUDY_TIPO_LABEL,
  STUDY_TIPO_COLOR,
  type StudyResult,
  type StudyTipo,
} from '@/shared/lib/queries/studyResults'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const TIPOS: StudyTipo[] = [
  'laboratorio',
  'radiografia',
  'tomografia',
  'ultrasonido',
  'resonancia',
  'ecg',
  'otro',
]

// ── Add Form ─────────────────────────────────────────────────────────────────

function AddStudyForm({
  appointmentId,
  patientId,
  onSaved,
  onCancel,
}: {
  appointmentId: string
  patientId: string
  onSaved: (s: StudyResult) => void
  onCancel: () => void
}) {
  const [tipo, setTipo] = useState<StudyTipo>('laboratorio')
  const [nombre, setNombre] = useState('')
  const [interpretacion, setInterpretacion] = useState('')
  const [fecha, setFecha] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!interpretacion.trim()) return
    if (tipo === 'otro' && !nombre.trim()) return
    setSaving(true)
    try {
      const result = await createStudyResult({
        appointment_id: appointmentId,
        patient_id: patientId,
        tipo,
        nombre: nombre || undefined,
        interpretacion,
        fecha_estudio: fecha || null,
      })
      if (!result) throw new Error('null')
      onSaved(result)
      showToast('Estudio registrado', 'success')
    } catch (err) {
      logger.error('StudyResultsSection.save', err)
      showToast('Error al guardar el estudio', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-dashed border-[#33C7BE]/40 bg-teal-50/30 rounded-2xl p-4 space-y-3">
      {/* Tipo + Fecha row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as StudyTipo)
              setNombre('')
            }}
            className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {STUDY_TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Fecha del estudio
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
          />
        </div>
      </div>

      {/* Nombre / Tipo personalizado */}
      <div>
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          {tipo === 'otro' ? (
            <>
              Tipo de estudio <span className="text-red-400">*</span>
            </>
          ) : (
            'Nombre del estudio (opcional)'
          )}
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={
            tipo === 'otro'
              ? 'Ej. Espirometría, Densitometría ósea, Audiometría…'
              : 'Ej. Biometría hemática, Rx Tórax PA…'
          }
          autoFocus={tipo === 'otro'}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
        />
      </div>

      {/* Interpretación */}
      <div>
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          Interpretación / hallazgos *
        </label>
        <textarea
          value={interpretacion}
          onChange={(e) => setInterpretacion(e.target.value)}
          placeholder="Ej. Hemoglobina 11.2 g/dL (↓ leve anemia), Glucosa 118 mg/dL…"
          rows={4}
          autoFocus
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30 leading-relaxed"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!interpretacion.trim() || (tipo === 'otro' && !nombre.trim()) || saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#33C7BE] text-white text-sm font-bold rounded-xl hover:bg-teal-600 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Guardar estudio
        </button>
      </div>
    </div>
  )
}

// ── Study Card ────────────────────────────────────────────────────────────────

function StudyCard({
  study,
  readOnly,
  onDelete,
}: {
  study: StudyResult
  readOnly: boolean
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(true)

  async function handleDelete() {
    setDeleting(true)
    const ok = await deleteStudyResult(study.id)
    if (ok) {
      onDelete()
      showToast('Estudio eliminado', 'success')
    } else {
      showToast('Error al eliminar', 'error')
    }
    setDeleting(false)
    setConfirming(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STUDY_TIPO_COLOR[study.tipo]}`}
        >
          {STUDY_TIPO_LABEL[study.tipo]}
        </span>
        {study.nombre && (
          <p className="text-sm font-semibold text-gray-800 truncate flex-1">{study.nombre}</p>
        )}
        {study.fecha_estudio && (
          <span className="text-[10px] text-gray-400 font-medium ml-auto shrink-0">
            {new Date(study.fecha_estudio + 'T12:00:00').toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-300 hover:text-gray-500 transition-colors ml-1"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {study.interpretacion}
          </p>
          {!readOnly && (
            <div className="flex justify-end pt-1">
              {confirming ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">¿Eliminar?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="font-bold text-red-500 hover:text-red-700"
                  >
                    {deleting ? <Loader2 size={11} className="animate-spin" /> : 'Sí'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="font-bold text-gray-400 hover:text-gray-600"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="p-1 text-gray-200 hover:text-red-400 transition-colors rounded"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Section ──────────────────────────────────────────────────────────────

export default function StudyResultsSection({
  appointmentId,
  patientId,
  readOnly = false,
}: {
  appointmentId: string
  patientId: string
  readOnly?: boolean
}) {
  const [studies, setStudies] = useState<StudyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    getStudyResultsByAppointment(appointmentId)
      .then((data) => {
        setStudies(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [appointmentId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-400">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs">Cargando estudios…</span>
      </div>
    )
  }

  if (readOnly && studies.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <FlaskConical size={12} className="text-blue-500" />
          </div>
          <p className="text-sm font-bold text-gray-800">Estudios y laboratorios</p>
          {studies.length > 0 && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
              {studies.length}
            </span>
          )}
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-bold text-[#33C7BE] hover:text-teal-600 transition-colors"
          >
            <Plus size={13} /> Agregar
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <AddStudyForm
          appointmentId={appointmentId}
          patientId={patientId}
          onSaved={(s) => {
            setStudies((prev) => [...prev, s])
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* List */}
      {studies.length === 0 && !showForm ? (
        <p className="text-xs text-gray-400 text-center py-3">
          {readOnly
            ? 'Sin estudios registrados en esta consulta.'
            : 'Sin estudios registrados aún.'}
        </p>
      ) : (
        <div className="space-y-2">
          {studies.map((s) => (
            <StudyCard
              key={s.id}
              study={s}
              readOnly={readOnly}
              onDelete={() => setStudies((prev) => prev.filter((x) => x.id !== s.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
