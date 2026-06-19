import { useState, useMemo, useEffect } from 'react'
import { X, ArrowLeft, ArrowRight, Check, Loader2, Building2, Video, Phone, CalendarDays, Clock, FileUp, Copy } from 'lucide-react'
import { createAppointmentForPatient, getDoctorAppointmentsForDate, type AppointmentMode } from '@/shared/lib/queries/appointments'
import { createAppointmentCalendarEvent, getDoctorBusySlots, type BusyInterval } from '@/shared/lib/googleCalendar'
import { createDocumentRequest } from '@/shared/lib/queries/documentRequests'
import { logger } from '@/shared/lib/logger'
import { useAuth } from '@/app/providers/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const WEEKDAYS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

const DURATION_OPTIONS = [15, 20, 30, 45, 60] as const

const MODE_OPTIONS: { value: AppointmentMode; label: string; icon: React.ReactNode }[] = [
  { value: 'in_person', label: 'Presencial',   icon: <Building2 className="w-4 h-4" /> },
  { value: 'video',     label: 'Videollamada', icon: <Video     className="w-4 h-4" /> },
  { value: 'phone',     label: 'Llamada',      icon: <Phone     className="w-4 h-4" /> },
]

const MODE_TO_LABEL: Record<AppointmentMode, string> = {
  in_person: 'Presencial', video: 'Videollamada', phone: 'Llamada telefónica',
}

function generateSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h < 20; h++)
    for (let m = 0; m < 60; m += 15)
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  return slots
}

const ALL_SLOTS = generateSlots()

function buildISO(date: Date, time: string): string {
  // Store as Mexico City time (UTC-6)
  return new Date(`${toDateKey(date)}T${time}:00-06:00`).toISOString()
}

