// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import {
  Clock, Building2, Video, Phone, Loader2, Inbox,
  Check, X, UserCircle2, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { useAuth } from '@/app/providers/AuthContext'
import { getMyDoctorLink, linkPendingInvitations, type DoctorAssistant } from '@/shared/lib/queries/assistants'
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import { showToast } from '@/shared/components/ui/Toast'
import AgendarCitaModal from '@/shared/components/appointments/AgendarCitaModal'
import type { AppointmentMode, AppointmentStatus, AppointmentWithPatient } from '@/shared/lib/queries/appointments'

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
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', year: 'numeric',
  })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
function toDateKey(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}
function apptDateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

async function getAppointmentsForDoctor(doctorId: string): Promise<AppointmentWithPatient[]> {
  const { data: appts, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('scheduled_at', { ascending: true })

  if (error) { logger.error('assistant:getAppointments', error); return [] }
  if (!appts?.length) return []

  const patientIds = [...new Set(appts.map(a => a.patient_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', patientIds)

  const map = new Map((profiles ?? []).map(p => [p.id, p]))
  return appts.map(a => ({
    ...a,
    patient_name: map.get(a.patient_id)?.full_name ?? null,
    patient_avatar: map.get(a.patient_id)?.avatar_url ?? null,
  })) as AppointmentWithPatient[]
}

async function setStatus(appointmentId: string, status: AppointmentStatus) {
  const { error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
  if (error) throw error
}

export default function AssistantAgenda() {
  const { user } = useAuth()
  const [link, setLink] = useState<DoctorAssistant | null>(null)
  const [linkLoading, setLinkLoading] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([])
  const [loading, setLoading] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)

  // Calendar state
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(today))

  useEffect(() => {
    // Auto-link any pending invitations by email (covers case where doctor
    // added the assistant before they registered, or assistant_id was null)
    linkPendingInvitations().then(() =>
      getMyDoctorLink().then(l => {
        setLink(l)
        setLinkLoading(false)
      })
    )
  }, [])

  const load = useCallback(() => {
    if (!link) return
    setLoading(true)
    getAppointmentsForDoctor(link.doctor_id)
      .then(data => { setAppointments(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [link])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await setStatus(id, status)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      showToast(status === 'confirmed' ? 'Cita confirmada' : 'Cita cancelada', 'success')
    } catch (err) {
      logger.error('assistant:setStatus', err)
      showToast('Error al actualizar cita', 'error')
    }
  }

  // Calendar helpers
  const firstDay = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startOffset = firstDay.getDay()

  const apptsByDate = appointments.reduce<Record<string, number>>((acc, a) => {
    if (a.status === 'cancelled') return acc
    const k = apptDateKey(a.scheduled_at)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  const dayAppointments = appointments.filter(a => apptDateKey(a.scheduled_at) === selectedDate)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  if (linkLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!link) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <UserCircle2 size={32} className="text-amber-400" />
          </div>
          <p className="font-bold text-gray-800 mb-2">Aún no estás vinculado a ningún médico</p>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Para poder usar tu cuenta, el médico al que asistes debe agregarte desde su configuración.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left max-w-sm w-full space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Pasos a seguir</p>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Dile al médico que inicie sesión en Healthpal</li>
              <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Ir a <strong>Configuración → Asistentes</strong></li>
              <li className="flex gap-2"><span className="font-bold text-primary">3.</span> Agregar tu correo: <strong className="break-all">{user?.email}</strong></li>
              <li className="flex gap-2"><span className="font-bold text-primary">4.</span> Una vez agregado, cierra sesión y vuelve a entrar</li>
            </ol>
          </div>
          <button
            onClick={() => linkPendingInvitations().then(() => window.location.reload())}
            className="mt-5 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Ya me agregaron — Recargar
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agenda</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Asistiendo a <span className="font-semibold text-primary">{link.doctor?.full_name ?? 'médico'}</span>
            </p>
          </div>
          <button
            onClick={() => setBookingOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> Nueva cita
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          {/* Mini calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <span className="text-sm font-bold text-gray-800">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg">
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isSelected = key === selectedDate
                const isToday = key === toDateKey(today)
                const count = apptsByDate[key] ?? 0
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(key)}
                    className={`relative flex flex-col items-center justify-center h-9 w-full rounded-xl text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary text-white'
                        : isToday
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {day}
                    {count > 0 && (
                      <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Appointments for selected date */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800">
                {formatDate(selectedDate + 'T12:00:00')}
              </h2>
              {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
            </div>

            {dayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox size={28} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Sin citas este día</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayAppointments.map(appt => (
                  <div
                    key={appt.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {appt.patient_avatar
                        ? <img src={appt.patient_avatar} className="w-10 h-10 object-cover" />
                        : <UserCircle2 size={20} className="text-gray-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {appt.patient_name ?? 'Paciente'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={11} /> {formatTime(appt.scheduled_at)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          {MODE_ICON[appt.mode]} {MODE_LABEL[appt.mode]}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[appt.status]}`}>
                          {STATUS_LABEL[appt.status]}
                        </span>
                      </div>
                      {appt.reason && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{appt.reason}</p>
                      )}
                    </div>
                    {appt.status === 'pending' && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleStatusChange(appt.id, 'confirmed')}
                          title="Confirmar"
                          className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleStatusChange(appt.id, 'cancelled')}
                          title="Cancelar"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {bookingOpen && link && (
        <AgendarCitaModal
          doctorId={link.doctor_id}
          doctorName={link.doctor?.full_name ?? 'Médico'}
          onClose={() => setBookingOpen(false)}
          onBooked={() => {
            setBookingOpen(false)
            load()
          }}
        />
      )}
    </DashboardLayout>
  )
}
