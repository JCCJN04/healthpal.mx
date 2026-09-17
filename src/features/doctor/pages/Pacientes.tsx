import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Search,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Send,
  Loader2,
  ShieldX,
  X,
  ChevronRight,
  UserPlus,
  UserCheck,
  UserMinus,
  AlertTriangle,
  Plus,
  LayoutGrid,
  List,
  Mail,
} from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { SpotlightCard } from '@/shared/components/ui/SpotlightCard'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { useAuth } from '@/app/providers/AuthContext'
import {
  searchPatients,
  listDoctorPatients,
  requestAccessByIdentifier,
  unlinkPatientFromDoctor,
  PatientProfileLite,
} from '@/features/doctor/services/patients'
import {
  requestPatientAccess,
  reRequestAccess,
  getDoctorConsentRequests,
  ConsentWithProfile,
} from '@/shared/lib/queries/consent'
import { createDocumentRequest } from '@/shared/lib/queries/documentRequests'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

const listStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

export default function Pacientes() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [patients, setPatients] = useState<PatientProfileLite[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<PatientProfileLite[]>([])
  const [loading, setLoading] = useState(false)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [requestReason, setRequestReason] = useState('')
  const [showReasonFor, setShowReasonFor] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients
    const q = searchTerm.toLowerCase().trim()
    return patients.filter(
      (p) =>
        (p.full_name?.toLowerCase() ?? '').includes(q) ||
        (p.email?.toLowerCase() ?? '').includes(q),
    )
  }, [patients, searchTerm])

  // Consent requests sent by this doctor
  const [sentRequests, setSentRequests] = useState<ConsentWithProfile[]>([])

  // Link existing patient modal
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkIdentifier, setLinkIdentifier] = useState('')
  const [linkReason, setLinkReason] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)

  // Create patient modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createBirthdate, setCreateBirthdate] = useState('')
  const [createSex, setCreateSex] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Document request modal
  const [docReqOpen, setDocReqOpen] = useState(false)
  const [docReqEmail, setDocReqEmail] = useState('')
  const [docReqPhone, setDocReqPhone] = useState('')
  const [docReqType, setDocReqType] = useState('')
  const [docReqWaLoading, setDocReqWaLoading] = useState(false)
  const [docReqId, setDocReqId] = useState<string | null>(null)

  // Unlink patient modal
  const [unlinkTarget, setUnlinkTarget] = useState<PatientProfileLite | null>(null)
  const [unlinkCancelAppointments, setUnlinkCancelAppointments] = useState(true)
  const [unlinkLoading, setUnlinkLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadAll = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [pats, reqs] = await Promise.all([
        listDoctorPatients(user.id),
        getDoctorConsentRequests(user.id),
      ])
      setPatients(pats || [])
      setSentRequests(reqs || [])
    } catch (err) {
      logger.error('Pacientes.load', err)
      showToast('Error al cargar pacientes', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      showToast('Escribe al menos 3 caracteres', 'info', 2000)
      return
    }
    setLoading(true)
    try {
      const data = await searchPatients(searchTerm, user!.id)
      setResults(data)
    } catch (err) {
      logger.error('Pacientes.search', err)
      showToast('Error al buscar pacientes', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAccess = async (patientId: string) => {
    if (!user) return
    setRequestingId(patientId)
    try {
      const { ok, error } = await requestPatientAccess(user.id, patientId, requestReason)
      if (ok) {
        showToast(
          'Solicitud enviada. El paciente decidirá si comparte su información.',
          'success',
          4000,
        )
        setShowReasonFor(null)
        setRequestReason('')
        await loadAll()
      } else {
        showToast(error || 'Error al solicitar acceso', 'error', 3000)
      }
    } catch (err) {
      logger.error('Pacientes.requestAccess', err)
      showToast('Error al solicitar acceso', 'error', 3000)
    } finally {
      setRequestingId(null)
    }
  }

  const handleReRequest = async (patientId: string) => {
    if (!user) return
    setRequestingId(patientId)
    try {
      const { ok, error } = await reRequestAccess(user.id, patientId, requestReason)
      if (ok) {
        showToast('Solicitud re-enviada', 'success', 3000)
        setShowReasonFor(null)
        setRequestReason('')
        await loadAll()
      } else {
        showToast(error || 'Error', 'error', 3000)
      }
    } catch (err) {
      logger.error('Pacientes.reRequest', err)
      showToast('Error al re-enviar solicitud', 'error', 3000)
    } finally {
      setRequestingId(null)
    }
  }

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/[\s\-().+]/g, '')
    if (digits.startsWith('52') && digits.length === 12) return digits
    if (digits.startsWith('1') && digits.length === 11) return digits
    if (digits.length === 10) return `52${digits}`
    return digits
  }

  const isPhoneValid = (raw: string): boolean => {
    const digits = raw.replace(/[\s\-().+]/g, '')
    return (
      (digits.startsWith('52') && digits.length === 12) ||
      (digits.startsWith('1') && digits.length === 11) ||
      digits.length === 10
    )
  }

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    setDocReqWaLoading(true)
    try {
      const phone = normalizePhone(docReqPhone)
      // Create the document request first if not already done
      let requestId = docReqId
      if (!requestId) {
        const { data, error } = await createDocumentRequest(docReqEmail, docReqType, '', phone)
        if (error || !data) {
          showToast(error || 'Error al crear la solicitud', 'error', 3000)
          return
        }
        requestId = data.id
        setDocReqId(requestId)
      }

      const { error: fnErr } = await supabase.functions.invoke('send-document-request-whatsapp', {
        body: {
          document_request_id: requestId,
          patient_phone: phone,
          doctor_name: profile.full_name ?? 'Doctor',
          document_type: docReqType,
          doctor_id: user.id,
        },
      })

      if (fnErr) {
        let detail = 'Error al enviar WhatsApp'
        try {
          const fnErrWithContext = fnErr as {
            context?: {
              json?: () => Promise<unknown>
            }
          }
          const body = await fnErrWithContext.context?.json?.()
          const bodyData = body as { detail?: string; error?: string } | null
          detail = bodyData?.detail ?? bodyData?.error ?? detail
          logger.error('Pacientes.sendWhatsApp', body)
        } catch {
          logger.error('Pacientes.sendWhatsApp', fnErr)
        }
        showToast(`❌ ${detail}`, 'error', 6000)
      } else {
        showToast('✅ Solicitud enviada por WhatsApp al paciente', 'success', 4000)
        resetDocReqModal()
      }
    } catch (err) {
      logger.error('Pacientes.sendWhatsApp', err)
      showToast('❌ Error inesperado al enviar WhatsApp', 'error', 4000)
    } finally {
      setDocReqWaLoading(false)
    }
  }

  const resetDocReqModal = () => {
    setDocReqOpen(false)
    setDocReqId(null)
    setDocReqEmail('')
    setDocReqPhone('')
    setDocReqType('')
  }

  const handleLinkExistingPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !linkIdentifier.trim()) return
    setLinkLoading(true)
    try {
      const result = await requestAccessByIdentifier(user.id, linkIdentifier, linkReason)
      if (result.ok) {
        showToast(result.message, 'success', 5000)
        setLinkOpen(false)
        setLinkIdentifier('')
        setLinkReason('')
        await loadAll()
      } else {
        showToast(result.message, 'error', 4500)
      }
    } catch (err) {
      logger.error('Pacientes.linkExisting', err)
      showToast('Error al solicitar acceso al paciente', 'error', 3000)
    } finally {
      setLinkLoading(false)
    }
  }

  const handleUnlinkPatient = async () => {
    if (!user || !unlinkTarget) return
    setUnlinkLoading(true)
    try {
      const res = await unlinkPatientFromDoctor(user.id, unlinkTarget.id, unlinkCancelAppointments)
      if (res.ok) {
        showToast(res.message, 'success', 5000)
        setUnlinkTarget(null)
        await loadAll()
      } else {
        showToast(res.message, 'error', 4500)
      }
    } catch (err) {
      logger.error('Pacientes.unlink', err)
      showToast('Error al desvincular al paciente', 'error', 3000)
    } finally {
      setUnlinkLoading(false)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setCreateLoading(true)
    try {
      const { error: fnErr, data } = await supabase.functions.invoke('create-patient-direct', {
        body: {
          email: createEmail.trim().toLowerCase(),
          full_name: createName.trim(),
          phone: createPhone.trim() || undefined,
          birthdate: createBirthdate || undefined,
          sex: createSex || undefined,
        },
      })
      if (fnErr) {
        let detail = 'Error al crear el paciente'
        try {
          const fnErrWithContext = fnErr as { context?: { json?: () => Promise<unknown> } }
          const body = await fnErrWithContext.context?.json?.()
          const bodyData = body as { error?: string } | null
          detail = bodyData?.error ?? detail
        } catch {
          /* ignore */
        }
        showToast(detail, 'error', 4000)
        return
      }
      const result = data as { patient_id: string; created: boolean; requires_consent?: boolean }
      if (result.requires_consent) {
        showToast(
          '📨 Este paciente ya tiene cuenta en HealthPal. Se le envió una solicitud de acceso — recibirás acceso cuando la apruebe.',
          'info',
          6000,
        )
      } else {
        showToast(
          result.created ? '✅ Paciente creado y vinculado' : '✅ Paciente vinculado a tu lista',
          'success',
          4000,
        )
      }
      setCreateOpen(false)
      setCreateName('')
      setCreateEmail('')
      setCreatePhone('')
      setCreateBirthdate('')
      setCreateSex('')
      await loadAll()
    } catch (err) {
      logger.error('Pacientes.createPatient', err)
      showToast('Error inesperado al crear paciente', 'error', 4000)
    } finally {
      setCreateLoading(false)
    }
  }

  const canManage = useMemo(() => profile?.role === 'doctor', [profile])

  if (!canManage) {
    return (
      <DashboardLayout>
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <p className="text-sm text-gray-700">Solo los doctores pueden gestionar pacientes.</p>
        </div>
      </DashboardLayout>
    )
  }

  // Categorize sent requests
  const pendingRequests = sentRequests.filter((r) => r.status === 'requested')

  const getStatusForPatient = (id: string) => {
    const r = sentRequests.find((req) => req.patient_id === id)
    return r?.status || null
  }

  const WaIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )

  return (
    <DashboardLayout>
      {/* Ambient decorative glowing orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-20 right-10 w-96 h-96 bg-[#33C7BE]/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-8 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Mis Pacientes
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading && patients.length === 0
                ? 'Cargando pacientes…'
                : `${patients.length} paciente${patients.length !== 1 ? 's' : ''} con acceso en tu consultorio`}
              {pendingRequests.length > 0 && (
                <span className="ml-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {pendingRequests.length} pendiente{pendingRequests.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setLinkOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs"
            >
              <UserCheck className="w-4 h-4 text-[#33C7BE]" />
              <span>Vincular</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#33C7BE] text-white font-semibold text-xs sm:text-sm rounded-xl hover:bg-teal-600 transition-all shadow-sm shadow-teal-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo paciente</span>
            </motion.button>
          </div>
        </div>

        {/* 3 Quick Action Cards with Spotlight Orb Glow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SpotlightCard
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            spotlightColor="rgba(51, 199, 190, 0.22)"
            onClick={() => setLinkOpen(true)}
            className="group relative overflow-hidden rounded-2xl border border-teal-100/80 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/20 p-5 text-left shadow-xs hover:shadow-md hover:border-teal-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#33C7BE] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="w-7 h-7 rounded-full bg-teal-50/80 text-teal-400 group-hover:text-[#33C7BE] group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-base group-hover:text-[#33C7BE] transition-colors">
              Vincular Paciente
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Solicita acceso a un usuario ya registrado en HealthPal mediante su correo o teléfono.
            </p>
          </SpotlightCard>

          <SpotlightCard
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            spotlightColor="rgba(51, 199, 190, 0.25)"
            onClick={() => setCreateOpen(true)}
            className="group relative overflow-hidden rounded-2xl border border-teal-100/80 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 p-5 text-left shadow-xs hover:shadow-md hover:border-teal-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#33C7BE] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="w-7 h-7 rounded-full bg-teal-50/80 text-teal-400 group-hover:text-[#33C7BE] group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-base group-hover:text-[#33C7BE] transition-colors">
              Crear Nuevo Paciente
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Da de alta a un paciente nuevo en tu consultorio para abrir su expediente clínico.
            </p>
          </SpotlightCard>

          <SpotlightCard
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            spotlightColor="rgba(37, 211, 102, 0.22)"
            onClick={() => setDocReqOpen(true)}
            className="group relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/20 to-green-50/30 p-5 text-left shadow-xs hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#25D366] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <WaIcon size={20} />
              </div>
              <span className="w-7 h-7 rounded-full bg-emerald-50/80 text-emerald-400 group-hover:text-[#25D366] group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">
              Solicitar Documento
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Pide estudios de laboratorio, imagenología o recetas vía WhatsApp o enlace seguro.
            </p>
          </SpotlightCard>
        </div>

        {/* Integrated Search & View Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por nombre, correo o teléfono…"
              className="w-full pl-10 pr-24 py-3 bg-white border border-gray-200/90 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setResults([])
                }}
                className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#33C7BE] text-white font-semibold text-xs rounded-xl hover:bg-teal-600 transition-all flex items-center gap-1 shadow-xs disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Buscar</span>
            </button>
          </div>

          <div className="flex items-center bg-gray-100/90 rounded-xl p-1 gap-1 self-end sm:self-auto flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cuadrícula</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>

        {/* Search Results from HealthPal Network */}
        {results.length > 0 && (
          <SpotlightCard
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            spotlightColor="rgba(51, 199, 190, 0.16)"
            enableHoverLift={false}
            className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">
                  Resultados en la red HealthPal
                </span>
                <span className="text-xs font-bold text-[#33C7BE] bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                  {results.length}
                </span>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 ml-2" />}
              </div>
              <button
                onClick={() => setResults([])}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                Cerrar resultados
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {results.map((p) => {
                const status = p.consentStatus || getStatusForPatient(p.id)
                const isAccepted = status === 'accepted'
                const isPending = status === 'requested'
                const isRejected = status === 'rejected' || status === 'revoked'

                return (
                  <div
                    key={p.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden text-sm shadow-xs">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (p.full_name ?? 'P').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {p.full_name || 'Paciente'}
                        </p>
                        <div className="mt-0.5">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              <Clock size={10} /> Solicitud pendiente
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              <ShieldX size={10} />{' '}
                              {status === 'rejected' ? 'Rechazado' : 'Revocado'}
                            </span>
                          )}
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <ShieldCheck size={10} /> Con acceso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isAccepted && (
                        <button
                          onClick={() => navigate(`/dashboard/pacientes/${p.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#33C7BE] bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          Ver expediente <ChevronRight size={12} />
                        </button>
                      )}
                      {!status &&
                        (showReasonFor === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              value={requestReason}
                              onChange={(e) => setRequestReason(e.target.value)}
                              placeholder="Motivo (opcional)"
                              className="w-36 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33C7BE]"
                            />
                            <button
                              onClick={() => handleRequestAccess(p.id)}
                              disabled={requestingId === p.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#33C7BE] text-white text-xs font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                            >
                              {requestingId === p.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Send size={11} />
                              )}
                              Enviar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setShowReasonFor(p.id)
                              setRequestReason('')
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#33C7BE] border border-[#33C7BE]/30 rounded-lg hover:bg-teal-50 transition-colors"
                          >
                            <ShieldAlert size={12} />
                            Solicitar acceso
                          </button>
                        ))}
                      {isRejected && (
                        <button
                          onClick={() => handleReRequest(p.id)}
                          disabled={requestingId === p.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors"
                        >
                          {requestingId === p.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Send size={11} />
                          )}
                          Re-solicitar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </SpotlightCard>
        )}

        {/* Pending Requests Banner */}
        {pendingRequests.length > 0 && (
          <SpotlightCard
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            spotlightColor="rgba(245, 158, 11, 0.22)"
            enableHoverLift={false}
            className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/70 rounded-2xl border border-amber-200/80 shadow-xs p-5"
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Solicitudes de acceso pendientes ({pendingRequests.length})</span>
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
                Esperando autorización del paciente
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingRequests.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl p-3.5 border border-amber-100 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {(r.patient?.full_name?.charAt(0) || 'P').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-xs truncate">
                        {r.patient?.full_name || 'Paciente'}
                      </p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        Enviada el{' '}
                        {new Date(r.requested_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                    Pendiente
                  </span>
                </div>
              ))}
            </div>
          </SpotlightCard>
        )}

        {/* Patients with Access Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Pacientes con acceso</h2>
              {filteredPatients.length > 0 && (
                <span className="text-xs font-bold text-[#33C7BE] bg-teal-50 border border-teal-100/80 px-2.5 py-0.5 rounded-full">
                  {filteredPatients.length}
                </span>
              )}
            </div>

            {searchTerm && (
              <span className="text-xs text-gray-500">
                Mostrando {filteredPatients.length} de {patients.length} pacientes
              </span>
            )}
          </div>

          {/* Empty state */}
          {patients.length === 0 && !loading ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 py-16 px-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 text-[#33C7BE] flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Sin pacientes aún</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                Vincula a un paciente registrado o crea uno nuevo para comenzar a gestionar sus
                expedientes médicos.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setLinkOpen(true)}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50"
                >
                  Vincular paciente
                </button>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="px-4 py-2.5 bg-[#33C7BE] text-white font-semibold text-xs rounded-xl hover:bg-teal-600 shadow-sm"
                >
                  Crear nuevo paciente
                </button>
              </div>
            </div>
          ) : filteredPatients.length === 0 && searchTerm ? (
            <div className="bg-white rounded-3xl border border-gray-100 py-14 px-4 text-center shadow-xs">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                No se encontraron pacientes en tu lista para "{searchTerm}"
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                Puedes buscar en toda la red de HealthPal para solicitar acceso a su expediente.
              </p>
              <button
                onClick={handleSearch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#33C7BE] text-white font-semibold text-xs rounded-xl hover:bg-teal-600 transition-all shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                Buscar en la red HealthPal
              </button>
            </div>
          ) : (
            <motion.div
              variants={listStagger}
              initial="hidden"
              animate="visible"
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-2.5'
              }
            >
              {filteredPatients.map((p) =>
                viewMode === 'grid' ? (
                  <SpotlightCard
                    key={p.id}
                    variants={fadeUpVariant}
                    spotlightColor="rgba(51, 199, 190, 0.2)"
                    onClick={() => navigate(`/dashboard/pacientes/${p.id}`)}
                    className="group rounded-2xl border border-gray-100/90 shadow-xs hover:border-teal-300 hover:shadow-md transition-all duration-200 p-5 cursor-pointer relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="relative shrink-0">
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt=""
                              className="w-13 h-13 rounded-2xl object-cover ring-2 ring-white shadow-xs"
                            />
                          ) : (
                            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#33C7BE] to-teal-600 flex items-center justify-center text-white font-extrabold text-base shadow-xs">
                              {(p.full_name ?? 'P')
                                .split(' ')
                                .map((w: string) => w[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUnlinkTarget(p)
                          }}
                          title="Desvincular paciente"
                          className="p-1.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base group-hover:text-[#33C7BE] transition-colors truncate mb-1">
                        {p.full_name || 'Paciente'}
                      </h3>

                      {p.email ? (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate mb-3">
                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{p.email}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic mb-3">Sin correo registrado</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/60">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Expediente activo
                      </span>

                      <span className="text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        Ver <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </SpotlightCard>
                ) : (
                  <SpotlightCard
                    key={p.id}
                    variants={fadeUpVariant}
                    spotlightColor="rgba(51, 199, 190, 0.16)"
                    enableHoverLift={false}
                    whileHover={{ scale: 1.005 }}
                    onClick={() => navigate(`/dashboard/pacientes/${p.id}`)}
                    className="group rounded-2xl border border-gray-100/90 shadow-xs hover:border-teal-300 hover:shadow-md transition-all p-4 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt=""
                            className="w-11 h-11 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                            {(p.full_name ?? 'P')
                              .split(' ')
                              .map((w: string) => w[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm group-hover:text-[#33C7BE] transition-colors truncate">
                          {p.full_name || 'Paciente'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {p.email || 'Sin correo registrado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/60">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Expediente activo
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUnlinkTarget(p)
                        }}
                        title="Desvincular paciente"
                        className="p-1.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#33C7BE] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </SpotlightCard>
                ),
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Link Existing Patient Modal */}
        {linkOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setLinkOpen(false)
                setLinkIdentifier('')
                setLinkReason('')
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#33C7BE]">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Vincular paciente</h2>
                    <p className="text-[11px] text-gray-400">Cuenta existente en HealthPal</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setLinkOpen(false)
                    setLinkIdentifier('')
                    setLinkReason('')
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleLinkExistingPatient} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Correo o teléfono del paciente
                  </label>
                  <input
                    type="text"
                    value={linkIdentifier}
                    onChange={(e) => setLinkIdentifier(e.target.value)}
                    placeholder="ej. paciente@correo.com o 8121921877"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                    Enviaremos una solicitud de acceso al paciente para que autorice compartir su
                    expediente clínico.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Motivo de la solicitud (opcional)
                  </label>
                  <input
                    type="text"
                    value={linkReason}
                    onChange={(e) => setLinkReason(e.target.value)}
                    placeholder="ej. Consulta médica general, seguimiento..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={linkLoading || !linkIdentifier.trim()}
                  className="w-full py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-teal-500/20 mt-3 bg-[#33C7BE] hover:bg-teal-600 text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {linkLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>Solicitar acceso</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Create Patient Modal */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setCreateOpen(false)
                setCreateName('')
                setCreateEmail('')
                setCreatePhone('')
                setCreateBirthdate('')
                setCreateSex('')
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#33C7BE]">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Crear paciente</h2>
                    <p className="text-[11px] text-gray-400">Nuevo registro en tu consultorio</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCreateOpen(false)
                    setCreateName('')
                    setCreateEmail('')
                    setCreatePhone('')
                    setCreateBirthdate('')
                    setCreateSex('')
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Nombre y apellidos del paciente"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="52 81 XXXX XXXX"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Fecha de nacimiento
                    </label>
                    <input
                      type="date"
                      value={createBirthdate}
                      onChange={(e) => setCreateBirthdate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Sexo (opcional)
                    </label>
                    <select
                      value={createSex}
                      onChange={(e) => setCreateSex(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent bg-white transition-all"
                    >
                      <option value="">—</option>
                      <option value="male">Masculino</option>
                      <option value="female">Femenino</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Se creará un perfil en tu consultorio. El paciente podrá acceder a su cuenta y
                  consultar sus recetas e indicaciones.
                </p>
                <button
                  type="submit"
                  disabled={createLoading || !createName.trim() || !createEmail.trim()}
                  className="w-full py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-2 bg-[#33C7BE] hover:bg-teal-600 text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  <span>Crear paciente</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Document Request Modal */}
        {docReqOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetDocReqModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                    <WaIcon size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Solicitar documento</h2>
                    <p className="text-[11px] text-gray-400">Vía WhatsApp o enlace seguro</p>
                  </div>
                </div>
                <button
                  onClick={resetDocReqModal}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendWhatsApp} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    WhatsApp del paciente
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <WaIcon size={16} />
                    </span>
                    <input
                      type="tel"
                      value={docReqPhone}
                      onChange={(e) => setDocReqPhone(e.target.value)}
                      placeholder="52 81 XXXX XXXX"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Correo (opcional)
                  </label>
                  <input
                    type="email"
                    value={docReqEmail}
                    onChange={(e) => setDocReqEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Documento solicitado
                  </label>
                  <input
                    type="text"
                    list="doc-type-options"
                    value={docReqType}
                    onChange={(e) => setDocReqType(e.target.value)}
                    placeholder="Ej. Análisis de sangre, Radiografía…"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent transition-all"
                  />
                  <datalist id="doc-type-options">
                    <option value="Análisis de sangre completo" />
                    <option value="Radiografía" />
                    <option value="Resonancia magnética" />
                    <option value="Tomografía" />
                    <option value="Ultrasonido" />
                    <option value="Receta médica" />
                    <option value="Historial médico" />
                    <option value="Resultados de laboratorio" />
                    <option value="Póliza de seguro médico" />
                    <option value="Electrocardiograma" />
                    <option value="Densitometría ósea" />
                    <option value="Expediente de vacunación" />
                  </datalist>
                </div>
                <button
                  type="submit"
                  disabled={docReqWaLoading || !isPhoneValid(docReqPhone)}
                  className={`w-full py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-2 ${
                    isPhoneValid(docReqPhone) && !docReqWaLoading
                      ? 'bg-[#25D366] hover:bg-[#1db954] text-white active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {docReqWaLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <WaIcon size={18} />
                  )}
                  <span>Enviar por WhatsApp</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Unlink Patient Modal */}
        {unlinkTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUnlinkTarget(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-red-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                    <UserMinus size={18} />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Desvincular paciente</h2>
                </div>
                <button
                  onClick={() => setUnlinkTarget(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {unlinkTarget.avatar_url ? (
                      <img
                        src={unlinkTarget.avatar_url}
                        alt=""
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      (unlinkTarget.full_name ?? 'P').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {unlinkTarget.full_name || 'Paciente'}
                    </p>
                    {unlinkTarget.email && (
                      <p className="text-xs text-gray-400 truncate">{unlinkTarget.email}</p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-2 bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl">
                  <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    Al desvincular a este paciente:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800/90 pl-1 leading-relaxed">
                    <li>Se revocará tu acceso activo a su expediente y documentos.</li>
                    <li>
                      Las notas médicas y recetas emitidas se{' '}
                      <strong>conservarán de forma segura</strong> en la cuenta del paciente
                      conforme a la NOM-004.
                    </li>
                    <li>
                      Si lo vuelves a vincular en el futuro, se reanudará el acceso a su historial.
                    </li>
                  </ul>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={unlinkCancelAppointments}
                    onChange={(e) => setUnlinkCancelAppointments(e.target.checked)}
                    className="mt-0.5 rounded text-[#33C7BE] focus:ring-[#33C7BE] h-4 w-4"
                  />
                  <span className="text-xs text-gray-600 font-medium">
                    Cancelar citas futuras programadas con este paciente
                  </span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUnlinkTarget(null)}
                    disabled={unlinkLoading}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlinkPatient}
                    disabled={unlinkLoading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {unlinkLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <UserMinus size={14} />
                    )}
                    Confirmar desvinculación
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
