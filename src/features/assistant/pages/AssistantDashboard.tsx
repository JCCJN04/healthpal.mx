// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, Clock, UserCircle2, Loader2, Plus,
  CheckCircle2, AlertCircle, CalendarCheck, ArrowRight,
  Building2, Video, Phone,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { getMyDoctorLink, linkPendingInvitations, type DoctorAssistant } from '@/shared/lib/queries/assistants'
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import AgendarCitaModal from '@/shared/components/appointments/AgendarCitaModal'
import type { AppointmentMode, AppointmentStatus, AppointmentWithPatient } from '@/shared/lib/queries/appointments'

const MODE_ICON: Record<AppointmentMode, React.ReactNode> = {
  in_person: <Building2 className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  phone: <Phone className="w-3.5 h-3.5" />,
}
const MODE_LABEL: Record<AppointmentMode, string> = {
  in_person: 'Presencial',
  video: 'Videollamada',
  phone: 'Llamada',
}
const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-100',
  confirmed: 'bg-green-50 text-green-700 border-green-100',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
  completed: 'bg-gray-100 text-gray-500 border-gray-200',
}
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

function toDateKey(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}
function apptDateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

async function fetchAppointments(doctorId: string): Promise<AppointmentWithPatient[]> {
  const { data: appts, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('scheduled_at', { ascending: true })

  if (error) { logger.error('assistant:fetchAppts', error); return [] }
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

export default function AssistantDashboard() {
  const navigate = useNavigate()
  const [link, setLink] = useState<DoctorAssistant | null>(null)
  const [linkLoading, setLinkLoading] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([])
  const [apptLoading, setApptLoading] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)

  const today = toDateKey(new Date())

  useEffect(() => {
    linkPendingInvitations().then(() =>
      getMyDoctorLink().then(l => {
        setLink(l)
        setLinkLoading(false)
      })
    )
  }, [])

  const load = useCallback(() => {
    if (!link) return
    setApptLoading(true)
    fetchAppointments(link.doctor_id)
      .then(data => { setAppointments(data); setApptLoading(false) })
      .catch(() => setApptLoading(false))
  }, [link])

  useEffect(() => { load() }, [load])

  const todayAppts = appointments.filter(a => apptDateKey(a.scheduled_at) === today)
  const pendingCount = todayAppts.filter(a => a.status === 'pending').length
  const nextAppt = appointments.find(a =>
    a.status !== 'cancelled' &&
    new Date(a.scheduled_at) > new Date()
  )

  // Upcoming this week (next 7 days, not cancelled)
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7)
  const weekAppts = appointments.filter(a =>
    a.status !== 'cancelled' &&
    new Date(a.scheduled_at) >= new Date() &&
    new Date(a.scheduled_at) <= weekEnd
  )

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
            El médico al que asistes debe agregarte desde su configuración.
          </p>
          <button
            onClick={() => linkPendingInvitations().then(() => window.location.reload())}
            className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Ya me agregaron — Recargar
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inicio</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Asistiendo a{' '}
              <span className="font-semibold text-primary">
                {link.doctor?.full_name ?? 'médico'}
              </span>
            </p>
          </div>
          <button
            onClick={() => setBookingOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> Nueva cita
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarDays size={16} className="text-primary" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hoy</span>
            </div>
            {apptLoading
              ? <div className="h-7 w-12 bg-gray-100 rounded animate-pulse" />
              : <p className="text-2xl font-bold text-gray-900">{todayAppts.length}</p>
            }
            <p className="text-xs text-gray-400 mt-0.5">citas programadas</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertCircle size={16} className="text-amber-500" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pendientes</span>
            </div>
            {apptLoading
              ? <div className="h-7 w-12 bg-gray-100 rounded animate-pulse" />
              : <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            }
            <p className="text-xs text-gray-400 mt-0.5">por confirmar hoy</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                <CalendarCheck size={16} className="text-green-500" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Esta semana</span>
            </div>
            {apptLoading
              ? <div className="h-7 w-12 bg-gray-100 rounded animate-pulse" />
              : <p className="text-2xl font-bold text-gray-900">{weekAppts.length}</p>
            }
            <p className="text-xs text-gray-400 mt-0.5">próximas citas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Next appointment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Próxima cita</h2>
            {apptLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            ) : nextAppt ? (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {nextAppt.patient_avatar
                    ? <img src={nextAppt.patient_avatar} className="w-10 h-10 object-cover" />
                    : <UserCircle2 size={20} className="text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {nextAppt.patient_name ?? 'Paciente'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} />
                      {new Date(nextAppt.scheduled_at).toLocaleDateString('es-MX', {
                        timeZone: 'America/Mexico_City', day: 'numeric', month: 'short',
                      })}{' '}
                      {formatTime(nextAppt.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {MODE_ICON[nextAppt.mode]} {MODE_LABEL[nextAppt.mode]}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[nextAppt.status]}`}>
                      {STATUS_LABEL[nextAppt.status]}
                    </span>
                  </div>
                  {nextAppt.reason && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{nextAppt.reason}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CalendarDays size={24} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Sin citas próximas</p>
              </div>
            )}
          </div>

          {/* Today's appointments */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800">Citas de hoy</h2>
              <button
                onClick={() => navigate('/dashboard/assistant/agenda')}
                className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
              >
                Ver agenda <ArrowRight size={13} />
              </button>
            </div>
            {apptLoading ? (
              <div className="space-y-3">
                {[1,2].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 size={24} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Sin citas hoy</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {todayAppts.map(appt => (
                  <div key={appt.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {appt.patient_avatar
                        ? <img src={appt.patient_avatar} className="w-8 h-8 object-cover" />
                        : <UserCircle2 size={16} className="text-gray-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {appt.patient_name ?? 'Paciente'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Clock size={10} /> {formatTime(appt.scheduled_at)}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[appt.status]}`}>
                          {STATUS_LABEL[appt.status]}
                        </span>
                      </div>
                    </div>
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
          onBooked={() => { setBookingOpen(false); load() }}
        />
      )}
    </DashboardLayout>
  )
}
