import { MessageCircle, User, FileText, Upload, Clock, Share2, Plus, FlaskConical, Pill, ClipboardList, ShieldCheck, ScanLine } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import React from 'react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { showToast } from '@/shared/components/ui/Toast'
import { useAuth } from '@/app/providers/AuthContext'
import { listUpcomingAppointments, getAppointmentDaysInMonth, getDoctorPatientsSnapshot, AppointmentWithDetails } from '@/shared/lib/queries/appointments'
import { getUnreadTotal } from '@/shared/lib/queries/chat'
import { getUserDocuments, getDocumentsSharedWithMe } from '@/shared/lib/queries/documents'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { DashboardSummary } from '@/shared/components/DashboardSummary'
import { listDoctorPatients, type PatientProfileLite } from '@/features/doctor/services/patients'
import { logger } from '@/shared/lib/logger'
import { mapDashboardPath } from '@/context/DemoContext'
import type { Database } from '@/shared/types/database'

// ─── Local types ──────────────────────────────────────────────────────────────
type Doc = Database['public']['Tables']['documents']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type PatientSnapshotItem = { patient_id: string; last_interaction: string; full_name?: string | null }
type SharedEntry = { id: string; document?: Doc | null; sender?: { full_name?: string | null } | null }

interface SummaryData {
  nextAppointment: { date: string; time: string; doctor: string } | null
  documentCount: number
  unreadMessages: number
  activePatients: number
  sharedDocumentCount: number
  alerts: { type: 'profile' | 'appointment' | 'document'; message: string }[]
}

interface DoctorHomeProps {
  profile: ProfileRow | null
  loading: boolean
  summaryData: SummaryData
  appointments: AppointmentWithDetails[]
  patientSnapshot: PatientSnapshotItem[]
  recentDocs: Doc[]
  showNotification: boolean
  onDismissNotification: () => void
  onOpenConsultas: () => void
  navigate: ReturnType<typeof useNavigate>
}

// ─── Categorías de documentos ─────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; colorClass: string }> = {
  lab:          { label: 'Laboratorio', icon: FlaskConical, colorClass: 'text-orange-600 bg-orange-50' },
  radiology:    { label: 'Radiología',  icon: ScanLine,     colorClass: 'text-blue-600 bg-blue-50' },
  prescription: { label: 'Recetas',     icon: Pill,         colorClass: 'text-green-600 bg-green-50' },
  history:      { label: 'Historial',   icon: ClipboardList,colorClass: 'text-purple-600 bg-purple-50' },
  insurance:    { label: 'Seguros',     icon: ShieldCheck,  colorClass: 'text-indigo-600 bg-indigo-50' },
  other:        { label: 'Otros',       icon: FileText,     colorClass: 'text-gray-600 bg-gray-50' },
}

