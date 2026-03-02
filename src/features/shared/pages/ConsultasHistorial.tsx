import { useEffect, useState } from 'react'
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
  AlertCircle,
  Star,
  ClipboardCheck,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { listPastAppointments, AppointmentWithDetails } from '@/shared/lib/queries/appointments'
import { updateAppointmentStatus } from '@/shared/lib/queries/appointments'
import { useAuth } from '@/app/providers/AuthContext'
import type { Database } from '@/shared/types/database'
import ReviewWizard from '@/features/patient/components/ReviewWizard'
import { getReviewableAppointments, type ReviewableAppointment } from '@/shared/lib/queries/publicDoctors'

// Status and mode configs (duplicated for standalone page)
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

const AppointmentItem = ({ apt, isDoctor, onClick, canReview, onReview, canComplete, onComplete, completing }: {
  apt: AppointmentWithDetails;
  isDoctor: boolean;
  onClick: () => void;
  canReview?: boolean;
  onReview?: () => void;
  canComplete?: boolean;
  onComplete?: () => void;
  completing?: boolean;
}) => {
  const status = statusConfig[apt.status]
  const mode = modeConfig[apt.mode]
  const startDate = new Date(apt.start_at)
  const counterpartName = isDoctor ? (apt.patient?.full_name || 'Paciente') : (apt.doctor?.full_name || 'Especialista')

  return (
    <div
      onClick={onClick}
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
              {isDoctor ? 'Paciente' : 'Con'} <span className="font-semibold">{counterpartName}</span>
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
          {canComplete && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete?.(); }}
              disabled={completing}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors shrink-0 disabled:opacity-60"
            >
              {completing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardCheck className="w-3 h-3" />}
              Confirmar
            </button>
          )}
          {canReview && (
            <button
              onClick={(e) => { e.stopPropagation(); onReview?.(); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-teal-600 transition-colors shrink-0"
            >
              <Star className="w-3 h-3" />
              Evaluar
            </button>
          )}
          <button className="p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-[#33C7BE]/10 group-hover:text-[#33C7BE] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConsultasHistorial() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const isDoctor = profile?.role === 'doctor'
  const [pastAppointments, setPastAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modeFilter, setModeFilter] = useState<string>('all')
  const [reviewableMap, setReviewableMap] = useState<Map<string, ReviewableAppointment>>(new Map())
  const [selectedForReview, setSelectedForReview] = useState<ReviewableAppointment | null>(null)
  const [completingId, setCompletingId] = useState<string | null>(null)

  useEffect(() => {
    loadAppointments()
  }, [user, profile])

  const loadAppointments = async () => {
    if (!user) return
    setLoading(true)
    const isDoc = profile?.role === 'doctor'
    const [past, reviewable] = await Promise.all([
      listPastAppointments({ userId: user.id, role: profile?.role || undefined }),
      isDoc ? Promise.resolve([]) : getReviewableAppointments(),
    ])
    setPastAppointments(past || [])
    setReviewableMap(new Map((reviewable as ReviewableAppointment[]).map((r) => [r.appointment_id, r])))
    setLoading(false)
  }

  const handleComplete = async (aptId: string) => {
    setCompletingId(aptId)
    const result = await updateAppointmentStatus(aptId, 'completed')
    if (result.success) {
      setPastAppointments((prev) =>
        prev.map((a) => (a.id === aptId ? { ...a, status: 'completed' } : a))
      )
    }
    setCompletingId(null)
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Historial de Consultas</h1>
            <p className="text-gray-500 font-medium mt-1 text-sm">Revisa todas tus consultas pasadas.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/consultas')}
            className="px-6 py-3 bg-white text-primary font-bold rounded-xl hover:bg-gray-50 border border-primary/20 hover:border-primary/40 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            Volver a Mis Consultas
          </button>
        </div>

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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Loader2 className="w-12 h-12 text-[#33C7BE] animate-spin mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando historial...</p>
          </div>
        ) : filterList(pastAppointments).length === 0 ? (
          <div className="bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-2xl py-12 text-center">
            <p className="text-gray-400 font-medium">No hay historial disponible.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filterList(pastAppointments).map(apt => {
              const reviewEntry = reviewableMap.get(apt.id)
              const isPastConfirmed = isDoctor && apt.status === 'confirmed'
              return (
                <AppointmentItem
                  key={apt.id}
                  apt={apt}
                  isDoctor={isDoctor}
                  canReview={!isDoctor && !!reviewEntry && !reviewEntry.already_reviewed}
                  onReview={() => {
                    const r = reviewableMap.get(apt.id)
                    if (r) setSelectedForReview(r)
                  }}
                  canComplete={isPastConfirmed}
                  onComplete={() => handleComplete(apt.id)}
                  completing={completingId === apt.id}
                  onClick={() => navigate(`/dashboard/consultas/${apt.id}`)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Review Wizard */}
      {selectedForReview && (
        <ReviewWizard
          appointment={selectedForReview}
          onClose={() => setSelectedForReview(null)}
          onSuccess={() => {
            const id = selectedForReview.appointment_id
            setSelectedForReview(null)
            setReviewableMap((prev) => {
              const next = new Map(prev)
              const entry = next.get(id)
              if (entry) next.set(id, { ...entry, already_reviewed: true })
              return next
            })
          }}
        />
      )}
    </DashboardLayout>
  )
}