function addMin(time: string, min: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMin = h * 60 + m + min
  return `${String(Math.floor(totalMin / 60) % 24).padStart(2,'0')}:${String(totalMin % 60).padStart(2,'0')}`
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function isSlotBusy(date: Date, slotTime: string, durationMin: number, busy: BusyInterval[]): boolean {
  // Always interpret slot times as Mexico City time (UTC-6, no DST since 2023)
  const dateStr = toDateKey(date)
  const slotStart = new Date(`${dateStr}T${slotTime}:00-06:00`).getTime()
  const slotEnd = slotStart + durationMin * 60_000
  return busy.some(b => {
    const bStart = new Date(b.start).getTime()
    const bEnd   = new Date(b.end).getTime()
    return slotStart < bEnd && slotEnd > bStart
  })
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function CalendarPicker({ value, onChange }: { value: Date | null; onChange: (d: Date) => void }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [view, setView] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const year = view.getFullYear(), month = view.getMonth()

  const days = useMemo(() => {
    const first = new Date(year, month, 1).getDay()
    const total = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array(first).fill(null)
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d))
    return cells
  }, [year, month])

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setView(new Date(year, month - 1, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-semibold text-gray-800">{MONTHS[month]} {year}</span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const past = day < today
          const sel = value && day.toDateString() === value.toDateString()
          const isToday = day.toDateString() === today.toDateString()
          return (
            <button key={day.toDateString()} onClick={() => !past && onChange(day)} disabled={past}
              className={`mx-auto w-7 h-7 rounded-full text-xs font-medium transition-colors
                ${past ? 'text-gray-300 cursor-not-allowed' : ''}
                ${sel ? 'bg-[#33C7BE] text-white shadow-sm' : ''}
                ${!sel && isToday ? 'ring-2 ring-[#33C7BE] text-[#33C7BE]' : ''}
                ${!sel && !past ? 'hover:bg-teal-50 text-gray-700' : ''}
              `}>{day.getDate()}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface AgendarCitaModalProps {
  patientId: string
  patientName: string
  patientEmail?: string
  slotDuration?: number
  onClose: () => void
  onSuccess: () => void
}

export default function AgendarCitaModal({
  patientId,
  patientName,
  patientEmail = '',
  slotDuration = 30,
  onClose,
  onSuccess,
}: AgendarCitaModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(slotDuration)
  const [mode, setMode] = useState<AppointmentMode>('in_person')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Document request state
  const [showDocReq, setShowDocReq] = useState(false)
  const [docReqType, setDocReqType] = useState('')
  const [docReqDesc, setDocReqDesc] = useState('')
  const [docReqLoading, setDocReqLoading] = useState(false)
  const [docReqLink, setDocReqLink] = useState<string | null>(null)
  const [docReqCopied, setDocReqCopied] = useState(false)

  async function handleDocReq(e: React.FormEvent) {
    e.preventDefault()
    if (!docReqType.trim()) return
    setDocReqLoading(true)
    try {
      const { data, error: reqErr } = await createDocumentRequest(patientEmail, docReqType.trim(), docReqDesc.trim() || undefined)
      if (reqErr || !data) {
        logger.error('AgendarCitaModal:docReq', reqErr)
        return
      }
      setDocReqLink(`${window.location.origin}/solicitud/${data.token}`)
    } catch (err) {
      logger.error('AgendarCitaModal:docReq:catch', err)
    } finally {
      setDocReqLoading(false)
    }
  }

  function handleCopyDocReqLink() {
    if (!docReqLink) return
    navigator.clipboard.writeText(docReqLink)
    setDocReqCopied(true)
    setTimeout(() => setDocReqCopied(false), 2000)
  }

  // Availability
  const [busySlots, setBusySlots] = useState<BusyInterval[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // Fetch availability when date or duration changes
  useEffect(() => {
    if (!date || !user) return
    const dateStr = toDateKey(date)
    setLoadingAvailability(true)
    setBusySlots([])
    setTime(null)

    Promise.all([
      // Google Calendar busy slots
      getDoctorBusySlots(user.id, dateStr),
      // Existing HealthPal appointments
      getDoctorAppointmentsForDate(dateStr),
    ]).then(([gcalBusy, appts]) => {
      // Convert HealthPal appointments to busy intervals
      const apptBusy: BusyInterval[] = appts.map(a => ({
        start: a.scheduled_at,
        end: new Date(new Date(a.scheduled_at).getTime() + a.duration_min * 60_000).toISOString(),
      }))
      setBusySlots([...gcalBusy, ...apptBusy])
      setLoadingAvailability(false)
    })
  }, [date, user])

  const availableSlots = useMemo(() => {
    if (!date) return []
    return ALL_SLOTS.filter(s => !isSlotBusy(date, s, duration, busySlots))
  }, [date, duration, busySlots])

  async function handleConfirm() {
    if (!date || !time) return
    setSubmitting(true)
    setError('')
    try {
      const scheduledAt = buildISO(date, time)
      const appt = await createAppointmentForPatient({
        patientId,
        scheduledAt,
        durationMin: duration,
        mode,
        reason,
        notes: notes || undefined,
      })
      if (!appt) throw new Error('No se pudo guardar la cita')

      // Google Calendar sync (server-side via edge function)
      try {
        const dateStr = toDateKey(date!)
        const endTime = addMin(time!, duration)
        await createAppointmentCalendarEvent(appt.id, {
          title: `Consulta — ${patientName}`,
          description: reason,
          startDateTime: `${dateStr}T${time}:00`,
          endDateTime: `${dateStr}T${endTime}:00`,
          timeZone: 'America/Mexico_City',
        })
      } catch (calErr) {
        logger.error('AgendarCitaModal:calendar', calErr)
      }

      onSuccess()
    } catch (err) {
      logger.error('AgendarCitaModal:confirm', err)
      setError(err instanceof Error ? err.message : 'Error al crear la cita')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Agendar cita</h2>
            <p className="text-xs text-gray-500 mt-0.5">Paciente: <span className="font-semibold text-gray-700">{patientName}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-gray-100">
          {['Fecha y hora', 'Motivo'].map((label, i) => {
            const idx = i + 1
            const active = step === idx
            const done = step > idx
            return (
              <div key={label} className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-colors ${
                active ? 'border-[#33C7BE] text-[#33C7BE]' : 'border-transparent text-gray-400'
              }`}>
                {done ? '✓ ' : ''}{label}
              </div>
            )
          })}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              {/* Mode */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo de consulta</p>
                <div className="flex gap-2">
                  {MODE_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setMode(opt.value)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                        mode === opt.value ? 'border-[#33C7BE] bg-teal-50 text-[#33C7BE]' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}>
                      {opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Duración
                </p>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map(min => (
                    <button key={min} onClick={() => { setDuration(min); setTime(null) }}
                      className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                        duration === min ? 'border-[#33C7BE] bg-teal-50 text-[#33C7BE]' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}>
                      {min} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Fecha</p>
                <CalendarPicker value={date} onChange={d => setDate(d)} />
              </div>

              {/* Slots */}
              {date && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Horario</p>
                    {loadingAvailability && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                      </span>
                    )}
                  </div>

                  {loadingAvailability ? (
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No hay horarios disponibles este día.</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                      {availableSlots.map(s => (
                        <button key={s} onClick={() => setTime(s)}
                          className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            time === s ? 'bg-[#33C7BE] border-[#33C7BE] text-white' : 'border-gray-100 text-gray-600 hover:border-[#33C7BE] hover:text-[#33C7BE]'
                          }`}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setStep(2)} disabled={!date || !time || loadingAvailability}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <>
              {/* Summary chip */}
              <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-100 text-sm">
                <CalendarDays className="w-4 h-4 text-[#33C7BE] flex-shrink-0" />
                <span className="font-medium text-gray-700">
                  {date && `${date.getDate()} ${MONTHS[date.getMonth()]} · `}{time} · {duration} min · {MODE_TO_LABEL[mode]}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  Motivo <span className="text-red-400">*</span>
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Motivo de la cita..." rows={3} maxLength={500}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE] resize-none" />
                {reason.length > 0 && reason.trim().length < 5 && (
                  <p className="text-[11px] text-red-400 mt-1">Mínimo 5 caracteres para continuar.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  Notas adicionales <span className="text-gray-300">(opcional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Instrucciones previas, preparación..." rows={2} maxLength={500}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE] resize-none" />
              </div>

              {/* Document request */}
              <div className="rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDocReq(v => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-green-500 hover:bg-green-600 active:scale-[0.99] transition-all rounded-xl text-white"
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 flex-shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="text-sm font-semibold">Solicitar documentos antes de la cita</span>
                  <span className="ml-auto text-white/70 text-xs">{showDocReq ? '▲' : '▼'}</span>
                </button>

                {showDocReq && (
                  <div className="px-4 pb-4 pt-3 border border-t-0 border-green-200 rounded-b-xl space-y-3 bg-green-50/30">
                    {docReqLink ? (
                      <div className="space-y-2">
                        <p className="text-xs text-green-700 font-semibold">✓ Enlace generado. Compártelo con el paciente:</p>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <span className="flex-1 text-xs text-gray-600 truncate font-mono">{docReqLink}</span>
                          <button
                            type="button"
                            onClick={handleCopyDocReqLink}
                            className="flex items-center gap-1 text-xs font-semibold text-[#33C7BE] hover:text-teal-700 flex-shrink-0"
                          >
                            {docReqCopied ? <Check size={12} /> : <Copy size={12} />}
                            {docReqCopied ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                        <a
                          href={`https://wa.me/${patientEmail ? '' : ''}?text=${encodeURIComponent(`Hola ${patientName.split(' ')[0]}, para tu cita necesito que subas el siguiente documento: ${docReqLink}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          Enviar por WhatsApp
                        </a>
                        <button
                          type="button"
                          onClick={() => { setDocReqLink(null); setDocReqType(''); setDocReqDesc('') }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Crear otra solicitud
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleDocReq} className="space-y-2">
                        <input
                          value={docReqType}
                          onChange={e => setDocReqType(e.target.value)}
                          placeholder="Tipo de documento (ej: Análisis de sangre, Rx tórax)"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
                          required
                        />
                        <input
                          value={docReqDesc}
                          onChange={e => setDocReqDesc(e.target.value)}
                          placeholder="Descripción adicional (opcional)"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
                        />
                        <button
                          type="submit"
                          disabled={docReqLoading || !docReqType.trim()}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#33C7BE] text-white text-xs font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                        >
                          {docReqLoading ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
                          Generar enlace de solicitud
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                  Atrás
                </button>
                <button onClick={handleConfirm} disabled={submitting || reason.trim().length < 5}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40 text-sm">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
