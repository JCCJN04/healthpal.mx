import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Building2,
  Video,
  Phone,
  Loader2,
  Check,
  X,
  FileText,
  StickyNote,
  Stethoscope,
  CalendarDays,
  User,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import {
  getAppointmentById,
  updateAppointmentStatus,
  type AppointmentWithPatient,
  type AppointmentMode,
  type AppointmentStatus,
} from '@/shared/lib/queries/appointments'
import StudyResultsSection from '@/features/doctor/components/StudyResultsSection'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODE_LABEL: Record<AppointmentMode, string> = {
  in_person: 'Presencial',
  video: 'Videollamada',
  phone: 'Llamada',
}

const MODE_ICON: Record<AppointmentMode, React.ReactNode> = {
  in_person: <Building2 className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultaDetalleDoctor() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()

  const [appt, setAppt] = useState<AppointmentWithPatient | null>(null)
  const [loadingAppt, setLoadingAppt] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!appointmentId) return
    getAppointmentById(appointmentId)
      .then((data) => {
        setAppt(data)
        setLoadingAppt(false)
      })
      .catch(() => setLoadingAppt(false))
  }, [appointmentId])

  async function handleConfirm() {
    if (!appt) return
    setActionLoading(true)
    try {
      await updateAppointmentStatus(appt.id, 'confirmed')
      setAppt((prev) => (prev ? { ...prev, status: 'confirmed' } : prev))
      showToast('Cita confirmada', 'success')
    } catch (err) {
      logger.error('ConsultaDetalle:confirm', err)
      showToast('Error al confirmar', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!appt) return
    setActionLoading(true)
    try {
      await updateAppointmentStatus(appt.id, 'cancelled')
      setAppt((prev) => (prev ? { ...prev, status: 'cancelled' } : prev))
      showToast('Cita cancelada', 'success')
    } catch (err) {
      logger.error('ConsultaDetalle:cancel', err)
      showToast('Error al cancelar', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loadingAppt) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#33C7BE] animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!appt) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/dashboard/mis-consultas')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <p className="text-gray-500 text-center py-16">Consulta no encontrada.</p>
        </div>
      </DashboardLayout>
    )
  }

  const initials = (appt.patient_name ?? 'P')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const isPatientProposed = appt.initiated_by === appt.patient_id
  const canConfirm = appt.status === 'pending' && isPatientProposed
  const canCancel = appt.status === 'pending' || appt.status === 'confirmed'
  const endTime = addMinutes(appt.scheduled_at, appt.duration_min)

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard/mis-consultas')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Consultas
        </button>

        {/* Patient header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            {appt.patient_avatar ? (
              <img
                src={appt.patient_avatar}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900 text-lg truncate">
                    {appt.patient_name ?? 'Paciente'}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1 ${STATUS_STYLES[appt.status]}`}
                  >
                    {STATUS_LABEL[appt.status]}
                  </span>
                </div>
                <Link
                  to={`/dashboard/pacientes/${appt.patient_id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-lg hover:bg-teal-100 transition-colors flex-shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  Ver perfil
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Detalles de la cita
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Fecha
              </p>
              <p className="text-sm font-semibold text-gray-800 capitalize">
                {formatDate(appt.scheduled_at)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Horario
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {formatTime(appt.scheduled_at)} – {endTime}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                {MODE_ICON[appt.mode]} Modalidad
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
                <FileText className="w-3 h-3" /> Motivo de consulta
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
        </div>

        {/* Study Results */}
        {appt.status === 'completed' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <StudyResultsSection appointmentId={appt.id} patientId={appt.patient_id} readOnly />
          </div>
        )}

        {/* Actions */}
        {(appt.status === 'confirmed' || canConfirm || canCancel) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acciones</h2>
            {appt.status === 'confirmed' && (
              <button
                onClick={() => navigate(`/dashboard/consulta/${appt.id}`)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors text-sm"
              >
                <Stethoscope className="w-4 h-4" />
                Iniciar consulta
              </button>
            )}
            {(canConfirm || canCancel) && (
              <div className="flex gap-3">
                {canConfirm && (
                  <button
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 text-sm"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Confirmar cita
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className={`flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm ${canConfirm ? 'px-5' : 'flex-1'}`}
                  >
                    {actionLoading && !canConfirm ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
