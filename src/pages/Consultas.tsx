import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Calendar,
  Clock,
  User,
  Loader2,
  ChevronRight,
  MapPin,
  Video,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { listUpcomingAppointments, listPastAppointments, AppointmentWithDetails } from '../lib/queries/appointments'
import { useAuth } from '../context/AuthContext'
import type { Database } from '../types/database'

type AppointmentStatus = Database['public']['Enums']['appointment_status']
type VisitMode = Database['public']['Enums']['visit_mode']

const statusConfig: Record<AppointmentStatus, { label: string; icon: any; color: string; bg: string }> = {
  confirmed: { label: 'Confirmada', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  requested: { label: 'Pendiente', icon: AlertCircle, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  completed: { label: 'Completada', icon: CheckCircle, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  cancelled: { label: 'Cancelada', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  rejected: { label: 'Rechazada', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  no_show: { label: 'No asistió', icon: XCircle, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
}

const modeConfig: Record<VisitMode, { label: string; icon: any; color: string }> = {
  in_person: { label: 'Presencial', icon: MapPin, color: 'text-blue-600' },
  video: { label: 'Video', icon: Video, color: 'text-purple-600' },
  phone: { label: 'Teléfono', icon: Phone, color: 'text-green-600' },
}

export default function Consultas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pastAppointments, setPastAppointments] = useState<AppointmentWithDetails[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modeFilter, setModeFilter] = useState<string>('all')

  useEffect(() => {
    loadAppointments()
  }, [user])

  const loadAppointments = async () => {
    if (!user) return
    setLoading(true)
    const [upcoming, past] = await Promise.all([
      listUpcomingAppointments({ userId: user.id }),
      listPastAppointments({ userId: user.id })
    ])
    setUpcomingAppointments(upcoming || [])
    setPastAppointments(past || [])
    setLoading(false)
  }

  const filterList = (list: AppointmentWithDetails[]) => {
    return list.filter(apt => {
      const matchesSearch =
        apt.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.doctor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.patient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter
      const matchesMode = modeFilter === 'all' || apt.mode === modeFilter

      return matchesSearch && matchesStatus && matchesMode
    })
  }

  const AppointmentItem = ({ apt }: { apt: AppointmentWithDetails }) => {
    const status = statusConfig[apt.status]
    const mode = modeConfig[apt.mode]
    const startDate = new Date(apt.start_at)

    return (
      <div
        onClick={() => navigate(`/dashboard/consultas/${apt.id}`)}
        className="group bg-white p-5 border border-gray-100 rounded-xl hover:border-[#33C7BE] hover:shadow-md transition-all cursor-pointer relative"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-[#33C7BE]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-[#33C7BE] transition-colors line-clamp-1">
                {apt.reason || 'Consulta Médica'}
              </h3>
              <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                Con <span className="font-semibold">{apt.doctor?.full_name || 'Especialista'}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {startDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${mode?.color || 'text-gray-500'}`}>
                  {mode?.icon && <mode.icon className="w-3.5 h-3.5" />}
                  {mode?.label || 'Presencial'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className={`px-3 py-1.25 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${status.bg} ${status.color}`}>
              <status.icon className="w-4 h-4" />
              {status.label.toUpperCase()}
            </div>
            <button className="p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-[#33C7BE]/10 group-hover:text-[#33C7BE] transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mis Consultas</h1>
            <p className="text-gray-500 font-medium mt-1 text-sm">Gestiona tus citas y revisa tu historial médico.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/consultas/nueva')}
            className="px-6 py-3 bg-[#33C7BE] text-white font-bold rounded-xl hover:bg-[#2bb5ad] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Agendar Nueva
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por motivo, doctor o paciente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#33C7BE]/20 transition-all font-medium text-gray-700"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#33C7BE]/20 font-bold text-gray-600 text-sm cursor-pointer ml-1"
            >
              <option value="all">TODOS LOS ESTADOS</option>
              <option value="requested">PENDIENTE</option>
              <option value="confirmed">CONFIRMADA</option>
              <option value="completed">COMPLETADA</option>
              <option value="cancelled">CANCELADA</option>
            </select>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#33C7BE]/20 font-bold text-gray-600 text-sm cursor-pointer"
            >
              <option value="all">MODALIDAD</option>
              <option value="in_person">PRESENCIAL</option>
              <option value="video">VIDEO</option>
              <option value="phone">TELÉFONO</option>
            </select>
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Loader2 className="w-12 h-12 text-[#33C7BE] animate-spin mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando consultas...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Upcoming */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Consultas Próximas</h2>
                <div className="h-[1px] flex-1 bg-gray-100"></div>
              </div>

              {filterList(upcomingAppointments).length === 0 ? (
                <div className="bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-2xl py-12 text-center">
                  <p className="text-gray-400 font-medium">No se encontraron consultas próximas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filterList(upcomingAppointments).map(apt => (
                    <AppointmentItem key={apt.id} apt={apt} />
                  ))}
                </div>
              )}
            </section>

            {/* History */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Historial de Consultas</h2>
                <div className="h-[1px] flex-1 bg-gray-100"></div>
              </div>

              {filterList(pastAppointments).length === 0 ? (
                <div className="bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-2xl py-12 text-center">
                  <p className="text-gray-400 font-medium">No hay historial disponible.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                  {filterList(pastAppointments).map(apt => (
                    <AppointmentItem key={apt.id} apt={apt} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
