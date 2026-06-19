import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Video, Phone, Clock, CalendarDays, FileText,
  Loader2, Check, User, Activity,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { getAppointmentById, updateAppointmentStatus, type AppointmentWithPatient, type AppointmentMode } from '@/shared/lib/queries/appointments'
import { getPatientProfile } from '@/shared/lib/queries/profile'
import { getAppointmentNotesByPatient, type AppointmentNote } from '@/shared/lib/queries/appointmentNotes'
import { getClinicalHistory, type ClinicalHistoryData } from '@/shared/lib/queries/clinicalHistory'
import { getNotaEvolucionByAppointment, getNotasEvolucionByPatient } from '@/shared/lib/queries/notasEvolucion'
import type { NotaEvolucion } from '@/shared/lib/queries/notasEvolucion'
import NotaEvolucionForm from '@/features/doctor/components/NotaEvolucionForm'
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
const MODE_COLOR: Record<AppointmentMode, string> = {
  in_person: 'bg-teal-50 text-teal-700',
  video: 'bg-blue-50 text-blue-700',
  phone: 'bg-violet-50 text-violet-700',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── Confirm-Finish Modal ─────────────────────────────────────────────────────

function FinalizarModal({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6 text-[#33C7BE]" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-gray-900">¿Finalizar consulta?</h3>
          <p className="text-sm text-gray-500 mt-1">La cita se marcará como completada. Asegúrate de haber guardado tus notas.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm disabled:opacity-50">
            Volver
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultaActiva() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()

  const [appt, setAppt] = useState<AppointmentWithPatient | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [patientProfile, setPatientProfile] = useState<any>(null)
  const [, setPastNotes] = useState<AppointmentNote[]>([])
  const [prevNotas, setPrevNotas] = useState<NotaEvolucion[]>([])
  const [existingNota, setExistingNota] = useState<NotaEvolucion | null>(null)
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistoryData | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [showFinalizar, setShowFinalizar] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    if (!appointmentId) return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId])

  async function loadData() {
    setLoading(true)
    try {
      const apptData = await getAppointmentById(appointmentId!)

      if (!apptData) {
        showToast('Cita no encontrada', 'error')
        navigate('/dashboard/agenda')
        return
      }
      setAppt(apptData)

      // Load legacy notes + nota de evolución for this appointment + previous notas + HC
      const [notesData, notaEvolucion, todasNotas, hc] = await Promise.all([
        getAppointmentNotesByPatient(apptData.patient_id).catch(() => [] as AppointmentNote[]),
        getNotaEvolucionByAppointment(appointmentId!).catch(() => null),
        getNotasEvolucionByPatient(apptData.patient_id).catch(() => [] as NotaEvolucion[]),
        getClinicalHistory(apptData.patient_id).catch(() => null),
      ])
      setPastNotes(notesData.filter(n => n.appointment_id !== appointmentId).slice(0, 10))
      setExistingNota(notaEvolucion)
      setPrevNotas(todasNotas.filter(n => n.appointment_id !== appointmentId).slice(0, 8))
      setClinicalHistory(hc)

      // Patient medical profile
      const medProf = await getPatientProfile(apptData.patient_id).catch(() => null)
      setPatientProfile(medProf)
    } catch (err) {
      logger.error('ConsultaActiva.loadData', err)
      showToast('Error al cargar la consulta', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleFinalizar() {
    if (!appointmentId) return
    setFinalizing(true)
    try {
      await updateAppointmentStatus(appointmentId, 'completed')
      showToast('Consulta finalizada', 'success')
      navigate('/dashboard/agenda')
    } catch {
      showToast('Error al finalizar la consulta', 'error')
    } finally {
      setFinalizing(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-10 h-10 text-[#33C7BE] animate-spin mb-3" />
          <p className="text-sm text-gray-500">Cargando consulta...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!appt) return null

  const initials = (appt.patient_name ?? 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const endMs = new Date(appt.scheduled_at).getTime() + appt.duration_min * 60_000
  const endTime = new Date(endMs).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50">

        {/* ── Sticky Header ──────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
          <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/agenda')}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Patient */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {appt.patient_avatar ? (
                <img src={appt.patient_avatar} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{appt.patient_name ?? 'Paciente'}</p>
                <p className="text-xs text-gray-400 hidden sm:block">
                  {formatDate(appt.scheduled_at)} · {formatTime(appt.scheduled_at)}–{endTime}
                </p>
              </div>
            </div>

            {/* Mode badge */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${MODE_COLOR[appt.mode]}`}>
              {MODE_ICON[appt.mode]} {MODE_LABEL[appt.mode]}
            </span>

            {/* Finalizar */}
            <button
              onClick={() => {
              if (!existingNota) {
                if (!window.confirm('No has guardado la nota de evolución. ¿Finalizar la consulta de todas formas?')) return
              }
              setShowFinalizar(true)
            }}
              className="flex items-center gap-2 px-4 py-2 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors flex-shrink-0"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Finalizar consulta</span>
              <span className="sm:hidden">Finalizar</span>
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Left column: patient info ─────────────────────────────── */}
            <div className="space-y-4">

              {/* Appointment details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta cita</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> Fecha
                    </p>
                    <p className="text-xs font-semibold text-gray-800">
                      {new Date(appt.scheduled_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Horario
                    </p>
                    <p className="text-xs font-semibold text-gray-800">{formatTime(appt.scheduled_at)}–{endTime}</p>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${MODE_COLOR[appt.mode]}`}>
                  {MODE_ICON[appt.mode]} {MODE_LABEL[appt.mode]}
                </div>
                {appt.reason && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Motivo
                    </p>
                    <p className="text-xs text-gray-700 leading-relaxed">{appt.reason}</p>
                  </div>
                )}
              </div>

              {/* Patient medical profile */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <User className="w-3 h-3" /> Datos del paciente
                </p>
                {patientProfile ? (
                  <div className="space-y-2 text-xs">
                    {patientProfile.blood_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">Tipo de sangre</span>
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{patientProfile.blood_type}</span>
                      </div>
                    )}
                    {patientProfile.allergies && (
                      <div>
                        <span className="text-gray-400 font-medium block mb-0.5">Alergias</span>
                        <p className="text-gray-700 bg-orange-50 rounded-lg px-2 py-1.5 leading-relaxed">{patientProfile.allergies}</p>
                      </div>
                    )}
                    {patientProfile.chronic_conditions && (
                      <div>
                        <span className="text-gray-400 font-medium block mb-0.5">Condiciones crónicas</span>
                        <p className="text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5 leading-relaxed">{patientProfile.chronic_conditions}</p>
                      </div>
                    )}
                    {patientProfile.current_medications && (
                      <div>
                        <span className="text-gray-400 font-medium block mb-0.5">Medicamentos actuales</span>
                        <p className="text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5 leading-relaxed">{patientProfile.current_medications}</p>
                      </div>
                    )}
                    {!patientProfile.blood_type && !patientProfile.allergies && !patientProfile.chronic_conditions && (
                      <p className="text-gray-400 text-center py-2">Sin información médica adicional</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-2">Sin perfil médico registrado</p>
                )}
              </div>

              {/* HC incomplete warning */}
              {clinicalHistory === null && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Historia Clínica incompleta</p>
                  <p className="text-xs text-amber-600 leading-relaxed">
                    Este paciente no tiene Historia Clínica registrada. Complétala antes de continuar la nota de evolución.
                  </p>
                  <button
                    onClick={() => window.open(`/dashboard/pacientes/${appt.patient_id}?tab=historia`, '_blank')}
                    className="text-xs font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
                  >
                    Completar Historia Clínica →
                  </button>
                </div>
              )}

              {/* Historial clínico — notas de evolución previas */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Historial clínico
                </p>
                {prevNotas.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Sin consultas previas registradas</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {prevNotas.map(nota => {
                      const principal = nota.notas_evolucion_diagnosticos?.find(d => d.tipo === 'principal')
                      return (
                        <div key={nota.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                          <p className="text-[10px] text-gray-400 font-bold">
                            {new Date(nota.fecha_hora).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          {principal && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded shrink-0">
                                {principal.cie10_codigo}
                              </span>
                              <span className="text-[10px] text-gray-500 truncate">{principal.cie10_descripcion}</span>
                            </div>
                          )}
                          {nota.motivo_consulta && (
                            <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">
                              <span className="font-bold text-blue-400">S: </span>{nota.motivo_consulta}
                            </p>
                          )}
                          {nota.diagnostico && (
                            <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">
                              <span className="font-bold text-amber-400">A: </span>{nota.diagnostico}
                            </p>
                          )}
                          {nota.plan_terapeutico && (
                            <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-1">
                              <span className="font-bold text-violet-400">P: </span>{nota.plan_terapeutico}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right columns: Nota de Evolución (NOM-004) ───────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-[#33C7BE]/20 shadow-sm p-5">
                <NotaEvolucionForm
                  appointmentId={appointmentId!}
                  patientId={appt.patient_id}
                  existing={existingNota}
                  onSaved={nota => setExistingNota(nota)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFinalizar && (
        <FinalizarModal
          onConfirm={handleFinalizar}
          onCancel={() => setShowFinalizar(false)}
          loading={finalizing}
        />
      )}
    </DashboardLayout>
  )
}
