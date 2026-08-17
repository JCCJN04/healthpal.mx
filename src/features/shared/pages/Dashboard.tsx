import {
  FileText,
  Upload,
  Clock,
  Share2,
  Plus,
  FlaskConical,
  Pill,
  ClipboardList,
  ShieldCheck,
  ScanLine,
  Users,
  CalendarDays,
  Building2,
  Video,
  Phone,
  ChevronRight,
  Stethoscope,
} from 'lucide-react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import React from 'react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { showToast } from '@/shared/components/ui/Toast'
import { useAuth } from '@/app/providers/AuthContext'
import {
  getUserDocuments,
  getDocumentsSharedWithMe,
  shareEncryptedDocumentKey,
} from '@/shared/lib/queries/documents'
import { getPatientDoctorAccess } from '@/shared/lib/queries/consent'
import { useCrypto } from '@/context/CryptoContext'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { DashboardSummary } from '@/shared/components/DashboardSummary'
import { listDoctorPatients, type PatientProfileLite } from '@/features/doctor/services/patients'
import {
  getDoctorAppointments,
  type AppointmentWithPatient,
  type AppointmentMode,
} from '@/shared/lib/queries/appointments'
import { logger } from '@/shared/lib/logger'
import { mapDashboardPath } from '@/context/DemoContext'
import type { Database } from '@/shared/types/database'

type Doc = Database['public']['Tables']['documents']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type SharedEntry = {
  id: string
  document?: Doc | null
  sender?: { full_name?: string | null } | null
}

interface SummaryData {
  documentCount: number
  activePatients: number
  sharedDocumentCount: number
}

interface DoctorHomeProps {
  profile: ProfileRow | null
  loading: boolean
  summaryData: SummaryData
  recentDocs: Doc[]
  patientSnapshot: PatientProfileLite[]
  todayAppts: AppointmentWithPatient[]
  upcomingAppts: AppointmentWithPatient[]
  navigate: ReturnType<typeof useNavigate>
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; colorClass: string }
> = {
  lab: { label: 'Laboratorio', icon: FlaskConical, colorClass: 'text-orange-600 bg-orange-50' },
  radiology: { label: 'Radiología', icon: ScanLine, colorClass: 'text-blue-600 bg-blue-50' },
  prescription: { label: 'Recetas', icon: Pill, colorClass: 'text-green-600 bg-green-50' },
  history: { label: 'Historial', icon: ClipboardList, colorClass: 'text-purple-600 bg-purple-50' },
  insurance: { label: 'Seguros', icon: ShieldCheck, colorClass: 'text-indigo-600 bg-indigo-50' },
  other: { label: 'Otros', icon: FileText, colorClass: 'text-gray-600 bg-gray-50' },
}

const MODE_ICON_SM: Record<AppointmentMode, React.ReactNode> = {
  in_person: <Building2 size={12} />,
  video: <Video size={12} />,
  phone: <Phone size={12} />,
}
const MODE_LABEL_SM: Record<AppointmentMode, string> = {
  in_person: 'Presencial',
  video: 'Video',
  phone: 'Llamada',
}
const MODE_COLOR_SM: Record<AppointmentMode, string> = {
  in_person: 'text-teal-600 bg-teal-50',
  video: 'text-blue-600 bg-blue-50',
  phone: 'text-amber-600 bg-amber-50',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50',
  confirmed: 'text-green-600 bg-green-50',
  completed: 'text-gray-400 bg-gray-50',
  cancelled: 'text-red-400 bg-red-50',
}

function formatApptTime(scheduledAt: string) {
  return new Date(scheduledAt).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })
}