// ─── Doctor Dashboard ─────────────────────────────────────────────────────────
const DoctorHome = ({
  profile, loading, summaryData, appointments,
  patientSnapshot, recentDocs, showNotification,
  onDismissNotification, onOpenConsultas, navigate
}: DoctorHomeProps) => (
  <>
    <div className="space-y-6 md:space-y-8">
      <DashboardSummary
        userName={profile?.full_name || 'Doctor'}
        avatarUrl={profile?.avatar_url}
        loading={loading}
        data={summaryData}
        role={profile?.role}
      />

      {showNotification && appointments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 flex flex-col md:flex-row items-start gap-4">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <MessageCircle className="text-white" size={20} />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-gray-700">
              Tienes {appointments.length} {appointments.length === 1 ? 'consulta próxima' : 'consultas próximas'}
            </p>
          </div>
          <div className="flex gap-4 mx-auto md:mx-0">
            <button onClick={onOpenConsultas} className="text-primary font-medium text-sm hover:underline">VER</button>
            <button onClick={onDismissNotification} className="text-gray-500 font-medium text-sm hover:underline">CERRAR</button>
          </div>
        </div>
      )}
    </div>

    {/* Expedientes + Pacientes */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mt-6">

      {/* Documentos recientes para pacientes */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 xl:col-span-2">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg font-semibold text-primary">Expedientes para pacientes</h2>
          <FileText size={18} className="text-primary" />
        </div>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : recentDocs.length === 0 ? (
          <div className="text-center py-10">
            <FileText size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Aún no has subido documentos para pacientes</p>
            <button
              onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
              className="mt-4 inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline"
            >
              <Upload size={14} /> Subir primer documento
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentDocs.slice(0, 6).map((doc) => {
              const cfg = CATEGORY_CONFIG[doc.category] ?? CATEGORY_CONFIG.other
              const Icon = cfg.icon
              const date = new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(mapDashboardPath(`/dashboard/documentos/${doc.id}`))}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">{doc.title}</p>
                    <p className="text-xs text-gray-500">{cfg.label}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock size={11} /><span>{date}</span>
                  </div>
                </div>
              )
            })}
            <button
              onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
              className="w-full text-center text-primary font-bold text-sm hover:underline py-2 bg-gray-50 rounded-lg mt-1"
            >
              Ver todos los documentos →
            </button>
          </div>
        )}
      </div>

      {/* Pacientes recientes */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg font-semibold text-primary">Pacientes recientes</h2>
          <User size={18} className="text-primary" />
        </div>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : patientSnapshot.length === 0 ? (
          <p className="text-sm text-gray-500">Sin pacientes aún</p>
        ) : (
          <div className="space-y-2">
            {patientSnapshot.slice(0, 6).map((p) => {
              const label = new Date(p.last_interaction).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
              return (
                <div
                  key={p.patient_id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0 border-gray-100 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded-lg transition-colors group"
                  onClick={() => navigate(mapDashboardPath(`/dashboard/pacientes/${p.patient_id}`))}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
                      {p.full_name || 'Paciente sin nombre'}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ver expediente →</p>
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">{label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  </>
)

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [showNotification, setShowNotification] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [patientSnapshot, setPatientSnapshot] = useState<PatientSnapshotItem[]>([])
  const [recentDocs, setRecentDocs] = useState<Doc[]>([])
  const [sharedDocsList, setSharedDocsList] = useState<SharedEntry[]>([])

  const [summaryData, setSummaryData] = useState<SummaryData>({
    nextAppointment: null,
    documentCount: 0,
    unreadMessages: 0,
    activePatients: 0,
    sharedDocumentCount: 0,
    alerts: []
  })

  const roleLabel = profile?.role === 'doctor' ? 'doctor' : 'patient'

  useEffect(() => {
    performance.mark('dashboard-mount')
    return () => {
      performance.mark('dashboard-unmount')
      performance.measure('dashboard-lifetime', 'dashboard-mount', 'dashboard-unmount')
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDashboardData() }, [user])

  useEffect(() => {
    logger.debug(`[Dashboard] Rendering ${roleLabel} dashboard`)
  }, [roleLabel])

  const loadDashboardData = async () => {
    if (!user) return
    const isDoctor = profile?.role === 'doctor'
    performance.mark('dashboard-load-start')
    setLoading(true)

    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const [upcomingData, , documentsData, sharedDocuments, unreadTotal, snapshot, doctorPatients] = await Promise.all([
        listUpcomingAppointments({ userId: user.id, role: isDoctor ? 'doctor' : 'patient' }),
        getAppointmentDaysInMonth(user.id, startOfMonth, endOfMonth, isDoctor ? 'doctor' : 'patient'),
        getUserDocuments(user.id, null, true),
        getDocumentsSharedWithMe(user.id),
        getUnreadTotal(user.id),
        isDoctor ? getDoctorPatientsSnapshot(user.id) : Promise.resolve([]),
        isDoctor ? listDoctorPatients(user.id) : Promise.resolve([])
      ])

      const upcoming = upcomingData || []
      setAppointments(upcoming)

      const nextApt = upcoming[0]
      const nextAptFormatted = nextApt ? {
        date: new Date(nextApt.start_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        time: new Date(nextApt.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        doctor: nextApt.doctor?.full_name || 'Sin asignar'
      } : null

      const alerts: SummaryData['alerts'] = []
      if (!profile?.onboarding_completed) alerts.push({ type: 'profile', message: 'Completa tu perfil médico' })
      if (upcoming.length === 0) alerts.push({ type: 'appointment', message: 'Agenda tu primera consulta' })
      if ((documentsData?.length || 0) === 0) alerts.push({ type: 'document', message: 'Sube tus estudios médicos' })

      const docMap = new Map<string, Doc>()
      ;(documentsData || []).forEach((doc) => docMap.set(doc.id, doc))
      ;(sharedDocuments as SharedEntry[]).forEach((entry) => {
        if (entry?.document?.id) docMap.set(entry.document.id, entry.document)
      })

      const nameMap: Record<string, PatientProfileLite> = (doctorPatients || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {} as Record<string, PatientProfileLite>)

      setPatientSnapshot(isDoctor
        ? (snapshot || []).map((p) => ({ ...p, full_name: nameMap[p.patient_id]?.full_name || null }))
        : []
      )
      setRecentDocs((documentsData || []).slice(0, 6))
      setSharedDocsList(isDoctor ? [] : (sharedDocuments as SharedEntry[]).slice(0, 4))

      setSummaryData({
        nextAppointment: nextAptFormatted,
        documentCount: isDoctor ? (documentsData?.length || 0) : docMap.size,
        unreadMessages: unreadTotal || 0,
        activePatients: isDoctor ? (snapshot?.length || 0) : 0,
        sharedDocumentCount: (sharedDocuments as SharedEntry[]).length,
        alerts
      })

    } catch (err) {
      logger.error('Dashboard:loadData', err)
      showToast('Error al cargar datos del dashboard', 'error')
    } finally {
      setLoading(false)
      performance.mark('dashboard-load-end')
      performance.measure('dashboard-load-total', 'dashboard-load-start', 'dashboard-load-end')
    }
  }

  const handleDescartar = () => {
    setShowNotification(false)
    showToast('Notificación descartada', 'info', 2000)
  }

  const isDoctor = profile?.role === 'doctor'

  // Memoización solo necesaria para el banner de notificación
  const upcomingCount = useMemo(() => appointments.length, [appointments])

  // ─── Patient Dashboard ──────────────────────────────────────────────────────
  const PatientHome = () => (
    <>
      {/* Stats */}
      <div className="space-y-6 md:space-y-8">
        <DashboardSummary
          userName={profile?.full_name || 'Usuario'}
          avatarUrl={profile?.avatar_url}
          loading={loading}
          data={summaryData}
          role={profile?.role}
        />

        {showNotification && upcomingCount > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 flex flex-col md:flex-row items-start gap-4">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <MessageCircle className="text-white" size={20} />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-sm text-gray-700">
                Tienes {upcomingCount} {upcomingCount === 1 ? 'consulta próxima' : 'consultas próximas'}
              </p>
            </div>
            <div className="flex gap-4 mx-auto md:mx-0">
              <button
                onClick={() => navigate(mapDashboardPath('/dashboard/consultas'))}
                className="text-primary font-medium text-sm hover:underline"
              >VER</button>
              <button onClick={handleDescartar} className="text-gray-500 font-medium text-sm hover:underline">CERRAR</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mi expediente de salud ── */}
      <div className="mt-6 md:mt-8">
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Mi expediente de salud</h2>
          <button
            onClick={() => navigate(mapDashboardPath('/dashboard/documentos'))}
            className="text-primary text-sm font-medium hover:underline"
          >Ver todo →</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
          {/* Por tipo */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4 md:p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">Por tipo de documento</p>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
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
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.colorClass}`}>
                          <Icon size={15} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-900 leading-none">{count}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{cfg.label}</p>
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

          {/* Documentos recientes */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Documentos recientes</p>
              <Clock size={15} className="text-gray-400" />
            </div>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
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
                  const date = new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(mapDashboardPath(`/dashboard/documentos/${doc.id}`))}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.colorClass}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">{doc.title}</p>
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

      {/* Compartidos por tu médico */}
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
            >Ver todos →</button>
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
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${cfg.colorClass}`}>
                    <Icon size={15} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">De {entry?.sender?.full_name || 'Tu médico'}</p>
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
          appointments={appointments}
          patientSnapshot={patientSnapshot}
          recentDocs={recentDocs}
          showNotification={showNotification}
          onDismissNotification={handleDescartar}
          onOpenConsultas={() => navigate(mapDashboardPath('/dashboard/consultas'))}
          navigate={navigate}
        />
      ) : (
        <PatientHome />
      )}
    </DashboardLayout>
  )
}
