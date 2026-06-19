import { useState, useEffect, useRef } from 'react'
import {
  Stethoscope, Activity, ClipboardList, FlaskConical,
  Pill, ChevronDown, ChevronUp, Loader2, Lock,
  Plus, Save, FileText, X, Search, CheckCircle2, Zap,
} from 'lucide-react'
import { saveNotaEvolucion, createAddenda } from '@/shared/lib/queries/notasEvolucion'
import type { NotaEvolucion, NotaEvolucionInput, DiagnosticoCIE10 } from '@/shared/lib/queries/notasEvolucion'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { searchCie10Es } from '@/shared/data/cie10-es'

// ── CIE-10 inline autocomplete ────────────────────────────────────────────────

interface Cie10Result { code: string; description: string }

interface Cie10RowProps {
  index: number
  codigo: string
  descripcion: string
  canRemove: boolean
  onChange: (field: 'codigo' | 'descripcion', val: string) => void
  onSelect: (code: string, description: string) => void
  onRemove: () => void
}

function Cie10Row({ index, codigo, descripcion, canRemove, onChange, onSelect, onRemove }: Cie10RowProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const results: Cie10Result[] = searchQuery.trim().length >= 2
    ? searchCie10Es(searchQuery).map(e => ({ code: e.code, description: e.desc }))
    : []

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSearch(val: string) {
    setSearchQuery(val)
    setOpen(val.trim().length >= 2)
  }

  function pick(r: Cie10Result) {
    onSelect(r.code, r.description)
    setSearchQuery('')
    setOpen(false)
  }

  return (
    <div className="flex items-start gap-2 group">
      {/* Badge tipo */}
      <span className={`mt-2 text-[9px] font-bold w-14 shrink-0 uppercase tracking-wide ${index === 0 ? 'text-violet-600' : 'text-gray-400'}`}>
        {index === 0 ? 'Principal' : `Sec. ${index}`}
      </span>

      <div className="flex-1 space-y-1.5">
        {/* Selected code + description */}
        {(codigo || descripcion) && (
          <div className="flex gap-2">
            <input
              value={codigo}
              onChange={e => onChange('codigo', e.target.value.toUpperCase())}
              placeholder="Código"
              maxLength={10}
              className="w-20 shrink-0 px-2.5 py-1.5 border border-violet-200 bg-violet-50 rounded-lg text-xs font-mono font-bold text-violet-700 focus:ring-2 focus:ring-violet-300 focus:outline-none transition-colors uppercase"
            />
            <input
              value={descripcion}
              onChange={e => onChange('descripcion', e.target.value)}
              placeholder="Descripción del diagnóstico"
              className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-primary/25 focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Search box */}
        <div ref={wrapRef} className="relative">
          <div className="flex items-center border border-dashed border-gray-300 bg-gray-50 rounded-lg overflow-hidden focus-within:border-violet-300 focus-within:bg-white focus-within:border-solid transition-all">
            <Search size={12} className="ml-2.5 text-gray-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setOpen(true)}
              placeholder={codigo ? 'Cambiar código CIE-10…' : 'Buscar código o diagnóstico en español…'}
              className="flex-1 px-2 py-1.5 text-xs bg-transparent focus:outline-none"
            />
          </div>
          {open && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {results.map(r => (
                <button
                  key={r.code}
                  type="button"
                  onMouseDown={() => pick(r)}
                  className="w-full flex items-baseline gap-2 px-3 py-2 text-left hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <span className="text-[10px] font-mono font-bold text-violet-700 shrink-0 w-14">{r.code}</span>
                  <span className="text-xs text-gray-600">{r.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {canRemove && (
        <button type="button" onClick={onRemove}
          className="mt-2 p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// ── Normal exam presets ───────────────────────────────────────────────────────

const EXAM_PRESETS: Array<{ label: string; text: string }> = [
  {
    label: 'Examen normal',
    text: 'Paciente en buen estado general, consciente y orientado en tiempo, lugar y persona. Cabeza y cuello: normocéfalo, sin adenopatías cervicales, tiroides sin alteraciones. Cardiopulmonar: ruidos cardíacos rítmicos de buena intensidad, sin soplos audibles; campos pulmonares con murmullo vesicular presente y simétrico, sin estertores ni sibilancias. Abdomen: blando, depresible, sin dolor a la palpación superficial ni profunda, sin visceromegalias, peristalsis presente. Extremidades: sin edema, llenado capilar menor a 2 segundos, pulsos periféricos presentes y simétricos.',
  },
  {
    label: 'Sin alteraciones relevantes',
    text: 'Exploración física sin hallazgos de relevancia clínica. Signos vitales dentro de parámetros normales. Sin datos de focalización neurológica. Resto de exploración sin particularidades.',
  },
  {
    label: 'Control crónico',
    text: 'Paciente en regular estado general, acude a control de padecimiento crónico. Peso estable. Sin datos de descompensación aguda al momento de la exploración. Extremidades: sin edema. Llenado capilar normal.',
  },
]

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  appointmentId: string
  patientId: string
  existing?: NotaEvolucion | null
  onSaved?: (nota: NotaEvolucion) => void
}

// ── Shared subcomponents ─────────────────────────────────────────────────────

function VitalInput({
  label, unit, value, onChange, placeholder,
}: {
  label: string; unit: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
        <input
          type="number" step="any" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '—'}
          className="flex-1 px-2.5 py-2 text-sm bg-transparent focus:outline-none min-w-0"
        />
        <span className="px-2 text-[11px] text-gray-400 font-medium bg-gray-50 border-l border-gray-100 h-full flex items-center py-2 shrink-0">
          {unit}
        </span>
      </div>
    </div>
  )
}

/** Colored SOAP section with header, optional toolbar, textarea */
function SoapSection({
  icon, label, color, bgColor, value, onChange, placeholder, rows = 4, toolbar,
}: {
  icon: React.ReactNode; label: string; color: string; bgColor: string
  value: string; onChange: (v: string) => void; placeholder: string; rows?: number
  toolbar?: React.ReactNode
}) {
  const hasContent = value.trim().length > 0
  return (
    <div className={`rounded-2xl border ${hasContent ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50/50'} transition-all`}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${hasContent ? 'border-gray-100' : 'border-transparent'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-1 h-5 rounded-full ${color}`} />
          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
            {icon}
            {label}
          </label>
          {hasContent && <CheckCircle2 size={11} className={`${bgColor} opacity-60`} />}
        </div>
        {toolbar}
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-sm bg-transparent focus:outline-none resize-none leading-relaxed text-gray-800 placeholder:text-gray-300"
      />
    </div>
  )
}

// ── Read-only view ────────────────────────────────────────────────────────────

function NotaEvolucionReadonly({ nota, onAddenda }: { nota: NotaEvolucion; onAddenda: (nota: NotaEvolucion) => void }) {
  const [expanded, setExpanded] = useState(true)
  const [addendaText, setAddendaText] = useState('')
  const [savingAddenda, setSavingAddenda] = useState(false)
  const [addendas, setAddendas] = useState(nota.notas_evolucion_addenda ?? [])

  const hasVitals = nota.ta_sistolica || nota.frecuencia_cardiaca || nota.temperatura || nota.peso_kg

  async function handleAddenda() {
    if (!addendaText.trim()) return
    setSavingAddenda(true)
    try {
      const a = await createAddenda(nota.id, addendaText.trim())
      setAddendas(prev => [...prev, a])
      setAddendaText('')
      onAddenda({ ...nota, notas_evolucion_addenda: [...addendas, a] })
      showToast('Addenda guardada', 'success')
    } catch (err) {
      logger.error('NotaEvolucion.addenda', err)
      showToast('Error al guardar addenda', 'error')
    } finally {
      setSavingAddenda(false)
    }
  }

  const soapSections = [
    { key: 'motivo_consulta', label: 'S — Subjetivo', bar: 'bg-blue-400', text: 'text-blue-500', value: nota.motivo_consulta },
    { key: 'exploracion_fisica', label: 'O — Objetivo', bar: 'bg-emerald-400', text: 'text-emerald-500', value: nota.exploracion_fisica },
    { key: 'diagnostico', label: 'A — Análisis', bar: 'bg-amber-400', text: 'text-amber-500', value: nota.diagnostico },
    { key: 'plan_terapeutico', label: 'P — Plan', bar: 'bg-violet-400', text: 'text-violet-500', value: nota.plan_terapeutico },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Stethoscope size={14} className="text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-700">Nota de Evolución</p>
            <p className="text-[10px] text-gray-400">
              {new Date(nota.fecha_hora).toLocaleString('es-MX', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Signos vitales */}
          {hasVitals && (
            <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {nota.ta_sistolica && (
                <div className="text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">T.A.</p>
                  <p className="text-sm font-bold text-gray-800">{nota.ta_sistolica}/{nota.ta_diastolica}</p>
                  <p className="text-[10px] text-gray-400">mmHg</p>
                </div>
              )}
              {nota.frecuencia_cardiaca && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">F.C.</p>
                  <p className="text-sm font-bold text-gray-800">{nota.frecuencia_cardiaca}</p>
                  <p className="text-[10px] text-gray-400">lpm</p>
                </div>
              )}
              {nota.frecuencia_respiratoria && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">F.R.</p>
                  <p className="text-sm font-bold text-gray-800">{nota.frecuencia_respiratoria}</p>
                  <p className="text-[10px] text-gray-400">rpm</p>
                </div>
              )}
              {nota.temperatura && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Temp.</p>
                  <p className="text-sm font-bold text-gray-800">{nota.temperatura}</p>
                  <p className="text-[10px] text-gray-400">°C</p>
                </div>
              )}
              {nota.saturacion_oxigeno && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">SpO₂</p>
                  <p className="text-sm font-bold text-gray-800">{nota.saturacion_oxigeno}</p>
                  <p className="text-[10px] text-gray-400">%</p>
                </div>
              )}
              {nota.peso_kg && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Peso</p>
                  <p className="text-sm font-bold text-gray-800">{nota.peso_kg}</p>
                  <p className="text-[10px] text-gray-400">kg</p>
                </div>
              )}
            </div>
          )}

          {/* SOAP */}
          <div className="space-y-3">
            {soapSections.filter(s => s.value).map(s => (
              <div key={s.key} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-50">
                  <div className={`w-1 h-4 rounded-full ${s.bar}`} />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                </div>
                <p className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{s.value}</p>
              </div>
            ))}
          </div>

          {/* CIE-10 */}
          {(nota.notas_evolucion_diagnosticos ?? []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Diagnósticos CIE-10</p>
              {(nota.notas_evolucion_diagnosticos ?? []).map((d, i) => (
                <div key={d.id ?? i} className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                  <span className="text-[9px] font-bold text-violet-400 uppercase shrink-0 w-12">
                    {i === 0 ? 'Principal' : 'Sec.'}
                  </span>
                  <span className="text-xs font-mono font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-lg shrink-0">{d.cie10_codigo}</span>
                  {d.cie10_descripcion && <span className="text-xs text-gray-600 truncate">{d.cie10_descripcion}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Addendas */}
          {addendas.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Addendas</p>
              {addendas.map(a => (
                <div key={a.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-[10px] text-amber-600 font-bold mb-1">
                    Addenda · {new Date(a.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{a.contenido}</p>
                </div>
              ))}
            </div>
          )}

          {/* Nueva addenda */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 px-1">
              <Lock size={9} /> Addenda (NOM-004 — no modifica la nota original)
            </p>
            <textarea
              rows={2}
              value={addendaText}
              onChange={e => setAddendaText(e.target.value)}
              placeholder="Aclaración o enmienda a esta nota..."
              className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs focus:ring-2 focus:ring-primary/25 focus:outline-none resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleAddenda}
                disabled={savingAddenda || !addendaText.trim()}
                className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-teal-600 disabled:opacity-40 flex items-center gap-1.5 transition-all"
              >
                {savingAddenda ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Guardar addenda
              </button>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 flex items-center gap-1 px-1">
            <Lock size={9} /> Cifrada AES-256 · NOM-004-SSA3-2012
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export default function NotaEvolucionForm({ appointmentId, patientId, existing, onSaved }: Props) {
  const isEdit = !!existing

  // Signos vitales
  const [taSis, setTaSis] = useState(existing?.ta_sistolica?.toString() ?? '')
  const [taDia, setTaDia] = useState(existing?.ta_diastolica?.toString() ?? '')
  const [fc, setFc] = useState(existing?.frecuencia_cardiaca?.toString() ?? '')
  const [fr, setFr] = useState(existing?.frecuencia_respiratoria?.toString() ?? '')
  const [temp, setTemp] = useState(existing?.temperatura?.toString() ?? '')
  const [peso, setPeso] = useState(existing?.peso_kg?.toString() ?? '')
  const [talla, setTalla] = useState(existing?.talla_cm?.toString() ?? '')
  const [spo2, setSpo2] = useState(existing?.saturacion_oxigeno?.toString() ?? '')

  // CIE-10 diagnósticos inline en Assessment
  const [diagnosticos, setDiagnosticos] = useState<Array<{ codigo: string; descripcion: string }>>(
    existing?.notas_evolucion_diagnosticos?.map(d => ({
      codigo: d.cie10_codigo,
      descripcion: d.cie10_descripcion ?? '',
    })) ?? [{ codigo: '', descripcion: '' }]
  )

  // SOAP
  const [motivo, setMotivo] = useState(existing?.motivo_consulta ?? '')
  const [exploracion, setExploracion] = useState(existing?.exploracion_fisica ?? '')
  const [diagnostico, setDiagnostico] = useState(existing?.diagnostico ?? '')
  const [plan, setPlan] = useState(existing?.plan_terapeutico ?? '')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<NotaEvolucion | null>(existing ?? null)
  const [showPresets, setShowPresets] = useState(false)
  const presetsRef = useRef<HTMLDivElement>(null)

  // Close presets on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) setShowPresets(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function updateDiag(i: number, field: 'codigo' | 'descripcion', val: string) {
    setDiagnosticos(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d))
  }
  function addDiag() {
    setDiagnosticos(prev => [...prev, { codigo: '', descripcion: '' }])
  }
  function removeDiag(i: number) {
    if (diagnosticos.length <= 1) return
    setDiagnosticos(prev => prev.filter((_, idx) => idx !== i))
  }

  // Completion check per section
  const completion = {
    vitals: !!(taSis || fc || temp || peso),
    s: motivo.trim().length > 0,
    o: exploracion.trim().length > 0,
    a: diagnostico.trim().length > 0 || diagnosticos.some(d => d.codigo.trim()),
    p: plan.trim().length > 0,
  }
  const completedCount = Object.values(completion).filter(Boolean).length

  async function handleSave() {
    if (!completion.s && !completion.a && !completion.p) {
      showToast('Registra al menos motivo, diagnóstico o plan', 'error')
      return
    }
    setSaving(true)
    try {
      const diagPayload: DiagnosticoCIE10[] = diagnosticos
        .filter(d => d.codigo.trim())
        .map((d, i) => ({
          orden: i + 1,
          tipo: i === 0 ? 'principal' : 'secundario',
          cie10_codigo: d.codigo.trim().toUpperCase(),
          cie10_descripcion: d.descripcion.trim() || null,
        }))

      const input: NotaEvolucionInput = {
        appointment_id: appointmentId,
        patient_id: patientId,
        ta_sistolica: taSis ? parseInt(taSis) : null,
        ta_diastolica: taDia ? parseInt(taDia) : null,
        frecuencia_cardiaca: fc ? parseInt(fc) : null,
        frecuencia_respiratoria: fr ? parseInt(fr) : null,
        temperatura: temp ? parseFloat(temp) : null,
        peso_kg: peso ? parseFloat(peso) : null,
        talla_cm: talla ? parseFloat(talla) : null,
        saturacion_oxigeno: spo2 ? parseInt(spo2) : null,
        diagnosticos: diagPayload.length > 0 ? diagPayload : undefined,
        motivo_consulta: motivo || undefined,
        exploracion_fisica: exploracion || undefined,
        diagnostico: diagnostico || undefined,
        plan_terapeutico: plan || undefined,
      }
      const nota = await saveNotaEvolucion(input)
      setSaved(nota)
      onSaved?.(nota)
      showToast('Nota de evolución guardada', 'success')
    } catch (err) {
      logger.error('NotaEvolucionForm.save', err)
      showToast('Error al guardar la nota', 'error')
    } finally {
      setSaving(false)
    }
  }

  // After first save → read-only
  if (saved && !isEdit) {
    return (
      <div className="border border-primary/20 bg-primary/[0.02] rounded-2xl p-4">
        <NotaEvolucionReadonly nota={saved} onAddenda={n => setSaved(n)} />
      </div>
    )
  }

  if (isEdit && existing) {
    return (
      <div className="border border-gray-200 rounded-2xl p-4">
        <NotaEvolucionReadonly nota={existing} onAddenda={n => onSaved?.(n)} />
      </div>
    )
  }

  // ── Editable form ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header with progress ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Stethoscope size={14} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Nota de Evolución</p>
            <p className="text-[10px] text-gray-400">NOM-004-SSA3-2012</p>
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Object.entries(completion).map(([k, v]) => (
            <div key={k} title={k}
              className={`w-2 h-2 rounded-full transition-colors ${v ? 'bg-primary' : 'bg-gray-200'}`}
            />
          ))}
          <span className="text-[10px] text-gray-400 ml-1">{completedCount}/5</span>
        </div>
      </div>

      {/* ── Signos vitales ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
          <div className={`w-1 h-5 rounded-full ${completion.vitals ? 'bg-primary' : 'bg-gray-200'}`} />
          <Activity size={12} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-600">Signos vitales</span>
          {completion.vitals && <CheckCircle2 size={11} className="text-primary opacity-60" />}
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <VitalInput label="T.A. Sistólica" unit="mmHg" value={taSis} onChange={setTaSis} placeholder="120" />
              <VitalInput label="T.A. Diastólica" unit="mmHg" value={taDia} onChange={setTaDia} placeholder="80" />
            </div>
            <VitalInput label="Frec. Cardíaca" unit="lpm" value={fc} onChange={setFc} placeholder="72" />
            <VitalInput label="Frec. Respiratoria" unit="rpm" value={fr} onChange={setFr} placeholder="16" />
            <VitalInput label="Temperatura" unit="°C" value={temp} onChange={setTemp} placeholder="36.5" />
            <VitalInput label="SpO₂" unit="%" value={spo2} onChange={setSpo2} placeholder="98" />
            <VitalInput label="Peso" unit="kg" value={peso} onChange={setPeso} placeholder="70.0" />
            <VitalInput label="Talla" unit="cm" value={talla} onChange={setTalla} placeholder="170" />
          </div>
        </div>
      </div>

      {/* ── S — Subjetivo ─────────────────────────────────────────────────── */}
      <SoapSection
        icon={<FileText size={12} className="text-blue-500" />}
        label="S — Subjetivo · Motivo de consulta"
        color="bg-blue-400"
        bgColor="text-blue-500"
        value={motivo}
        onChange={setMotivo}
        placeholder="Síntomas referidos por el paciente, evolución del padecimiento actual..."
        rows={3}
      />

      {/* ── O — Objetivo ──────────────────────────────────────────────────── */}
      <SoapSection
        icon={<Activity size={12} className="text-emerald-500" />}
        label="O — Objetivo · Exploración física"
        color="bg-emerald-400"
        bgColor="text-emerald-500"
        value={exploracion}
        onChange={setExploracion}
        placeholder="Hallazgos a la exploración física, resultados de laboratorio y gabinete..."
        rows={4}
        toolbar={
          <div ref={presetsRef} className="relative">
            <button
              type="button"
              onClick={() => setShowPresets(v => !v)}
              className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Zap size={10} />
              Plantilla
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {EXAM_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onMouseDown={() => {
                      if (exploracion.trim() && !window.confirm('Esto reemplazará el texto que ya escribiste en Exploración Física. ¿Continuar?')) return
                      setExploracion(p.text)
                      setShowPresets(false)
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <p className="text-xs font-bold text-gray-700">{p.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{p.text}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* ── A — Análisis + CIE-10 inline ──────────────────────────────────── */}
      <div className={`rounded-2xl border ${completion.a ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50/50'} transition-all`}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
          <div className={`w-1 h-5 rounded-full ${completion.a ? 'bg-amber-400' : 'bg-gray-200'}`} />
          <FlaskConical size={12} className="text-amber-500" />
          <span className="text-xs font-bold text-gray-700">A — Análisis · Diagnóstico</span>
          {completion.a && <CheckCircle2 size={11} className="text-amber-500 opacity-60" />}
        </div>

        {/* Diagnosis free text */}
        <textarea
          rows={3}
          value={diagnostico}
          onChange={e => setDiagnostico(e.target.value)}
          placeholder="Impresión diagnóstica, razonamiento clínico..."
          className="w-full px-4 py-3 text-sm bg-transparent focus:outline-none resize-none leading-relaxed text-gray-800 placeholder:text-gray-300 border-b border-gray-100"
        />

        {/* CIE-10 inline */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ClipboardList size={11} className="text-violet-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Códigos CIE-10</span>
              <span className="text-[9px] text-violet-400 font-bold">(recomendado NOM-004)</span>
            </div>
            <button
              type="button"
              onClick={addDiag}
              className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
            >
              <Plus size={11} /> Agregar secundario
            </button>
          </div>
          <div className="space-y-3">
            {diagnosticos.map((d, i) => (
              <Cie10Row
                key={i}
                index={i}
                codigo={d.codigo}
                descripcion={d.descripcion}
                canRemove={i > 0}
                onChange={(field, val) => updateDiag(i, field, val)}
                onSelect={(code, desc) => setDiagnosticos(prev =>
                  prev.map((x, idx) => idx === i ? { codigo: code, descripcion: desc } : x)
                )}
                onRemove={() => removeDiag(i)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── P — Plan ──────────────────────────────────────────────────────── */}
      <SoapSection
        icon={<Pill size={12} className="text-violet-500" />}
        label="P — Plan · Tratamiento e indicaciones"
        color="bg-violet-400"
        bgColor="text-violet-500"
        value={plan}
        onChange={setPlan}
        placeholder="Medicamentos, dosis, indicaciones generales, seguimiento, próxima cita..."
        rows={4}
      />

      {/* ── Guardar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] text-gray-400 flex items-center gap-1">
          <Lock size={9} /> Cifrada AES-256 · NOM-004-SSA3-2012
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-teal-600 disabled:opacity-40 transition-all shadow-sm shadow-primary/20"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar nota
        </button>
      </div>
    </div>
  )
}

export { NotaEvolucionReadonly }
