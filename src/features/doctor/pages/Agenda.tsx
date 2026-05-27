import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CalendarDays, Clock, Building2, Video, Phone, Loader2, Inbox,
  Check, X, List, ArrowLeft, ArrowRight, ChevronRight, FileText, StickyNote, Plus, Search,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  updateAppointmentCalendarEvent,
  type AppointmentWithPatient,
  type AppointmentMode,
  type AppointmentStatus,
} from '@/shared/lib/queries/appointments'
import { getValidGoogleCalendarTokens, createGoogleCalendarEvent, deleteAppointmentCalendarEvent } from '@/shared/lib/googleCalendar'
import { logger } from '@/shared/lib/logger'
import { listDoctorPatients, type PatientProfileLite } from '@/features/doctor/services/patients'
import AgendarCitaModal from '@/shared/components/appointments/AgendarCitaModal'
import { useAuth } from '@/app/providers/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_LONG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const WEEKDAYS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

const MODE_LABEL: Record<AppointmentMode, string> = {
  in_person: 'Presencial',
  video: 'Videollamada',
  phone: 'Llamada',
}

const MODE_ICON: Record<AppointmentMode, React.ReactNode> = {
  in_person: <Building2 className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  phone: <Phone className="w-3.5 h-3.5" />,
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  confirmed: 'bg-green-50 text-green-700 border-green-100',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
  completed: 'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function addMinutes(iso: string, minutes: number): string {
  const endMs = new Date(iso).getTime() + minutes * 60_000
  return new Date(endMs).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function isPast(iso: string): boolean {
  return new Date(iso) < new Date()
}

/** Date key (YYYY-MM-DD) in Mexico City timezone for mapping appointments to calendar days */
function apptDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ─── Patient Picker Modal ─────────────────────────────────────────────────────

function PatientPickerModal({
  doctorId,
  onSelect,
  onClose,
}: {
  doctorId: string
  onSelect: (patient: PatientProfileLite) => void
  onClose: () => void
}) {
  const [patients, setPatients] = useState<PatientProfileLite[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listDoctorPatients(doctorId).then(data => {
      setPatients(data)
      setLoading(false)
    })
  }, [doctorId])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return patients
    return patients.filter(p => (p.full_name ?? '').toLowerCase().includes(q))
  }, [patients, query])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">¿Para qué paciente?</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#33C7BE] animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                {patients.length === 0 ? 'No tienes pacientes con acceso aceptado.' : 'Sin resultados.'}
              </p>
            ) : (
              filtered.map(patient => {
                const initials = (patient.full_name ?? 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <button
                    key={patient.id}
                    onClick={() => onSelect(patient)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-teal-50 transition-colors text-left"
                  >
                    {patient.avatar_url ? (
                      <img src={patient.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{patient.full_name ?? 'Paciente'}</p>
                      {patient.email && <p className="text-xs text-gray-400 truncate">{patient.email}</p>}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Appointment Detail Modal ─────────────────────────────────────────────────

function AppointmentDetailModal({
  appt,
  actionLoading,
  onConfirm,
  onCancel,
  onClose,
}: {
  appt: AppointmentWithPatient
  actionLoading: boolean
  onConfirm: () => void
  onCancel: () => void
  onClose: () => void
}) {
  const initials = (appt.patient_name ?? 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const isPatientProposed = appt.initiated_by === appt.patient_id
  const canConfirm = appt.status === 'pending' && isPatientProposed
  const canCancel = appt.status === 'pending' || appt.status === 'confirmed'
  const endTime = addMinutes(appt.scheduled_at, appt.duration_min)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Detalle de cita</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Patient */}
          <div className="flex items-center gap-3">
            {appt.patient_avatar ? (
              <img src={appt.patient_avatar} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{appt.patient_name ?? 'Paciente'}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1 ${STATUS_STYLES[appt.status]}`}>
                {STATUS_LABEL[appt.status]}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Fecha
              </p>
              <p className="text-sm font-semibold text-gray-800">{formatDate(appt.scheduled_at)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Horario
              </p>
              <p className="text-sm font-semibold text-gray-800">{formatTime(appt.scheduled_at)} – {endTime}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                {MODE_ICON[appt.mode]} Tipo
              </p>
              <p className="text-sm font-semibold text-gray-800">{MODE_LABEL[appt.mode]}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duración
              </p>
              <p className="text-sm font-semibold text-gray-800">{appt.duration_min} min</p>
            </div>
          </div>

          {/* Reason */}
          {appt.reason && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Motivo
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{appt.reason}</p>
            </div>
          )}

          {/* Notes */}
          {appt.notes && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> Notas adicionales
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{appt.notes}</p>
            </div>
          )}

          {/* Proposed by label */}
          {appt.status === 'pending' && (
            <p className="text-xs text-center text-gray-400">
              {isPatientProposed ? 'Propuesta por el paciente — requiere tu confirmación' : 'Propuesta por ti — esperando respuesta del paciente'}
            </p>
          )}

          {/* Actions */}
          {(canConfirm || canCancel) && (
            <div className="flex gap-3 pt-1">
              {canConfirm && (
                <button
                  onClick={onConfirm}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 text-sm"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar
                </button>
              )}
              {canCancel && (
                <button
                  onClick={onCancel}
                  disabled={actionLoading}
                  className={`flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm ${canConfirm ? 'px-4' : 'flex-1'}`}
                >
                  {actionLoading && !canConfirm ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Appointment Row (clickable) ──────────────────────────────────────────────

function AppointmentRow({
  appt,
  onClick,
}: {
  appt: AppointmentWithPatient
  onClick: () => void
}) {
  const initials = (appt.patient_name ?? 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const isPending = appt.status === 'pending'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md hover:border-teal-100 active:scale-[0.99] ${
        isPending ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        {appt.patient_avatar ? (
          <img src={appt.patient_avatar} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{appt.patient_name ?? 'Paciente'}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${STATUS_STYLES[appt.status]}`}>
              {STATUS_LABEL[appt.status]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(appt.scheduled_at)} · {appt.duration_min} min
            </span>
            <span className="flex items-center gap-1">
              {MODE_ICON[appt.mode]}
              {MODE_LABEL[appt.mode]}
            </span>
          </div>
          {appt.reason && (
            <p className="mt-1 text-xs text-gray-400 truncate">{appt.reason}</p>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>
    </button>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

const EVENT_BG: Record<AppointmentStatus, string> = {
  confirmed: 'bg-[#33C7BE] text-white',
  pending:   'bg-amber-400 text-white',
  cancelled: 'bg-red-100 text-red-600 line-through',
  completed: 'bg-gray-200 text-gray-500',
}

const DOT_COLOR: Record<AppointmentStatus, string> = {
  confirmed: 'bg-[#33C7BE]',
  pending:   'bg-amber-400',
  cancelled: 'bg-red-300',
  completed: 'bg-gray-300',
}

const STATUS_LEFT_BORDER: Record<AppointmentStatus, string> = {
  confirmed: 'border-l-[#33C7BE]',
  pending:   'border-l-amber-400',
  cancelled: 'border-l-red-300',
  completed: 'border-l-gray-300',
}

function dotPriority(appts: { status: AppointmentStatus }[]): string {
  if (appts.some(a => a.status === 'pending'))   return DOT_COLOR.pending
  if (appts.some(a => a.status === 'confirmed')) return DOT_COLOR.confirmed
  if (appts.some(a => a.status === 'completed')) return DOT_COLOR.completed
  return DOT_COLOR.cancelled
}

function CalendarView({
  appointments,
  onSelect,
}: {
  appointments: AppointmentWithPatient[]
  onSelect: (appt: AppointmentWithPatient) => void
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [overflowDay, setOverflowDay] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>(() => toDateKey(new Date()))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const apptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithPatient[]>()
    for (const a of appointments) {
      const key = apptDateKey(a.scheduled_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    map.forEach(arr => arr.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))
    return map
  }, [appointments])

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1).getDay()
    const total = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array(first).fill(null)
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    const w: (Date | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7))
    return w
  }, [year, month])

  const MAX_VISIBLE = 3
  const selectedDayAppts = apptsByDay.get(selectedKey) ?? []

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-bold text-gray-900 capitalize">{MONTHS_LONG[month]} {year}</h2>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── MOBILE dot-grid ───────────────────────────────────────────────── */}
      <div className="sm:hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 mb-0.5">
            {week.map((day, di) => {
              if (!day) return <div key={`e-${wi}-${di}`} className="h-11" />
              const key = toDateKey(day)
              const dayAppts = apptsByDay.get(key) ?? []
              const isToday = day.toDateString() === today.toDateString()
              const isSelected = key === selectedKey
              const hasDot = dayAppts.length > 0

              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`h-11 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all ${
                    isSelected ? 'bg-[#33C7BE]/10' : 'active:bg-gray-100'
                  }`}
                >
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                    isSelected && isToday ? 'bg-[#33C7BE] text-white' :
                    isSelected ? 'bg-gray-900 text-white' :
                    isToday ? 'text-[#33C7BE] font-bold' :
                    day < today ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {day.getDate()}
                  </span>
                  {hasDot ? (
                    <span className={`w-1.5 h-1.5 rounded-full ${dotPriority(dayAppts)}`} />
                  ) : (
                    <span className="w-1.5 h-1.5" />
                  )}
                </button>
              )
            })}
          </div>
        ))}

        {/* Selected day event list */}
        <div className="mt-4 space-y-2">
          {selectedDayAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <CalendarDays className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">Sin citas este día</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {formatDate(new Date(selectedKey + 'T12:00:00-06:00').toISOString())} · {selectedDayAppts.length} {selectedDayAppts.length === 1 ? 'cita' : 'citas'}
              </p>
              {selectedDayAppts.map(appt => {
                const initials = (appt.patient_name ?? 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const endTime = addMinutes(appt.scheduled_at, appt.duration_min)
                return (
                  <button
                    key={appt.id}
                    onClick={() => onSelect(appt)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-gray-100 border-l-4 ${STATUS_LEFT_BORDER[appt.status]} bg-white shadow-sm active:scale-[0.98] transition-all hover:shadow-md`}
                  >
                    {appt.patient_avatar ? (
                      <img src={appt.patient_avatar} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{appt.patient_name ?? 'Paciente'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTime(appt.scheduled_at)} – {endTime} · {MODE_LABEL[appt.mode]}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${STATUS_STYLES[appt.status]}`}>
                      {STATUS_LABEL[appt.status]}
                    </span>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* ── DESKTOP full grid ─────────────────────────────────────────────── */}
      <div className="hidden sm:block">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{d}</div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className={`grid grid-cols-7 ${wi < weeks.length - 1 ? 'border-b border-gray-200' : ''}`}>
              {week.map((day, di) => {
                if (!day) return <div key={`e-${wi}-${di}`} className="min-h-[120px] bg-gray-50/40 border-r border-gray-200 last:border-r-0" />
                const key = toDateKey(day)
                const dayAppts = apptsByDay.get(key) ?? []
                const isToday = day.toDateString() === today.toDateString()
                const isPastDay = day < today
                const visible = dayAppts.slice(0, MAX_VISIBLE)
                const overflow = dayAppts.length - MAX_VISIBLE

                return (
                  <div key={key} className={`min-h-[120px] p-1.5 flex flex-col border-r border-gray-200 last:border-r-0 transition-colors ${isPastDay ? 'bg-gray-50/60' : 'bg-white hover:bg-teal-50/20'}`}>
                    <div className="flex items-center justify-end mb-1">
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#33C7BE] text-white' : isPastDay ? 'text-gray-400' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 space-y-0.5">
                      {visible.map(appt => (
                        <button
                          key={appt.id}
                          onClick={() => onSelect(appt)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate leading-5 transition-opacity hover:opacity-80 ${EVENT_BG[appt.status]}`}
                          title={`${formatTime(appt.scheduled_at)} · ${appt.patient_name ?? 'Paciente'}`}
                        >
                          {formatTime(appt.scheduled_at)} · {appt.patient_name?.split(' ')[0] ?? 'Pac.'}
                        </button>
                      ))}
                      {overflow > 0 && (
                        <button
                          onClick={() => setOverflowDay(overflowDay === key ? null : key)}
                          className="w-full text-left px-1.5 py-0.5 text-xs text-gray-500 hover:text-[#33C7BE] font-medium"
                        >
                          +{overflow} más
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Overflow popover */}
        {overflowDay && (() => {
          const dayAppts = apptsByDay.get(overflowDay) ?? []
          return (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800">{formatDate(new Date(overflowDay + 'T12:00:00-06:00').toISOString())}</p>
                <button onClick={() => setOverflowDay(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              {dayAppts.map(appt => (
                <button key={appt.id} onClick={() => { onSelect(appt); setOverflowDay(null) }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 ${EVENT_BG[appt.status]}`}>
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {formatTime(appt.scheduled_at)} · {appt.patient_name ?? 'Paciente'}
                </button>
              ))}
            </div>
          )
        })()}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded bg-[#33C7BE]" /> Confirmada</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> Pendiente</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded bg-gray-200" /> Historial</span>
        </div>
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, count, children, accent }: {
  title: string
  count: number
  children: React.ReactNode
  accent?: boolean
}) {
  if (count === 0) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h2>
        <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${
          accent ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = 'calendar' | 'list'

export default function Agenda() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [view, setView] = useState<View>('calendar')
  const [selectedAppt, setSelectedAppt] = useState<AppointmentWithPatient | null>(null)
  const [showPatientPicker, setShowPatientPicker] = useState(false)
  const [bookingPatient, setBookingPatient] = useState<PatientProfileLite | null>(null)

  const load = useCallback(() => {
    getDoctorAppointments().then(data => {
      setAppointments(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleConfirm(appt: AppointmentWithPatient) {
    setActionLoading(appt.id)
    try {
      const ok = await updateAppointmentStatus(appt.id, 'confirmed')
      if (!ok) return

      try {
        const tokens = await getValidGoogleCalendarTokens()
        if (tokens) {
          const d = new Date(appt.scheduled_at)
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const startTime = formatTime(appt.scheduled_at)
          const endTime = addMinutes(appt.scheduled_at, appt.duration_min)
          const calResult = await createGoogleCalendarEvent(tokens.access_token, tokens.calendar_id, {
            title: `Consulta — ${appt.patient_name ?? 'Paciente'}`,
            description: appt.reason ?? '',
            startDateTime: `${dateStr}T${startTime}:00`,
            endDateTime: `${dateStr}T${endTime}:00`,
            timeZone: 'America/Mexico_City',
          })
          if (calResult?.id) {
            await updateAppointmentCalendarEvent(appt.id, calResult.id)
          }
        }
      } catch (calErr) {
        logger.error('Agenda:calendarSync', calErr)
      }

      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'confirmed' as const } : a))
      setSelectedAppt(prev => prev?.id === appt.id ? { ...prev, status: 'confirmed' as const } : prev)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancel(apptId: string) {
    setActionLoading(apptId)
    try {
      const ok = await updateAppointmentStatus(apptId, 'cancelled')
      if (ok) {
        setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: 'cancelled' as const } : a))
        setSelectedAppt(prev => prev?.id === apptId ? { ...prev, status: 'cancelled' as const } : prev)
        // Delete from Google Calendar (non-fatal)
        deleteAppointmentCalendarEvent(apptId)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const pending = appointments.filter(a => a.status === 'pending' && a.initiated_by === a.patient_id)
  const awaitingPatient = appointments.filter(a => a.status === 'pending' && a.initiated_by !== a.patient_id)
  const upcoming = appointments.filter(a => a.status === 'confirmed' && !isPast(a.scheduled_at))
  const past = appointments.filter(a => isPast(a.scheduled_at) || a.status === 'cancelled' || a.status === 'completed')
  const isEmpty = appointments.length === 0

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Mi Agenda</h1>
            <p className="hidden sm:block text-sm text-gray-500 mt-0.5">Gestiona las solicitudes y citas de tus pacientes</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowPatientPicker(true)}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva cita</span>
            </button>

            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendario</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pending banner */}
        {!loading && pending.length > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {pending.length}
            </span>
            <p className="text-sm font-semibold text-amber-800">
              {pending.length === 1 ? 'Tienes 1 solicitud que requiere confirmación' : `Tienes ${pending.length} solicitudes que requieren confirmación`}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#33C7BE] animate-spin" />
            </div>
          ) : isEmpty ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 flex items-center justify-center">
                <Inbox className="w-8 h-8 text-[#33C7BE]" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Sin citas aún</h3>
              <p className="text-sm text-gray-500">Aquí aparecerán las solicitudes de tus pacientes.</p>
            </div>
          ) : view === 'calendar' ? (
            <div className="p-5">
              <CalendarView
                appointments={appointments}
                onSelect={setSelectedAppt}
              />
            </div>
          ) : (
            <div className="p-5 space-y-8">
              <Section title="Requieren confirmación" count={pending.length} accent>
                {pending.map(appt => (
                  <AppointmentRow key={appt.id} appt={appt} onClick={() => setSelectedAppt(appt)} />
                ))}
              </Section>

              <Section title="Esperando respuesta del paciente" count={awaitingPatient.length}>
                {awaitingPatient.map(appt => (
                  <AppointmentRow key={appt.id} appt={appt} onClick={() => setSelectedAppt(appt)} />
                ))}
              </Section>

              <Section title="Próximas confirmadas" count={upcoming.length}>
                {upcoming.map(appt => (
                  <AppointmentRow key={appt.id} appt={appt} onClick={() => setSelectedAppt(appt)} />
                ))}
              </Section>

              <Section title="Historial" count={past.length}>
                {past.map(appt => (
                  <AppointmentRow key={appt.id} appt={appt} onClick={() => setSelectedAppt(appt)} />
                ))}
              </Section>
            </div>
          )}
        </div>
      </div>

      {/* Patient picker */}
      {showPatientPicker && user && (
        <PatientPickerModal
          doctorId={user.id}
          onSelect={patient => {
            setShowPatientPicker(false)
            setBookingPatient(patient)
          }}
          onClose={() => setShowPatientPicker(false)}
        />
      )}

      {/* Agendar cita modal */}
      {bookingPatient && (
        <AgendarCitaModal
          patientId={bookingPatient.id}
          patientName={bookingPatient.full_name ?? 'Paciente'}
          onClose={() => setBookingPatient(null)}
          onSuccess={() => {
            setBookingPatient(null)
            // Reload appointments
            getDoctorAppointments().then(setAppointments)
          }}
        />
      )}

      {/* Detail modal */}
      {selectedAppt && (
        <AppointmentDetailModal
          appt={selectedAppt}
          actionLoading={actionLoading === selectedAppt.id}
          onConfirm={() => handleConfirm(selectedAppt)}
          onCancel={() => handleCancel(selectedAppt.id)}
          onClose={() => setSelectedAppt(null)}
        />
      )}
    </DashboardLayout>
  )
}