const DoctorHome = ({
  profile,
  loading,
  summaryData,
  patientSnapshot,
  todayAppts,
  upcomingAppts,
  navigate,
}: DoctorHomeProps) => {
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const nextAppt = upcomingAppts[0]

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? ''}
              className="w-11 h-11 rounded-full object-cover border-2 border-primary/20 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20 shrink-0 text-sm">
              {(profile?.full_name ?? 'D')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Bienvenido,{' '}
              <span className="text-primary">{profile?.full_name?.split(' ')[0] ?? 'Doctor'}</span>
            </h1>
            <p className="text-xs text-gray-400 capitalize">{today}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate(mapDashboardPath('/dashboard/agenda'))}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-teal-600 transition-colors shadow-sm shadow-primary/20"
          >
            <CalendarDays size={13} /> Ver agenda
          </button>
          <button
            onClick={() => navigate(mapDashboardPath('/dashboard/recetas'))}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Pill size={13} /> Nueva receta
          </button>
          <button
            onClick={() => navigate(mapDashboardPath('/dashboard/pacientes'))}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Users size={13} /> Pacientes
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Citas hoy
          </p>
          {loading ? (
            <Skeleton className="h-7 w-8" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{todayAppts.length}</p>
          )}
          <p className="text-[10px] text-gray-400 mt-0.5">programadas</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Próxima
          </p>
          {loading ? (
            <Skeleton className="h-7 w-16" />
          ) : nextAppt ? (
            <>
              <p className="text-2xl font-bold text-primary">
                {formatApptTime(nextAppt.scheduled_at)}
              </p>
              {(() => {
                const apptDate = new Date(nextAppt.scheduled_at).toLocaleDateString('en-CA', {
                  timeZone: 'America/Mexico_City',
                })
                const todayDate = new Date().toLocaleDateString('en-CA', {
                  timeZone: 'America/Mexico_City',
                })
                return apptDate !== todayDate ? (
                  <p className="text-[10px] text-amber-500 font-bold mt-0.5">
                    {new Date(nextAppt.scheduled_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'America/Mexico_City',
                    })}
                  </p>
                ) : null
              })()}
            </>
          ) : (
            <p className="text-sm font-semibold text-gray-400">Sin citas</p>
          )}
          {nextAppt && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              {nextAppt.patient_name ?? '—'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Pacientes
          </p>
          {loading ? (
            <Skeleton className="h-7 w-8" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{summaryData.activePatients}</p>
          )}
          <p className="text-[10px] text-gray-400 mt-0.5">con expediente</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Documentos
          </p>
          {loading ? (
            <Skeleton className="h-7 w-8" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{summaryData.documentCount}</p>
          )}
          <p className="text-[10px] text-gray-400 mt-0.5">en expedientes</p>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Agenda del día */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-primary" />
              <h2 className="text-sm font-bold text-gray-800">Agenda de hoy</h2>
              {todayAppts.length > 0 && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {todayAppts.length}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate(mapDashboardPath('/dashboard/agenda'))}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              Ver agenda <ChevronRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : todayAppts.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Sin citas programadas para hoy</p>
              <button
                onClick={() => navigate(mapDashboardPath('/dashboard/agenda'))}
                className="mt-3 text-xs text-primary font-semibold hover:underline"
              >
                Ver agenda completa →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppts.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() =>
                    appt.status !== 'cancelled' && navigate(`/dashboard/consulta/${appt.id}`)
                  }
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${appt.status === 'cancelled' ? 'opacity-50 border-gray-100 bg-gray-50 cursor-default' : 'border-gray-100 hover:border-primary/30 hover:bg-primary/[0.02] cursor-pointer group'}`}
                >
                  {/* Time */}
                  <div className="w-12 text-center shrink-0">
                    <p className="text-sm font-bold text-gray-800">
                      {formatApptTime(appt.scheduled_at)}
                    </p>
                    <p className="text-[9px] text-gray-400">{appt.duration_min}min</p>
                  </div>

                  {/* Divider */}
                  <div className="w-0.5 h-10 bg-gray-100 rounded shrink-0" />

                  {/* Patient */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                      {appt.patient_name ?? 'Paciente'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${MODE_COLOR_SM[appt.mode]}`}
                      >
                        {MODE_ICON_SM[appt.mode]} {MODE_LABEL_SM[appt.mode]}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[appt.status]}`}
                      >
                        {STATUS_LABEL[appt.status]}
                      </span>
                    </div>
                  </div>

                  {appt.status !== 'cancelled' && (
                    <div className="shrink-0">
                      <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        Iniciar <ChevronRight size={11} />
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pacientes recientes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-primary" />
              <h2 className="text-sm font-bold text-gray-800">Pacientes</h2>
            </div>
            <button
              onClick={() => navigate(mapDashboardPath('/dashboard/pacientes'))}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              Ver todos <ChevronRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 rounded-xl" />
              ))}
            </div>
          ) : patientSnapshot.length === 0 ? (
            <div className="text-center py-8">
              <Users size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Sin pacientes registrados</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {patientSnapshot.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(mapDashboardPath(`/dashboard/pacientes/${p.id}`))}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                    {(p.full_name ?? 'P')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors truncate flex-1">
                    {p.full_name ?? 'Paciente sin nombre'}
                  </p>
                  <ChevronRight
                    size={12}
                    className="text-gray-300 group-hover:text-primary transition-colors shrink-0"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Acceso rápido */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Acceso rápido
            </p>
            <button
              onClick={() => navigate(mapDashboardPath('/dashboard/recetas'))}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-primary/5 text-gray-600 hover:text-primary text-xs font-semibold rounded-xl transition-colors group"
            >
              <Pill
                size={13}
                className="text-violet-500 group-hover:text-primary transition-colors"
              />
              Nueva receta
            </button>
            <button
              onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-primary/5 text-gray-600 hover:text-primary text-xs font-semibold rounded-xl transition-colors group"
            >
              <FileText
                size={13}
                className="text-blue-500 group-hover:text-primary transition-colors"
              />
              Subir documento
            </button>
            <button
              onClick={() => navigate(mapDashboardPath('/dashboard/agenda'))}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-primary/5 text-gray-600 hover:text-primary text-xs font-semibold rounded-xl transition-colors group"
            >
              <Stethoscope
                size={13}
                className="text-teal-500 group-hover:text-primary transition-colors"
              />
              Agendar consulta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const { privateKey } = useCrypto()
  const [loading, setLoading] = useState(true)
  const [recentDocs, setRecentDocs] = useState<Doc[]>([])
  const [sharedDocsList, setSharedDocsList] = useState<SharedEntry[]>([])
  const [patientSnapshot, setPatientSnapshot] = useState<PatientProfileLite[]>([])
  const [todayAppts, setTodayAppts] = useState<AppointmentWithPatient[]>([])
  const [upcomingAppts, setUpcomingAppts] = useState<AppointmentWithPatient[]>([])
  const [summaryData, setSummaryData] = useState<SummaryData>({
    documentCount: 0,
    activePatients: 0,
    sharedDocumentCount: 0,
  })
  // Cache fetched docs so the key-sync effect can reuse them without an extra network call
  const allDocsRef = useRef<Doc[]>([])

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.role])

  // Patient: silently re-wrap document keys for all consented doctors so they can decrypt files
  useEffect(() => {
    if (!user?.id || !privateKey || profile?.role !== 'patient') return
    const syncKeys = async () => {
      try {
        // Reuse docs already fetched by loadDashboardData (avoids duplicate network call).
        // If ref is empty (crypto ready before data load), fetch fresh.
        const docsPromise =
          allDocsRef.current.length > 0
            ? Promise.resolve(allDocsRef.current)
            : getUserDocuments(user.id, null, true)
        const [docs, consents] = await Promise.all([docsPromise, getPatientDoctorAccess(user.id)])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const encrypted = docs.filter((d) => (d as any).is_encrypted)
        const accepted = consents.filter((c) => c.status === 'accepted')
        if (!encrypted.length || !accepted.length) return
        const promises = accepted.flatMap((consent) =>
          encrypted.map((d) => shareEncryptedDocumentKey(d.id, privateKey, consent.doctor_id)),
        )
        await Promise.allSettled(promises)
      } catch (err) {
        logger.error('Dashboard.syncDocumentKeys', err)
      }
    }
    syncKeys()
  }, [user?.id, privateKey, profile?.role])

  const loadDashboardData = async () => {
    if (!user) return
    const isDoctor = profile?.role === 'doctor'
    setLoading(true)

    try {
      const [documentsData, sharedDocuments, doctorPatients, allDoctorAppts] = await Promise.all([
        getUserDocuments(user.id, null, true),
        getDocumentsSharedWithMe(user.id),
        isDoctor ? listDoctorPatients(user.id) : Promise.resolve([]),
        isDoctor ? getDoctorAppointments() : Promise.resolve([] as AppointmentWithPatient[]),
      ])

      allDocsRef.current = documentsData || []
      const docMap = new Map<string, Doc>()
      ;(documentsData || []).forEach((doc) => docMap.set(doc.id, doc))
      ;(sharedDocuments as SharedEntry[]).forEach((entry) => {
        if (entry?.document?.id) docMap.set(entry.document.id, entry.document)
      })

      setRecentDocs((documentsData || []).slice(0, 6))
      setSharedDocsList(isDoctor ? [] : (sharedDocuments as SharedEntry[]).slice(0, 4))
      setPatientSnapshot(doctorPatients || [])

      if (isDoctor) {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) // YYYY-MM-DD
        const now = new Date()
        const sorted = (allDoctorAppts as AppointmentWithPatient[])
          .filter((a) => a.status !== 'cancelled')
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        const todayAll = (allDoctorAppts as AppointmentWithPatient[])
          .filter((a) => a.scheduled_at.startsWith(todayStr))
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        const upcoming = sorted.filter((a) => new Date(a.scheduled_at) >= now)
        setTodayAppts(todayAll)
        setUpcomingAppts(upcoming)
      }

      setSummaryData({
        documentCount: isDoctor ? documentsData?.length || 0 : docMap.size,
        activePatients: isDoctor ? doctorPatients?.length || 0 : 0,
        sharedDocumentCount: (sharedDocuments as SharedEntry[]).length,
      })
    } catch (err) {
      logger.error('Dashboard:loadData', err)
      showToast('Error al cargar datos del dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (profile?.role === 'assistant') {
    return <Navigate to="/dashboard/assistant" replace />
  }

  const isDoctor = profile?.role === 'doctor'

  const PatientHome = () => (
    <>
      <div className="space-y-6 md:space-y-8">
        <DashboardSummary
          userName={profile?.full_name || 'Usuario'}
          avatarUrl={profile?.avatar_url}
          loading={loading}
          data={summaryData}
          role={profile?.role}
        />
      </div>

      <div className="mt-6 md:mt-8">
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Mi expediente de salud</h2>
          <button
            onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
            className="text-primary text-sm font-medium hover:underline"
          >
            Ver todo →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4 md:p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">Por tipo de documento</p>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon
                    const count = recentDocs.filter((d) => d.category === key).length
                    return (
                      <button
                        key={key}
                        className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all text-left"
                        onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.colorClass}`}
                        >
                          <Icon size={15} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-900 leading-none">{count}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                            {cfg.label}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-semibold rounded-lg transition-colors"
                >
                  <Plus size={14} /> Subir documento
                </button>
              </>
            )}
          </div>

          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Documentos recientes</p>
              <Clock size={15} className="text-gray-400" />
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText size={40} className="text-gray-200 mb-3" />
                <p className="text-gray-500 text-sm">Aún no tienes documentos subidos</p>
                <button
                  onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
                  className="mt-3 inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:underline"
                >
                  <Upload size={13} /> Sube tu primer documento
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentDocs.slice(0, 5).map((doc) => {
                  const cfg = CATEGORY_CONFIG[doc.category] ?? CATEGORY_CONFIG.other
                  const Icon = cfg.icon
                  const date = new Date(doc.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(mapDashboardPath(`/dashboard/documentos/${doc.id}`))}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.colorClass}`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500">{cfg.label}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{date}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {!loading && sharedDocsList.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Share2 size={18} className="text-primary" />
              Compartidos por tu médico
            </h2>
            <button
              onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
              className="text-primary text-sm font-medium hover:underline"
            >
              Ver todos →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sharedDocsList.map((entry) => {
              const doc = entry?.document
              if (!doc) return null
              const cfg = CATEGORY_CONFIG[doc.category] ?? CATEGORY_CONFIG.other
              const Icon = cfg.icon
              return (
                <div
                  key={entry.id}
                  className="bg-white border border-gray-100 rounded-lg p-3 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(mapDashboardPath(`/dashboard/documentos/${doc.id}`))}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${cfg.colorClass}`}
                  >
                    <Icon size={15} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    De {entry?.sender?.full_name || 'Tu médico'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )

  return (
    <DashboardLayout>
      {isDoctor ? (
        <DoctorHome
          profile={profile}
          loading={loading}
          summaryData={summaryData}
          recentDocs={recentDocs}
          patientSnapshot={patientSnapshot}
          todayAppts={todayAppts}
          upcomingAppts={upcomingAppts}
          navigate={navigate}
        />
      ) : (
        <PatientHome />
      )}
    </DashboardLayout>
  )
}
