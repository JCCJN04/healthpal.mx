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
  FileText,
  Activity,
  Play,
  Check,
  X,
  User,
  ExternalLink,
  Pill,
  Sparkles,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  type AppointmentWithPatient,
  type AppointmentMode,
  type AppointmentStatus,
} from '@/shared/lib/queries/appointments'
import { type PatientProfileLite } from '@/features/doctor/services/patients'
import AgendarCitaModal from '@/shared/components/appointments/AgendarCitaModal'
import PatientPickerModal from '@/shared/components/appointments/PatientPickerModal'
import { useAuth } from '@/app/providers/AuthContext'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { motion, AnimatePresence } from 'framer-motion'
import { SpotlightCard } from '@/shared/components/ui/SpotlightCard'

// ─── Animations ────────────────────────────────────────────────────────────────

const fadeUpVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

const listVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

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

function addMinutes(iso: string, minutes: number): string {
  const endMs = new Date(iso).getTime() + minutes * 60_000
  return new Date(endMs).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Appointment Row ───────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  onClick,
  isSelected,
}: {
  appt: AppointmentWithPatient
  onClick: () => void
  isSelected?: boolean
}) {
  const initials = (appt.patient_name ?? 'P')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <motion.button
      variants={fadeUpVariant}
      whileHover={{ y: -1, scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-3.5 transition-all relative overflow-hidden ${
        isSelected
          ? 'bg-teal-50/50 border-[#33C7BE] shadow-sm ring-1 ring-[#33C7BE]/30'
          : 'bg-white border-gray-100 hover:border-teal-100 hover:shadow-xs'
      }`}
    >
      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#33C7BE]" />}
      <div className="flex items-center gap-3">
        {appt.patient_avatar ? (
          <img
            src={appt.patient_avatar}
            alt=""
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-xs"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`font-bold text-sm truncate ${isSelected ? 'text-teal-950' : 'text-gray-900'}`}
            >
              {appt.patient_name ?? 'Paciente'}
            </p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${STATUS_STYLES[appt.status]}`}
            >
              {STATUS_LABEL[appt.status]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-gray-400" />
              {formatDate(appt.scheduled_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              {formatTime(appt.scheduled_at)} · {appt.duration_min}m
            </span>
            <span className="flex items-center gap-1">
              {MODE_ICON[appt.mode]}
              {MODE_LABEL[appt.mode]}
            </span>
          </div>
          {appt.reason && <p className="mt-1 text-xs text-gray-400 truncate">{appt.reason}</p>}
        </div>
        <ChevronRight
          className={`w-4 h-4 flex-shrink-0 transition-transform ${
            isSelected ? 'text-[#33C7BE] translate-x-0.5' : 'text-gray-300'
          }`}
        />
      </div>
    </motion.button>
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
  const [selectedAppt, setSelectedAppt] = useState<AppointmentWithPatient | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function handleConfirm(apptId: string) {
    setActionLoading(true)
    try {
      await updateAppointmentStatus(apptId, 'confirmed')
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: 'confirmed' } : a)),
      )
      setSelectedAppt((prev) =>
        prev && prev.id === apptId ? { ...prev, status: 'confirmed' } : prev,
      )
      showToast('Cita confirmada correctamente', 'success')
    } catch (err) {
      logger.error('ConsultasDoctor:confirm', err)
      showToast('Error al confirmar la cita', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel(apptId: string) {
    setActionLoading(true)
    try {
      await updateAppointmentStatus(apptId, 'cancelled')
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: 'cancelled' } : a)),
      )
      setSelectedAppt((prev) =>
        prev && prev.id === apptId ? { ...prev, status: 'cancelled' } : prev,
      )
      showToast('Cita cancelada', 'success')
    } catch (err) {
      logger.error('ConsultasDoctor:cancel', err)
      showToast('Error al cancelar la cita', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const load = useCallback(() => {
    getDoctorAppointments(user?.id)
      .then((data) => {
        setAppointments(data)
      })
      .catch((err) => {
        logger.error('ConsultasDoctor.getDoctorAppointments', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [user?.id])

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
      {/* Ambient decorative glowing orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-20 right-10 w-96 h-96 bg-[#33C7BE]/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-8 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Consultas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {appointments.length} consulta{appointments.length !== 1 ? 's' : ''} en total
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowPatientPicker(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nueva cita
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
          {/* Master List (Left Column) */}
          <div className={`flex-col gap-4 ${selectedAppt ? 'hidden lg:flex' : 'flex'}`}>
            <SpotlightCard className="rounded-3xl border border-white/40 bg-white/40 shadow-sm backdrop-blur-xl p-4 space-y-4">
              <motion.div
                variants={listVariant}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* Search */}
                <motion.div variants={fadeUpVariant} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por paciente o motivo..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]"
                  />
                </motion.div>

                {/* Filter tabs */}
                <motion.div variants={fadeUpVariant} className="flex flex-wrap gap-2">
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
                          className={`inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full transition-colors ${
                            filter === tab.key
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </motion.div>

                {/* List */}
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-16"
                    >
                      <Loader2 className="w-8 h-8 text-[#33C7BE] animate-spin" />
                    </motion.div>
                  ) : filtered.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <Inbox className="w-12 h-12 text-gray-200 mb-3" />
                      <p className="text-gray-500 font-medium">
                        {search || filter !== 'all' ? 'Sin resultados' : 'No hay consultas aún'}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      variants={fadeUpVariant}
                      className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 pb-4 scrollbar-thin"
                    >
                      {filtered.map((appt) => (
                        <AppointmentRow
                          key={appt.id}
                          appt={appt}
                          isSelected={selectedAppt?.id === appt.id}
                          onClick={() => setSelectedAppt(appt)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </SpotlightCard>
          </div>

          {/* Detail View (Right Column) */}
          <div className={`${selectedAppt ? 'block' : 'hidden lg:block'} lg:sticky top-6`}>
            <AnimatePresence mode="wait">
              {selectedAppt ? (
                <motion.div
                  key={selectedAppt.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {(() => {
                    const endTime = addMinutes(selectedAppt.scheduled_at, selectedAppt.duration_min)
                    return (
                      <SpotlightCard className="rounded-3xl border border-white/60 bg-white/70 shadow-lg backdrop-blur-2xl p-6 sm:p-7">
                        {/* Mobile Back Button */}
                        <button
                          onClick={() => setSelectedAppt(null)}
                          className="lg:hidden mb-5 flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                          Volver a la lista
                        </button>

                        {/* Header: Patient Info & Top Action */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
                          <div className="flex items-center gap-4">
                            {selectedAppt.patient_avatar ? (
                              <img
                                src={selectedAppt.patient_avatar}
                                alt=""
                                className="w-14 h-14 rounded-2xl object-cover shadow-sm ring-2 ring-white"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#33C7BE] to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {(selectedAppt.patient_name ?? 'P')
                                  .split(' ')
                                  .map((w) => w[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                                {selectedAppt.patient_name ?? 'Paciente'}
                              </h2>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[selectedAppt.status]}`}
                                >
                                  {STATUS_LABEL[selectedAppt.status]}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  {MODE_ICON[selectedAppt.mode]} {MODE_LABEL[selectedAppt.mode]}
                                </span>
                              </div>
                            </div>
                          </div>

                          {selectedAppt.status === 'confirmed' ? (
                            <button
                              onClick={() => navigate(`/dashboard/consulta/${selectedAppt.id}`)}
                              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#33C7BE] text-white font-bold text-sm rounded-xl hover:bg-teal-600 transition-all shadow-sm hover:shadow hover:-translate-y-0.5 w-full sm:w-auto"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              Iniciar Consulta
                            </button>
                          ) : selectedAppt.status === 'completed' ? (
                            <button
                              onClick={() =>
                                navigate(`/dashboard/mis-consultas/${selectedAppt.id}`)
                              }
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-200 transition-all w-full sm:w-auto"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Consulta Concluida
                            </button>
                          ) : null}
                        </div>

                        {/* Pending Confirmation Banner */}
                        {selectedAppt.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 mb-6 bg-amber-50/90 border border-amber-200/80 rounded-2xl">
                            <div className="flex-1 text-xs text-amber-800">
                              <p className="font-bold">Esta solicitud requiere confirmación</p>
                              <p className="text-amber-700/90 text-[11px] mt-0.5">
                                El paciente está en espera de que apruebes o rechaces la cita
                                propuesta.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleConfirm(selectedAppt.id)}
                                disabled={actionLoading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#33C7BE] text-white font-bold text-xs rounded-xl hover:bg-teal-600 transition-colors shadow-xs disabled:opacity-50"
                              >
                                {actionLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Confirmar
                              </button>
                              <button
                                onClick={() => handleCancel(selectedAppt.id)}
                                disabled={actionLoading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-gray-600 font-semibold text-xs rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                Rechazar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 4 Clean Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
                          <div className="bg-white/90 rounded-2xl p-4 border border-gray-100/90 shadow-xs hover:border-teal-100 transition-all">
                            <div className="flex items-center gap-2.5 mb-2">
                              <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#33C7BE] flex items-center justify-center flex-shrink-0">
                                <CalendarDays className="w-4 h-4" />
                              </div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Fecha
                              </span>
                            </div>
                            <p className="text-gray-900 font-bold text-sm sm:text-base capitalize">
                              {formatFullDate(selectedAppt.scheduled_at)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDate(selectedAppt.scheduled_at)}
                            </p>
                          </div>

                          <div className="bg-white/90 rounded-2xl p-4 border border-gray-100/90 shadow-xs hover:border-teal-100 transition-all">
                            <div className="flex items-center gap-2.5 mb-2">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4 h-4" />
                              </div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Horario
                              </span>
                            </div>
                            <p className="text-gray-900 font-bold text-sm sm:text-base">
                              {formatTime(selectedAppt.scheduled_at)} – {endTime}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Duración:{' '}
                              <span className="font-semibold text-gray-700">
                                {selectedAppt.duration_min} min
                              </span>
                            </p>
                          </div>

                          <div className="bg-white/90 rounded-2xl p-4 border border-gray-100/90 shadow-xs hover:border-teal-100 transition-all">
                            <div className="flex items-center gap-2.5 mb-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                {MODE_ICON[selectedAppt.mode]}
                              </div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Modalidad
                              </span>
                            </div>
                            <p className="text-gray-900 font-bold text-sm sm:text-base">
                              {MODE_LABEL[selectedAppt.mode]}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {selectedAppt.mode === 'video'
                                ? 'Videollamada en línea'
                                : selectedAppt.mode === 'in_person'
                                  ? 'Presencial en consultorio'
                                  : 'Llamada telefónica'}
                            </p>
                          </div>

                          <div className="bg-white/90 rounded-2xl p-4 border border-gray-100/90 shadow-xs hover:border-teal-100 transition-all">
                            <div className="flex items-center gap-2.5 mb-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                <Activity className="w-4 h-4" />
                              </div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Estado
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[selectedAppt.status]}`}
                              >
                                {STATUS_LABEL[selectedAppt.status]}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {selectedAppt.status === 'confirmed'
                                ? 'Confirmada para la fecha y hora'
                                : selectedAppt.status === 'pending'
                                  ? 'Pendiente de confirmación'
                                  : selectedAppt.status === 'completed'
                                    ? 'Consulta concluida'
                                    : 'Cita cancelada'}
                            </p>
                          </div>
                        </div>

                        {/* Motivo de Consulta Card */}
                        <div className="bg-white/90 rounded-2xl p-5 border border-gray-100/90 shadow-xs mb-5">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#33C7BE] flex items-center justify-center">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Motivo de Consulta
                            </span>
                          </div>
                          <p className="text-gray-800 text-sm font-medium leading-relaxed pl-1">
                            {selectedAppt.reason ||
                              'El paciente no especificó un motivo específico al agendar.'}
                          </p>
                          {selectedAppt.notes && (
                            <div className="mt-3.5 pt-3 border-t border-gray-100 pl-1">
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                Notas adicionales del paciente:
                              </span>
                              <p className="text-gray-600 text-xs leading-relaxed">
                                {selectedAppt.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Acciones Rápidas */}
                        <div className="bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40 rounded-2xl p-5 border border-teal-100/80 shadow-xs">
                          <div className="flex items-center gap-2 text-teal-800 mb-3.5">
                            <Sparkles className="w-4 h-4 text-[#33C7BE]" />
                            <h3 className="font-bold text-sm text-gray-900">Acciones Rápidas</h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <button
                              onClick={() =>
                                navigate(`/dashboard/pacientes/${selectedAppt.patient_id}`)
                              }
                              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white rounded-xl text-xs font-semibold text-gray-700 border border-gray-200/80 hover:border-teal-200 hover:text-teal-700 hover:shadow-xs transition-all"
                            >
                              <User className="w-3.5 h-3.5 text-teal-600" />
                              Historial Clínico
                            </button>
                            <button
                              onClick={() =>
                                navigate(
                                  `/dashboard/recetas?patientId=${selectedAppt.patient_id}&newRx=1`,
                                )
                              }
                              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white rounded-xl text-xs font-semibold text-gray-700 border border-gray-200/80 hover:border-teal-200 hover:text-teal-700 hover:shadow-xs transition-all"
                            >
                              <Pill className="w-3.5 h-3.5 text-teal-600" />
                              Recetar Medicamento
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/dashboard/mis-consultas/${selectedAppt.id}`)
                              }
                              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white rounded-xl text-xs font-semibold text-gray-700 border border-gray-200/80 hover:border-teal-200 hover:text-teal-700 hover:shadow-xs transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                              Ver Ficha Completa
                            </button>
                          </div>
                        </div>
                      </SpotlightCard>
                    )
                  })()}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-detail"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200"
                >
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Activity className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Ninguna cita seleccionada
                  </h3>
                  <p className="text-gray-500 text-sm max-w-xs">
                    Selecciona un paciente de la lista para ver los detalles de su consulta y
                    comenzar la sesión.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
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
            getDoctorAppointments(user?.id).then((data) => setAppointments(data))
          }}
        />
      )}
    </DashboardLayout>
  )
}
