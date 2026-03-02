// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Video,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Star,
  ClipboardCheck,
} from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import { useAuth } from '@/app/providers/AuthContext';
import { getAppointmentById, updateAppointmentStatus, updateAppointment, AppointmentWithDetails } from '@/shared/lib/queries/appointments';
import { showToast } from '@/shared/components/ui/Toast';
import { createNotification } from '@/shared/lib/queries/notifications';
import type { Database } from '@/shared/types/database';
import ReviewWizard from '@/features/patient/components/ReviewWizard';
import { getReviewableAppointments, type ReviewableAppointment } from '@/shared/lib/queries/publicDoctors';

type AppointmentStatus = Database['public']['Enums']['appointment_status'];
type VisitMode = Database['public']['Enums']['visit_mode'];

const statusConfig: Record<
  AppointmentStatus,
  { label: string; icon: typeof CheckCircle; color: string; bg: string }
> = {
  confirmed: {
    label: 'Confirmada',
    icon: CheckCircle,
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
  requested: {
    label: 'Pendiente',
    icon: AlertCircle,
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
  },
  completed: {
    label: 'Completada',
    icon: CheckCircle,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
  rejected: {
    label: 'Rechazada',
    icon: XCircle,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
  no_show: {
    label: 'No asistió',
    icon: XCircle,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
  },
};

const modeConfig: Record<VisitMode, { label: string; icon: typeof MapPin; color: string }> = {
  in_person: { label: 'Presencial', icon: MapPin, color: 'text-blue-600' },
  video: { label: 'Video llamada', icon: Video, color: 'text-purple-600' },
  phone: { label: 'Teléfono', icon: Phone, color: 'text-green-600' },
};

export default function ConsultaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string | null>(null);
  const [newMode, setNewMode] = useState<VisitMode | null>(null);
  const [reviewableAppt, setReviewableAppt] = useState<ReviewableAppointment | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    loadAppointment();
  }, [id]);

  const loadAppointment = async () => {
    if (!id || !user) return;

    setLoading(true);
    setError(null);

    const data = await getAppointmentById(id, user.id);

    if (!data) {
      setError('No se pudo cargar la información de la cita');
      setLoading(false);
      return;
    }

    setAppointment(data);
    // seed reschedule form defaults
    const start = new Date(data.start_at)
    setNewDate(start.toISOString().split('T')[0])
    setNewTime(start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }))
    setNewMode(data.mode)
    // For completed patient appointments: build a ReviewableAppointment from the data
    // and check via RPC whether it's already been reviewed.
    if (data.status === 'completed' && user?.id === data.patient_id) {
      // Build from appointment fields so the wizard always has what it needs
      const synthetic: ReviewableAppointment = {
        appointment_id: data.id,
        doctor_id: data.doctor_id,
        doctor_name: data.doctor?.full_name ?? 'Doctor',
        doctor_slug: data.doctor?.slug ?? '',
        doctor_avatar: data.doctor?.avatar_url ?? null,
        specialty: data.doctor?.specialty ?? null,
        start_at: data.start_at,
        already_reviewed: false,
      };
      setReviewableAppt(synthetic);
      // Verify whether the patient already reviewed this appointment
      const reviewable = await getReviewableAppointments();
      const found = reviewable.find((r) => r.appointment_id === id);
      if (found?.already_reviewed) {
        setAlreadyReviewed(true);
        setReviewableAppt({ ...synthetic, already_reviewed: true });
      }
    }
    setLoading(false);
  };

  const handleCancelAppointment = async () => {
    if (!appointment || canceling) return;

    setCanceling(true);

    const result = await updateAppointmentStatus(appointment.id, 'cancelled');

    if (result.success) {
      showToast('Cita cancelada exitosamente', 'success');
      setShowCancelModal(false);
      // Reload appointment to show updated status
      await loadAppointment();
    } else {
      showToast(result.error || 'Error al cancelar la cita', 'error');
    }

    setCanceling(false);
  };

  const handleSendMessage = () => {
    if (!appointment) return;
    // Use profile role to determine counterpart (isDoctor const is declared after early returns)
    const userIsDoctor = profile?.role === 'doctor' || user?.id === appointment.doctor_id;
    const counterpartId = userIsDoctor ? appointment.patient_id : appointment.doctor_id;
    if (!counterpartId) return;
    navigate(`/dashboard/mensajes?with=${counterpartId}`);
  };

  const handleReschedule = () => {
    if (!appointment) return;
    setRescheduling((prev) => !prev);
  };

  const handleSaveReschedule = async () => {
    if (!appointment || !newDate || !newTime) return;

    const startAt = new Date(`${newDate}T${newTime}:00`)
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000)

    // Block past datetime selections
    if (startAt.getTime() <= Date.now()) {
      showToast('No puedes reprogramar una cita a una fecha u hora pasada', 'warning')
      return
    }

    setProcessingStatus(true)

    const isDoctor = user?.id === appointment.doctor_id
    const nextStatus: AppointmentStatus | undefined = isDoctor ? 'confirmed' : 'requested'

    const result = await updateAppointment(appointment.id, {
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      mode: newMode || appointment.mode,
      status: nextStatus
    })

    if (result.success) {
      // Notify counterpart
      const targetUser = isDoctor ? appointment.patient_id : appointment.doctor_id
      if (targetUser) {
        await createNotification({
          user_id: targetUser,
          type: 'appointment_rescheduled',
          title: 'Cita reprogramada',
          body: `La cita fue movida a ${startAt.toLocaleDateString('es-MX')} ${startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
          entity_table: 'appointments',
          entity_id: appointment.id,
          is_read: false
        })
      }

      showToast('Cita reprogramada', 'success')
      setRescheduling(false)
      await loadAppointment()
    } else {
      showToast(result.error || 'No se pudo reprogramar', 'error')
    }

    setProcessingStatus(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#33C7BE] animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando información de la cita...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !appointment) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar la cita</h3>
            <p className="text-red-700 mb-4">{error || 'La cita no existe o no tienes permiso para verla'}</p>
            <Link
              to="/dashboard/consultas"
              className="inline-flex items-center gap-2 text-[#33C7BE] hover:text-teal-600 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a mis citas
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusConfig[appointment.status];
  const mode = modeConfig[appointment.mode];
  const StatusIcon = status.icon;
  const ModeIcon = mode.icon;

  const startDate = new Date(appointment.start_at);
  const endDate = new Date(appointment.end_at);
  const isUpcoming = startDate > new Date();
  const isPatient = user?.id === appointment.patient_id;
  const isDoctor = user?.id === appointment.doctor_id;

  const updateStatus = async (next: AppointmentStatus) => {
    if (!appointment || processingStatus) return;
    setProcessingStatus(true);
    const result = await updateAppointmentStatus(appointment.id, next);
    if (result.success) {
      showToast(
        next === 'confirmed' ? 'Cita aceptada' : next === 'rejected' ? 'Cita rechazada' : 'Estado actualizado',
        'success'
      );
      await loadAppointment();
    } else {
      showToast(result.error || 'No se pudo actualizar la cita', 'error');
    }
    setProcessingStatus(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard/consultas')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver a mis citas</span>
          </button>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${status.bg}`}>
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
            <span className={`font-semibold ${status.color}`}>{status.label}</span>
          </div>
        </div>

        {/* ── Pending-completion banner (doctor only, past confirmed) ── */}
        {isDoctor && !isUpcoming && appointment.status === 'confirmed' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Consulta pendiente de confirmación</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  El horario de esta cita ya pasó. Confírmala como completada una vez que la atención haya finalizado.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateStatus('completed')}
              disabled={processingStatus}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-60 shrink-0"
            >
              {processingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4" />
              )}
              Confirmar como completada
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Counterpart Header — show patient info for doctor, doctor info for patient */}
          <div className="bg-gradient-to-r from-[#33C7BE]/10 to-teal-50 p-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              {isDoctor ? (
                /* Doctor viewing → show patient */
                <>
                  {appointment.patient?.avatar_url ? (
                    <img
                      src={appointment.patient.avatar_url}
                      alt={appointment.patient.full_name || appointment.patient.email?.split('@')[0] || 'Paciente'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#33C7BE] to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                      {(appointment.patient?.full_name || appointment.patient?.email || 'P').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Paciente</p>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {appointment.patient?.full_name || appointment.patient?.email?.split('@')[0] || 'Paciente'}
                    </h1>
                  </div>
                </>
              ) : (
                /* Patient viewing → show doctor */
                <>
                  {appointment.doctor?.avatar_url ? (
                    <img
                      src={appointment.doctor.avatar_url}
                      alt={appointment.doctor.full_name || 'Doctor'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#33C7BE] to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                      {appointment.doctor?.full_name?.charAt(0) || 'D'}
                    </div>
                  )}

                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {appointment.doctor?.full_name || appointment.doctor?.email?.split('@')[0] || 'Doctor'}
                    </h1>
                    {appointment.doctor?.specialty && (
                      <p className="text-gray-600 mt-1">{appointment.doctor.specialty}</p>
                    )}
                    {appointment.doctor?.clinic_name && (
                      <p className="text-sm text-gray-500 mt-1">{appointment.doctor.clinic_name}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Appointment Details */}
          <div className="p-6 space-y-6">
            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-semibold text-gray-900">
                    {startDate.toLocaleDateString('es-MX', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Horario</p>
                  <p className="font-semibold text-gray-900">
                    {startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {endDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${mode.color.split('-')[1]}-50 flex items-center justify-center flex-shrink-0`}>
                  <ModeIcon className={`w-5 h-5 ${mode.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Modalidad</p>
                  <p className="font-semibold text-gray-900">{mode.label}</p>
                </div>
              </div>

              {appointment.location_text && appointment.mode === 'in_person' && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ubicación</p>
                    <p className="font-semibold text-gray-900">{appointment.location_text}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reason & Symptoms */}
            {(appointment.reason || appointment.symptoms) && (
              <div className="border-t border-gray-100 pt-6">
                {appointment.reason && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Motivo de la consulta</p>
                    <p className="text-gray-900">{appointment.reason}</p>
                  </div>
                )}

                {appointment.symptoms && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Síntomas adicionales</p>
                    <p className="text-gray-900">{appointment.symptoms}</p>
                  </div>
                )}
              </div>
            )}


            {/* Review section — shown for patients on completed appointments */}
            {appointment.status === 'completed' && isPatient && (
              <div className="border-t border-gray-100 pt-6">
                {alreadyReviewed ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-4 py-3 rounded-xl">
                    <CheckCircle className="w-4 h-4" />
                    Ya dejaste una reseña para esta consulta — ¡gracias!
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">¿Cómo fue tu consulta?</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Dejar una reseña es <span className="font-medium">completamente opcional</span> y ayuda a otros pacientes a elegir al mejor doctor.
                      </p>
                    </div>
                    <button
                      onClick={() => setReviewOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-teal-600 transition-colors shrink-0"
                    >
                      <Star className="w-4 h-4" />
                      Dejar Reseña
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {isUpcoming && (appointment.status === 'confirmed' || appointment.status === 'requested') && (
              <div className="border-t border-gray-100 pt-6 space-y-4">
                {appointment.status === 'confirmed' && isDoctor && (
                  <button
                    onClick={() => updateStatus('completed')}
                    disabled={processingStatus}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-60"
                  >
                    {processingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-5 h-5" />}
                    <span>Finalizar consulta</span>
                  </button>
                )}
                {appointment.status === 'requested' && isDoctor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => updateStatus('confirmed')}
                      disabled={processingStatus}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-60"
                    >
                      {processingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      <span>Aceptar cita</span>
                    </button>
                    <button
                      onClick={() => updateStatus('rejected')}
                      disabled={processingStatus}
                      className="flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-semibold disabled:opacity-60"
                    >
                      {processingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                      <span>Rechazar</span>
                    </button>
                  </div>
                )}

                {rescheduling && (
                  <div className="rounded-lg border border-gray-100 p-4 space-y-4 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Fecha</label>
                        <input
                          type="date"
                          value={newDate || ''}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Hora</label>
                        <input
                          type="time"
                          value={newTime || ''}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Modalidad</label>
                        <select
                          value={newMode || appointment.mode}
                          onChange={(e) => setNewMode(e.target.value as VisitMode)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="in_person">Presencial</option>
                          <option value="video">Video</option>
                          <option value="phone">Teléfono</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleSaveReschedule}
                        disabled={processingStatus || !newDate || !newTime}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-teal-600 transition-colors font-semibold disabled:opacity-60"
                      >
                        {processingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        <span>Guardar cambios</span>
                      </button>
                      <button
                        onClick={() => setRescheduling(false)}
                        disabled={processingStatus}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-60"
                      >
                        <XCircle className="w-5 h-5" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleSendMessage}
                    className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Enviar mensaje</span>
                  </button>

                  <button
                    onClick={handleReschedule}
                    className="flex items-center justify-center gap-2 px-4 py-3 border border-[#33C7BE] text-[#33C7BE] rounded-lg hover:bg-teal-50 transition-colors font-medium"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Reprogramar</span>
                  </button>

                  {isPatient && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Cancelar cita</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Wizard */}
      {reviewOpen && reviewableAppt && (
        <ReviewWizard
          appointment={reviewableAppt}
          onClose={() => setReviewOpen(false)}
          onSuccess={() => {
            setReviewOpen(false);
            setAlreadyReviewed(true);
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cancelar cita?</h3>
              <p className="text-gray-600">
                Esta acción no se puede deshacer. ¿Estás seguro de que deseas cancelar esta cita?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={canceling}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                No, mantener
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={canceling}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {canceling ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Cancelando...</span>
                  </>
                ) : (
                  <span>Sí, cancelar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
