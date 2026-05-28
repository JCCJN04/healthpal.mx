import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Loader2, CalendarDays,
  Building2, Video, Phone, CheckCircle, Calendar,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import AppointmentSummaryCard from '@/features/patient/components/AppointmentSummaryCard'
import { getDoctorById, type DoctorWithProfile } from '@/features/patient/services/doctors'
import { createAppointment, updateAppointmentCalendarEvent, type AppointmentMode } from '@/shared/lib/queries/appointments'
import { getValidGoogleCalendarTokens, createGoogleCalendarEvent, getDoctorBusySlots, type BusyInterval } from '@/shared/lib/googleCalendar'
import { logger } from '@/shared/lib/logger'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

const MODE_OPTIONS: { value: AppointmentMode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'in_person',
    label: 'Presencial',
    icon: <Building2 className="w-5 h-5" />,
    desc: 'Visita al consultorio del doctor',
  },
  {
    value: 'video',
    label: 'Videollamada',
    icon: <Video className="w-5 h-5" />,
    desc: 'Consulta por videollamada',
  },
  {
    value: 'phone',
    label: 'Llamada',
    icon: <Phone className="w-5 h-5" />,
    desc: 'Consulta por teléfono',
  },
]

const MODE_TO_LABEL: Record<AppointmentMode, string> = {
  in_person: 'Presencial',
  video: 'Videollamada',
  phone: 'Llamada telefónica',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(date: Date): string {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} del ${date.getFullYear()}`
}

function generateTimeSlots(slotMin: number): string[] {
  const slots: string[] = []
  for (let h = 8; h < 20; h++) {
    for (let m = 0; m < 60; m += slotMin) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

function buildScheduledAt(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).toISOString()
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Returns true if [slotStart, slotStart+duration) overlaps any busy interval. */
function isSlotBusy(date: Date, slotTime: string, durationMin: number, busy: BusyInterval[]): boolean {
  const [h, m] = slotTime.split(':').map(Number)
  const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime()
  const slotEnd = slotStart + durationMin * 60_000
  return busy.some(b => {
    const bStart = new Date(b.start).getTime()
    const bEnd = new Date(b.end).getTime()
    return slotStart < bEnd && slotEnd > bStart
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ['Fecha y tipo', 'Motivo', 'Resumen']
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < step
        const active = idx === step
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  done
                    ? 'bg-[#33C7BE] border-[#33C7BE] text-white'
                    : active
                    ? 'border-[#33C7BE] text-[#33C7BE] bg-white'
                    : 'border-gray-200 text-gray-400 bg-white'
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : idx}
              </div>
              <span className={`text-[11px] mt-1 font-medium ${active ? 'text-[#33C7BE]' : done ? 'text-gray-500' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mb-4 mx-1 transition-colors ${done ? 'bg-[#33C7BE]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function CalendarPicker({ value, onChange }: { value: Date | null; onChange: (d: Date) => void }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const days = useMemo(() => {
    const first = new Date(year, month, 1).getDay()
    const total = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array(first).fill(null)
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d))
    return cells
  }, [year, month])

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-gray-900 capitalize">
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const isPast = day < today
          const isSelected = value && day.toDateString() === value.toDateString()
          const isToday = day.toDateString() === today.toDateString()
          return (
            <button
              key={day.toDateString()}
              onClick={() => !isPast && onChange(day)}
              disabled={isPast}
              className={`
                mx-auto w-8 h-8 rounded-full text-sm font-medium transition-colors
                ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                ${isSelected ? 'bg-[#33C7BE] text-white shadow-sm' : ''}
                ${!isSelected && isToday ? 'ring-2 ring-[#33C7BE] text-[#33C7BE]' : ''}
                ${!isSelected && !isPast ? 'hover:bg-teal-50 text-gray-700' : ''}
              `}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NuevaConsulta() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const doctorId = searchParams.get('doctor')

  // Doctor data
  const [doctor, setDoctor] = useState<DoctorWithProfile | null>(null)
  const [loadingDoctor, setLoadingDoctor] = useState(true)
  const [doctorError, setDoctorError] = useState(false)

  // Step
  const [step, setStep] = useState(1)

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [mode, setMode] = useState<AppointmentMode>('in_person')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)
  const [calendarSynced, setCalendarSynced] = useState(false)

  useEffect(() => {
    if (!doctorId) {
      navigate('/dashboard/doctores')
      return
    }
    getDoctorById(doctorId).then(d => {
      if (!d) setDoctorError(true)
      else setDoctor(d)
      setLoadingDoctor(false)
    })
  }, [doctorId, navigate])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slotDuration = (doctor?.doctor_profile as any)?.slot_duration_min ?? 30
  const timeSlots = useMemo(() => generateTimeSlots(slotDuration), [slotDuration])

  // Availability
  const [busySlots, setBusySlots] = useState<BusyInterval[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  useEffect(() => {
    if (!selectedDate || !doctor) return
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    setLoadingAvailability(true)
    setBusySlots([])
    setSelectedTime(null)
    getDoctorBusySlots(doctor.id, dateStr).then(busy => {
      setBusySlots(busy)
      setLoadingAvailability(false)
    })
  }, [selectedDate, doctor])

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!doctor || !selectedDate || !selectedTime) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const scheduledAt = buildScheduledAt(selectedDate, selectedTime)

      const appt = await createAppointment({
        doctorId: doctor.id,
        scheduledAt,
        durationMin: slotDuration,
        mode,
        reason,
        notes: notes || undefined,
      })

      if (!appt) throw new Error('No se pudo guardar la cita')

      // Try Google Calendar auto-sync
      try {
        const tokens = await getValidGoogleCalendarTokens()
        if (tokens) {
          const endTime = addMinutes(selectedTime, slotDuration)
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
          const event = await createGoogleCalendarEvent(tokens.access_token, tokens.calendar_id, {
            title: `Consulta médica — ${doctor.full_name ?? 'Doctor'}`,
            description: [
              `Tipo: ${MODE_TO_LABEL[mode]}`,
              `Motivo: ${reason}`,
              notes ? `Notas: ${notes}` : '',
              '\nCita agendada a través de HealthPal.mx',
            ].filter(Boolean).join('\n'),
            startDateTime: `${dateStr}T${selectedTime}:00`,
            endDateTime: `${dateStr}T${endTime}:00`,
            timeZone: 'America/Mexico_City',
          })
          if (event) {
            await updateAppointmentCalendarEvent(appt.id, event.id)
            setCalendarSynced(true)
          }
        }
      } catch (calErr) {
        // Non-fatal — appointment already created
        logger.error('NuevaConsulta:calendarSync', calErr)
      }

      setSuccess(true)
    } catch (err) {
      logger.error('NuevaConsulta:handleConfirm', err)
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la cita')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (loadingDoctor) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-[#33C7BE] animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (doctorError || !doctor) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <p className="text-gray-600 mb-4">No se encontró el doctor.</p>
          <Link to="/dashboard/doctores" className="text-[#33C7BE] font-semibold hover:underline">
            Volver al directorio
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  // ─── Success state ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">¡Solicitud enviada!</h2>
              <p className="text-gray-500 text-sm mt-1">
                Tu solicitud fue enviada a{' '}
                <span className="font-semibold text-gray-700">{doctor.full_name}</span>.
                El doctor la revisará y confirmará a la brevedad.
              </p>
            </div>

            {calendarSynced && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 rounded-lg border border-teal-100 text-sm text-teal-700 font-medium">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                Cita agregada a tu Google Calendar
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => navigate('/dashboard/doctores')}
                className="flex-1 px-5 py-2.5 border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors"
              >
                Mis doctores
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-5 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors"
              >
                Ir al dashboard
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ─── Summary data for AppointmentSummaryCard ───────────────────────────────

  const summaryData = {
    reason,
    consultationType: MODE_TO_LABEL[mode],
    additionalInfo: notes,
    doctorName: doctor.full_name ?? 'Doctor',
    appointmentDate: selectedDate ? formatDateLong(selectedDate) : '',
    appointmentTime: selectedTime ?? '',
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Back */}
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate(`/dashboard/doctores/${doctor.id}`)}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {step > 1 ? 'Paso anterior' : 'Volver al perfil'}
        </button>

        {/* Doctor banner */}
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          {doctor.avatar_url ? (
            <img
              src={doctor.avatar_url}
              alt={doctor.full_name ?? ''}
              className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {(doctor.full_name ?? 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{doctor.full_name}</p>
            <p className="text-xs text-gray-500 truncate">
              {doctor.doctor_profile?.specialty ?? 'Doctor'}{doctor.doctor_profile?.clinic_name ? ` · ${doctor.doctor_profile.clinic_name}` : ''}
            </p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-[#33C7BE]" />
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 sm:px-8 pt-8 pb-6">
          <StepIndicator step={step} />

          {/* ── Step 1: Fecha, hora y tipo ── */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">¿Cuándo y cómo?</h2>

              {/* Consultation type */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tipo de consulta</p>
                <div className="grid grid-cols-3 gap-3">
                  {MODE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMode(opt.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                        mode === opt.value
                          ? 'border-[#33C7BE] bg-teal-50 text-[#33C7BE]'
                          : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt.icon}
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Selecciona una fecha</p>
                <CalendarPicker value={selectedDate} onChange={setSelectedDate} />
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Horario — {formatDateLong(selectedDate)}
                    </p>
                    {loadingAvailability && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Verificando disponibilidad...
                      </span>
                    )}
                  </div>
                  {loadingAvailability ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="py-2 px-1 rounded-lg bg-gray-100 animate-pulse h-9" />
                      ))}
                    </div>
                  ) : (() => {
                    const available = timeSlots.filter(s => !isSlotBusy(selectedDate, s, slotDuration, busySlots))
                    if (available.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 py-4 text-center">
                          No hay horarios disponibles para este día.
                        </p>
                      )
                    }
                    return (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {available.map(slot => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`py-2 px-1 rounded-lg text-sm font-medium border transition-colors ${
                              selectedTime === slot
                                ? 'bg-[#33C7BE] border-[#33C7BE] text-white shadow-sm'
                                : 'border-gray-100 text-gray-600 hover:border-[#33C7BE] hover:text-[#33C7BE]'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!selectedDate || !selectedTime}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Motivo ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Motivo de la consulta</h2>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  ¿Cuál es el motivo? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe brevemente por qué deseas consultar a este doctor..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{reason.length}/500</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  Información adicional <span className="text-gray-300">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Síntomas, medicamentos actuales, alergias u otra información relevante..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{notes.length}/500</p>
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={reason.trim().length < 10}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Revisar solicitud
                <ArrowRight className="w-4 h-4" />
              </button>
              {reason.trim().length > 0 && reason.trim().length < 10 && (
                <p className="text-xs text-red-500 text-center -mt-3">Mínimo 10 caracteres</p>
              )}
            </div>
          )}

          {/* ── Step 3: Resumen ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Revisa tu solicitud</h2>

              <AppointmentSummaryCard
                data={summaryData}
                isConfirmed
                onEdit={() => setStep(1)}
              />

              {submitError && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#33C7BE] to-teal-400 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar y enviar solicitud
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Tu solicitud estará pendiente hasta que el doctor la confirme.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
