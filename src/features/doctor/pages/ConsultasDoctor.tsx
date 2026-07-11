import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  Building2,
  Video,
  Phone,
  Loader2,
  Inbox,
  ChevronRight,
  Search,
  CalendarDays,
  Plus,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import {
  getDoctorAppointments,
  type AppointmentWithPatient,
  type AppointmentMode,
  type AppointmentStatus,
} from '@/shared/lib/queries/appointments'
import { type PatientProfileLite } from '@/features/doctor/services/patients'
import AgendarCitaModal from '@/shared/components/appointments/AgendarCitaModal'
import PatientPickerModal from '@/shared/components/appointments/PatientPickerModal'
import { useAuth } from '@/app/providers/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const FILTER_TABS: { key: AppointmentStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
]

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

// ─── Appointment Row ───────────────────────────────────────────────────────────

function AppointmentRow({ appt, onClick }: { appt: AppointmentWithPatient; onClick: () => void }) {
  const initials = (appt.patient_name ?? 'P')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 transition-all hover:shadow-md hover:border-teal-100 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        {appt.patient_avatar ? (
          <img
            src={appt.patient_avatar}
            alt=""
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {appt.patient_name ?? 'Paciente'}
            </p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${STATUS_STYLES[appt.status]}`}
            >
              {STATUS_LABEL[appt.status]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatDate(appt.scheduled_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(appt.scheduled_at)} · {appt.duration_min} min
            </span>
            <span className="flex items-center gap-1">
              {MODE_ICON[appt.mode]}
              {MODE_LABEL[appt.mode]}
            </span>
          </div>
          {appt.reason && <p className="mt-1 text-xs text-gray-400 truncate">{appt.reason}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultasDoctor() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showPatientPicker, setShowPatientPicker] = useState(false)
  const [bookingPatient, setBookingPatient] = useState<PatientProfileLite | null>(null)

  const load = useCallback(() => {
    getDoctorAppointments().then((data) => {
      setAppointments(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let list = appointments
    if (filter !== 'all') list = list.filter((a) => a.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          (a.patient_name ?? '').toLowerCase().includes(q) ||
          (a.reason ?? '').toLowerCase().includes(q),
      )
    }
    return list.sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
    )
  }, [appointments, filter, search])

  const counts = useMemo(
    () => ({
      pending: appointments.filter((a) => a.status === 'pending').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    }),
    [appointments],
  )

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Consultas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {appointments.length} consulta{appointments.length !== 1 ? 's' : ''} en total
            </p>
          </div>
          <button
            onClick={() => setShowPatientPicker(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva cita
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Pendientes',
              count: counts.pending,
              color: 'bg-amber-50 text-amber-700 border-amber-100',
            },
            {
              label: 'Confirmadas',
              count: counts.confirmed,
              color: 'bg-green-50 text-green-700 border-green-100',
            },
            {
              label: 'Completadas',
              count: counts.completed,
              color: 'bg-gray-100 text-gray-600 border-gray-200',
            },
            {
              label: 'Canceladas',
              count: counts.cancelled,
              color: 'bg-red-50 text-red-600 border-red-100',
            },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por paciente o motivo..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.key === 'all' ? appointments.length : counts[tab.key as AppointmentStatus]
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  filter === tab.key
                    ? 'bg-[#33C7BE] text-white border-[#33C7BE]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-teal-200'
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full ${
                    filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#33C7BE] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">
              {search || filter !== 'all' ? 'Sin resultados' : 'No hay consultas aún'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((appt) => (
              <AppointmentRow
                key={appt.id}
                appt={appt}
                onClick={() => navigate(`/dashboard/mis-consultas/${appt.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showPatientPicker && user && (
        <PatientPickerModal
          doctorId={user.id}
          onSelect={(patient) => {
            setShowPatientPicker(false)
            setBookingPatient(patient)
          }}
          onClose={() => setShowPatientPicker(false)}
        />
      )}

      {bookingPatient && (
        <AgendarCitaModal
          patientId={bookingPatient.id}
          patientName={bookingPatient.full_name ?? 'Paciente'}
          onClose={() => setBookingPatient(null)}
          onSuccess={() => {
            setBookingPatient(null)
            getDoctorAppointments().then((data) => setAppointments(data))
          }}
        />
      )}
    </DashboardLayout>
  )
}
