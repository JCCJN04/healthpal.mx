import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarDays, Clock, Building2, Video, Phone, Loader2, Inbox, Check, X, Search, ArrowLeft, ArrowRight, List, ChevronRight, FileText, StickyNote } from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { getPatientAppointments, updateAppointmentStatus, type AppointmentWithDoctor, type AppointmentMode, type AppointmentStatus } from '@/shared/lib/queries/appointments'
import { deleteAppointmentCalendarEvent } from '@/shared/lib/googleCalendar'
import { useAuth } from '@/app/providers/AuthContext'
import { getPatientDoctors, type DoctorWithProfile } from '@/features/patient/services/doctors'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_LONG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

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

// ─── Appointment Detail Modal ─────────────────────────────────────────────────

function AppointmentDetailModal({
  appt,
  actionLoading,
  onAccept,
  onDecline,
  onCancel,
  onClose,
}: {
  appt: AppointmentWithDoctor
  actionLoading: boolean
  onAccept: () => void
  onDecline: () => void
  onCancel: () => void
  onClose: () => void
}) {
  const initials = (appt.doctor_name ?? 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const isDoctorProposed = appt.status === 'pending' && appt.initiated_by !== appt.patient_id
  const isPatientProposed = appt.status === 'pending' && appt.initiated_by === appt.patient_id
  const endTime = (() => {
    const endMs = new Date(appt.scheduled_at).getTime() + appt.duration_min * 60_000
    return new Date(endMs).toLocaleTimeString('es-MX', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Detalle de cita</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Doctor */}
          <div className="flex items-center gap-3">
            {appt.doctor_avatar ? (
              <img src={appt.doctor_avatar} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{appt.doctor_name ?? 'Doctor'}</p>
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

          {appt.reason && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Motivo
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{appt.reason}</p>
            </div>
          )}

          {appt.notes && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> Notas adicionales
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{appt.notes}</p>
            </div>
          )}

          {appt.status === 'pending' && (
            <p className="text-xs text-center text-gray-400">
              {isDoctorProposed ? 'Tu doctor propone esta cita — requiere tu respuesta' : 'Esperando confirmación del doctor'}
            </p>
          )}

          {/* Actions */}
          {isDoctorProposed && (
            <div className="flex gap-3 pt-1">
              <button onClick={onAccept} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 text-sm">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Aceptar
              </button>
              <button onClick={onDecline} disabled={actionLoading}
                className="px-4 flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm">
                <X className="w-4 h-4" />
                Rechazar
              </button>
            </div>
          )}

          {isPatientProposed && (
            <button onClick={onCancel} disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Cancelar solicitud
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Appointment Row (clickable) ──────────────────────────────────────────────

const STATUS_LEFT_BORDER: Record<AppointmentStatus, string> = {
  pending:   'border-l-amber-400',
  confirmed: 'border-l-[#33C7BE]',
  cancelled: 'border-l-red-300',
  completed: 'border-l-gray-300',
}

function AppointmentCard({
  appt,
  onClick,
}: {
  appt: AppointmentWithDoctor
  onClick: () => void
}) {
  const past = isPast(appt.scheduled_at)
  const initials = (appt.doctor_name ?? 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const isDoctorProposed = appt.status === 'pending' && appt.initiated_by !== appt.patient_id
  const endMs = new Date(appt.scheduled_at).getTime() + appt.duration_min * 60_000
  const endTime = new Date(endMs).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border-l-4 border border-gray-100 shadow-sm transition-all hover:shadow-md active:scale-[0.995] overflow-hidden ${STATUS_LEFT_BORDER[appt.status]} ${past && appt.status !== 'confirmed' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        {/* Avatar */}
        {appt.doctor_avatar ? (
          <img src={appt.doctor_avatar} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-gray-900 text-sm truncate flex-1">{appt.doctor_name ?? 'Doctor'}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border flex-shrink-0 ${STATUS_STYLES[appt.status]}`}>
              {STATUS_LABEL[appt.status]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1 font-medium text-gray-700 flex-shrink-0">
              <Clock className="w-3 h-3 text-[#33C7BE]" />
              {formatTime(appt.scheduled_at)} – {endTime}
            </span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1 flex-shrink-0">
              <CalendarDays className="w-3 h-3" />
              {formatDate(appt.scheduled_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              {MODE_ICON[appt.mode]}
              {MODE_LABEL[appt.mode]}
            </span>
            {isDoctorProposed && <span className="text-blue-500 font-medium truncate">· Tu doctor propone esta cita</span>}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>
    </button>
  )
}

// ─── Shared calendar helpers ──────────────────────────────────────────────────

const EVENT_BG: Record<AppointmentStatus, string> = {
  confirmed: 'bg-[#33C7BE] text-white',
  pending:   'bg-amber-400 text-white',
  cancelled: 'bg-red-100 text-red-500',
  completed: 'bg-gray-100 text-gray-500',
}

const DOT_COLOR: Record<AppointmentStatus, string> = {
  confirmed: 'bg-[#33C7BE]',
  pending:   'bg-amber-400',
  cancelled: 'bg-red-300',
  completed: 'bg-gray-300',
}

function dotPriority(appts: { status: AppointmentStatus }[]): string {
  if (appts.some(a => a.status === 'pending'))   return DOT_COLOR.pending
  if (appts.some(a => a.status === 'confirmed'))  return DOT_COLOR.confirmed
  if (appts.some(a => a.status === 'cancelled'))  return DOT_COLOR.cancelled
  return DOT_COLOR.completed
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({
  appointments,
  onSelect,
}: {
  appointments: AppointmentWithDoctor[]
  onSelect: (appt: AppointmentWithDoctor) => void
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedKey, setSelectedKey] = useState<string>(() => toDateKey(today))
  const [overflowDay, setOverflowDay] = useState<string | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const apptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithDoctor[]>()
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

  const selectedAppts = apptsByDay.get(selectedKey) ?? []
  const selectedDate = new Date(selectedKey + 'T12:00:00-06:00')
  const isSelectedToday = selectedKey === toDateKey(today)

  const MAX_VISIBLE = 3

  // Shared month nav + weekday header
  const nav = (
    <div className="flex items-center justify-between mb-3">
      <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors active:scale-95">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="text-center">
        <h2 className="text-base font-bold text-gray-900 capitalize">{MONTHS_LONG[month]} {year}</h2>
      </div>
      <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors active:scale-95">
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )

  const weekdayRow = (
    <div className="grid grid-cols-7 mb-1">
      {['D','L','M','X','J','V','S'].map((d, i) => (
        <div key={i} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
      ))}
    </div>
  )

  return (
    <div className="select-none">
      {/* ── MOBILE ── */}
      <div className="sm:hidden space-y-4">
        {nav}
        {weekdayRow}

        {/* Compact dot grid */}
        <div className="grid grid-cols-7">
          {weeks.flat().map((day, i) => {
            if (!day) return <div key={`m-e-${i}`} className="h-11" />
            const key = toDateKey(day)
            const dayAppts = apptsByDay.get(key) ?? []
            const isToday = day.toDateString() === today.toDateString()
            const isSelected = key === selectedKey

            return (
              <button key={key} onClick={() => setSelectedKey(key)}
                className="flex flex-col items-center justify-center h-11 rounded-xl transition-all active:scale-90">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  isSelected ? 'bg-[#33C7BE] text-white shadow-md' :
                  isToday ? 'ring-2 ring-[#33C7BE] text-[#33C7BE]' :
                  'text-gray-700'
                }`}>
                  {day.getDate()}
                </span>
                {dayAppts.length > 0 && !isSelected && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotPriority(dayAppts)}`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected day event list */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            {isSelectedToday ? 'Hoy' : selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' })}
            {selectedAppts.length > 0 && <span className="ml-2 text-[#33C7BE]">· {selectedAppts.length} cita{selectedAppts.length > 1 ? 's' : ''}</span>}
          </p>
          {selectedAppts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <CalendarDays className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Sin citas este día</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedAppts.map(appt => {
                const endMs = new Date(appt.scheduled_at).getTime() + appt.duration_min * 60_000
                const endTime = new Date(endMs).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false })
                const initials = (appt.doctor_name ?? 'D').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
                return (
                  <button key={appt.id} onClick={() => onSelect(appt)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white shadow-sm active:scale-[0.98] transition-all hover:shadow-md">
                    {appt.doctor_avatar
                      ? <img src={appt.doctor_avatar} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt="" />
                      : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initials}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{appt.doctor_name ?? 'Doctor'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-semibold text-gray-700">{formatTime(appt.scheduled_at)} – {endTime}</span>
                        {' · '}{MODE_LABEL[appt.mode]}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 border ${STATUS_STYLES[appt.status]}`}>
                      {STATUS_LABEL[appt.status]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden sm:block">
        {nav}

        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80">
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className={`grid grid-cols-7 ${wi < weeks.length - 1 ? 'border-b border-gray-200' : ''}`}>
              {week.map((day, di) => {
                if (!day) return <div key={`e-${wi}-${di}`} className="min-h-[120px] bg-gray-50/50 border-r border-gray-100 last:border-r-0" />
                const key = toDateKey(day)
                const dayAppts = apptsByDay.get(key) ?? []
                const isToday = day.toDateString() === today.toDateString()
                const isPastDay = day < today
                const visible = dayAppts.slice(0, MAX_VISIBLE)
                const overflow = dayAppts.length - MAX_VISIBLE

                return (
                  <div key={key} className={`min-h-[120px] p-2 flex flex-col border-r border-gray-100 last:border-r-0 ${isPastDay ? 'bg-gray-50/60' : 'bg-white hover:bg-teal-50/20 transition-colors'}`}>
                    <div className="flex justify-end mb-1.5">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? 'bg-[#33C7BE] text-white shadow-sm' : isPastDay ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'
                      }`}>{day.getDate()}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      {visible.map(appt => (
                        <button key={appt.id} onClick={() => onSelect(appt)}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs font-medium truncate transition-all hover:opacity-90 hover:shadow-sm ${EVENT_BG[appt.status]}`}
                          title={`${formatTime(appt.scheduled_at)} · ${appt.doctor_name ?? 'Doctor'}`}>
                          {formatTime(appt.scheduled_at)} · {appt.doctor_name?.split(' ')[0] ?? 'Dr.'}
                        </button>
                      ))}
                      {overflow > 0 && (
                        <button onClick={() => setOverflowDay(overflowDay === key ? null : key)}
                          className="w-full text-left px-2 py-0.5 text-xs text-gray-400 hover:text-[#33C7BE] font-medium transition-colors">
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
            <div className="mt-3 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-800">{formatDate(new Date(overflowDay + 'T12:00:00-06:00').toISOString())}</p>
                <button onClick={() => setOverflowDay(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              {dayAppts.map(appt => (
                <button key={appt.id} onClick={() => { onSelect(appt); setOverflowDay(null) }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 hover:shadow-sm ${EVENT_BG[appt.status]}`}>
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  {formatTime(appt.scheduled_at)} · {appt.doctor_name ?? 'Doctor'}
                </button>
              ))}
            </div>
          )
        })()}

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4">
          {([['confirmed','Confirmada'],['pending','Pendiente'],['cancelled','Cancelada'],['completed','Completada']] as [AppointmentStatus,string][]).map(([s, label]) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-sm ${EVENT_BG[s].split(' ')[0]}`} /> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Doctor Picker Modal ──────────────────────────────────────────────────────

function DoctorPickerModal({
  patientId,
  onSelect,
  onClose,
}: {
  patientId: string
  onSelect: (doctorId: string) => void
  onClose: () => void
}) {
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getPatientDoctors(patientId).then(data => {
      setDoctors(data)
      setLoadingDocs(false)
    })
  }, [patientId])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return doctors
    return doctors.filter(d => (d.full_name ?? '').toLowerCase().includes(q))
  }, [doctors, query])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">¿Con qué doctor?</h2>
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
              placeholder="Buscar doctor..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {loadingDocs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#33C7BE] animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                {doctors.length === 0 ? 'No tienes doctores vinculados aún.' : 'Sin resultados.'}
              </p>
            ) : (
              filtered.map(doc => {
                const initials = (doc.full_name ?? 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <button
                    key={doc.id}
                    onClick={() => onSelect(doc.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-teal-50 transition-colors text-left"
                  >
                    {doc.avatar_url ? (
                      <img src={doc.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{doc.full_name ?? 'Doctor'}</p>
                      {doc.doctor_profile?.specialty && (
                        <p className="text-xs text-gray-400 truncate">{doc.doctor_profile.specialty}</p>
                      )}
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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 flex items-center justify-center">
        <Inbox className="w-8 h-8 text-[#33C7BE]" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">Sin consultas aún</h3>
      <p className="text-sm text-gray-500 mb-6">Agenda una cita con uno de tus doctores.</p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nueva consulta
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'upcoming' | 'past'
type View = 'list' | 'calendar'

export default function Consultas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentWithDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')
  const [view, setView] = useState<View>('list')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDoctorPicker, setShowDoctorPicker] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<AppointmentWithDoctor | null>(null)

  useEffect(() => {
    getPatientAppointments().then(data => {
      setAppointments(data)
      setLoading(false)
    })
  }, [])

  function patchStatus(apptId: string, status: AppointmentStatus) {
    setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status } : a))
    setSelectedAppt(prev => prev?.id === apptId ? { ...prev, status } : prev)
  }

  async function handleAccept(apptId: string) {
    setActionLoading(apptId)
    const ok = await updateAppointmentStatus(apptId, 'confirmed')
    if (ok) patchStatus(apptId, 'confirmed')
    setActionLoading(null)
  }

  async function handleDecline(apptId: string) {
    setActionLoading(apptId)
    const ok = await updateAppointmentStatus(apptId, 'cancelled')
    if (ok) {
      patchStatus(apptId, 'cancelled')
      deleteAppointmentCalendarEvent(apptId)
    }
    setActionLoading(null)
  }

  async function handleCancel(apptId: string) {
    setActionLoading(apptId)
    const ok = await updateAppointmentStatus(apptId, 'cancelled')
    if (ok) {
      patchStatus(apptId, 'cancelled')
      deleteAppointmentCalendarEvent(apptId)
    }
    setActionLoading(null)
  }

  const upcoming = appointments.filter(a =>
    !isPast(a.scheduled_at) || a.status === 'pending'
  ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const past = appointments.filter(a =>
    isPast(a.scheduled_at) && a.status !== 'pending'
  )

  const displayed = tab === 'upcoming' ? upcoming : past

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Mis Consultas</h1>
            <p className="hidden sm:block text-sm text-gray-500 mt-0.5">Gestiona tus citas médicas</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendario</span>
              </button>
            </div>

            <button
              onClick={() => setShowDoctorPicker(true)}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva cita</span>
            </button>
          </div>
        </div>

        {/* Stats row */}
        {!loading && appointments.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Confirmadas', count: appointments.filter(a => a.status === 'confirmed').length, color: 'text-[#33C7BE]', bg: 'bg-teal-50' },
              { label: 'Pendientes',  count: appointments.filter(a => a.status === 'pending').length,   color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Canceladas',  count: appointments.filter(a => a.status === 'cancelled').length, color: 'text-red-500',   bg: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {view === 'list' ? (
            <>
              {/* List tabs */}
              <div className="flex border-b border-gray-100 px-2 pt-1">
                {([['upcoming', 'Próximas'], ['past', 'Historial']] as [Tab, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`px-4 py-3 text-sm font-semibold transition-colors relative ${
                      tab === id ? 'text-[#33C7BE]' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#33C7BE] rounded-t" />}
                    {label}
                    {id === 'upcoming' && upcoming.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-[#33C7BE] text-white">
                        {upcoming.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-5">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-7 h-7 text-[#33C7BE] animate-spin" />
                  </div>
                ) : displayed.length === 0 ? (
                  <EmptyState onNew={() => setShowDoctorPicker(true)} />
                ) : (
                  <div className="space-y-2">
                    {displayed.map(appt => (
                      <AppointmentCard
                        key={appt.id}
                        appt={appt}
                        onClick={() => setSelectedAppt(appt)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 text-[#33C7BE] animate-spin" />
                </div>
              ) : appointments.length === 0 ? (
                <EmptyState onNew={() => setShowDoctorPicker(true)} />
              ) : (
                <CalendarView
                  appointments={appointments}
                  onSelect={setSelectedAppt}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {selectedAppt && (
        <AppointmentDetailModal
          appt={selectedAppt}
          actionLoading={actionLoading === selectedAppt.id}
          onAccept={() => handleAccept(selectedAppt.id)}
          onDecline={() => handleDecline(selectedAppt.id)}
          onCancel={() => handleCancel(selectedAppt.id)}
          onClose={() => setSelectedAppt(null)}
        />
      )}

      {showDoctorPicker && user && (
        <DoctorPickerModal
          patientId={user.id}
          onSelect={doctorId => {
            setShowDoctorPicker(false)
            navigate(`/dashboard/consultas/nueva?doctor=${doctorId}`)
          }}
          onClose={() => setShowDoctorPicker(false)}
        />
      )}
    </DashboardLayout>
  )
}
