import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Search, ShieldCheck, ShieldAlert,
  Clock, Send, Loader2, ShieldX, X, ChevronRight, UserPlus,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { useAuth } from '@/app/providers/AuthContext'
import {
  searchPatients,
  listDoctorPatients,
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
import { mapDashboardPath } from '@/context/DemoContext'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'


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

  // Consent requests sent by this doctor
  const [sentRequests, setSentRequests] = useState<ConsentWithProfile[]>([])

  // Create patient modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Document request modal
  const [docReqOpen, setDocReqOpen] = useState(false)
  const [docReqEmail, setDocReqEmail] = useState('')
  const [docReqPhone, setDocReqPhone] = useState('')
  const [docReqType, setDocReqType] = useState('')
  const [docReqWaLoading, setDocReqWaLoading] = useState(false)
  const [docReqId, setDocReqId] = useState<string | null>(null)

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
    const { ok, error } = await requestPatientAccess(user.id, patientId, requestReason)
    if (ok) {
      showToast('Solicitud enviada. El paciente decidirá si comparte su información.', 'success', 4000)
      setShowReasonFor(null)
      setRequestReason('')
      await loadAll()
    } else {
      showToast(error || 'Error al solicitar acceso', 'error', 3000)
    }
    setRequestingId(null)
  }

  const handleReRequest = async (patientId: string) => {
    if (!user) return
    setRequestingId(patientId)
    const { ok, error } = await reRequestAccess(user.id, patientId, requestReason)
    if (ok) {
      showToast('Solicitud re-enviada', 'success', 3000)
      setShowReasonFor(null)
      setRequestReason('')
      await loadAll()
    } else {
      showToast(error || 'Error', 'error', 3000)
    }
    setRequestingId(null)
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
        } catch { logger.error('Pacientes.sendWhatsApp', fnErr) }
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
        },
      })
      if (fnErr) {
        let detail = 'Error al crear el paciente'
        try {
          const fnErrWithContext = fnErr as { context?: { json?: () => Promise<unknown> } }
          const body = await fnErrWithContext.context?.json?.()
          const bodyData = body as { error?: string } | null
          detail = bodyData?.error ?? detail
        } catch { /* ignore */ }
        showToast(detail, 'error', 4000)
        return
      }
      const result = data as { patient_id: string; created: boolean }
      showToast(
        result.created ? '✅ Paciente creado y vinculado' : '✅ Paciente vinculado a tu lista',
        'success',
        4000,
      )
      setCreateOpen(false)
      setCreateName('')
      setCreateEmail('')
      setCreatePhone('')
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
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-6">

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-teal-400 to-emerald-500 px-5 py-4 text-white shadow-md">
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">Panel Doctor</p>
              <h1 className="text-lg font-bold leading-tight">Mis Pacientes</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white/15 border border-white/20 rounded-xl px-3.5 py-2 text-center">
                <p className="text-lg font-bold leading-none">{patients.length}</p>
                <p className="text-[9px] text-white/70 font-medium mt-0.5">Con acceso</p>
              </div>
              {pendingRequests.length > 0 && (
                <div className="bg-white/15 border border-white/20 rounded-xl px-3.5 py-2 text-center">
                  <p className="text-lg font-bold leading-none">{pendingRequests.length}</p>
                  <p className="text-[9px] text-white/70 font-medium mt-0.5">Pendientes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search + Actions */}
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar paciente…"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary shadow-sm transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-teal-600 transition-all shadow-sm active:scale-95 disabled:opacity-60 flex items-center gap-1.5 text-sm whitespace-nowrap"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Buscar
            </button>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-primary/30 hover:border-primary hover:bg-primary/5 rounded-xl transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
              <UserPlus size={17} />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-800 leading-tight">Crear paciente</p>
              <p className="text-[11px] text-gray-400 leading-tight">Registra un paciente directamente</p>
            </div>
            <ChevronRight size={15} className="text-gray-300 group-hover:text-primary transition-colors shrink-0" />
          </button>
          <button
            onClick={() => setDocReqOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-[#25D366]/40 hover:border-[#25D366] hover:bg-[#25D366]/5 rounded-xl transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366] shrink-0 group-hover:bg-[#25D366]/20 transition-colors">
              <WaIcon size={17} />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-800 leading-tight">Solicitar documento</p>
              <p className="text-[11px] text-gray-400 leading-tight">Envía una solicitud al paciente por WhatsApp</p>
            </div>
            <ChevronRight size={15} className="text-gray-300 group-hover:text-[#25D366] transition-colors shrink-0" />
          </button>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <p className="text-sm font-bold text-gray-800">Resultados</p>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{results.length}</span>
              {loading && <Loader2 size={13} className="animate-spin text-gray-400 ml-auto" />}
            </div>
            <div className="divide-y divide-gray-50">
              {results.map((p) => {
                const status = p.consentStatus || getStatusForPatient(p.id)
                const isAccepted = status === 'accepted'
                const isPending = status === 'requested'
                const isRejected = status === 'rejected' || status === 'revoked'

                return (
                  <div key={p.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-teal-400/15 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden text-sm">
                        {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.full_name || 'Paciente'}</p>
                        <div className="mt-0.5">
                          {isPending && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full"><Clock size={8} /> Pendiente</span>}
                          {isRejected && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full"><ShieldX size={8} /> {status === 'rejected' ? 'Rechazado' : 'Revocado'}</span>}
                          {isAccepted && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full"><ShieldCheck size={8} /> Con acceso</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isAccepted && (
                        <button
                          onClick={() => navigate(mapDashboardPath(`/dashboard/pacientes/${p.id}`))}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          Ver <ChevronRight size={12} />
                        </button>
                      )}
                      {!status && (
                        showReasonFor === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              value={requestReason}
                              onChange={(e) => setRequestReason(e.target.value)}
                              placeholder="Motivo (opcional)"
                              className="w-32 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/25"
                            />
                            <button
                              onClick={() => handleRequestAccess(p.id)}
                              disabled={requestingId === p.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                            >
                              {requestingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                              Enviar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setShowReasonFor(p.id); setRequestReason('') }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/25 rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            <ShieldAlert size={11} />
                            Solicitar acceso
                          </button>
                        )
                      )}
                      {isRejected && (
                        <button
                          onClick={() => handleReRequest(p.id)}
                          disabled={requestingId === p.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors"
                        >
                          {requestingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                          Re-solicitar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-sm font-bold text-amber-900">Solicitudes pendientes</p>
              <span className="ml-auto bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
            </div>
            <div className="divide-y divide-amber-100/60">
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0 overflow-hidden">
                    {r.patient?.avatar_url
                      ? <img src={r.patient.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (r.patient?.full_name?.charAt(0) || 'P').toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.patient?.full_name || 'Paciente'}</p>
                    <p className="text-[10px] text-amber-600">
                      {new Date(r.requested_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Esperando…</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patients with Access */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-gray-800">Pacientes con acceso</p>
            {patients.length > 0 && (
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{patients.length}</span>
            )}
            {loading && patients.length === 0 && <Loader2 size={13} className="animate-spin text-gray-400 ml-auto" />}
          </div>

          {patients.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/10 to-teal-400/10 flex items-center justify-center">
                <User size={24} className="text-primary/40" />
              </div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Sin pacientes aún</p>
              <p className="text-xs text-gray-400 max-w-[200px] mx-auto">Busca pacientes y solicita acceso a su expediente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(mapDashboardPath(`/dashboard/pacientes/${p.id}`))}
                  className="group bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3.5"
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-teal-400/15 flex items-center justify-center text-primary font-bold overflow-hidden">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={18} />}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors text-sm">
                      {p.full_name || 'Paciente'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full mt-0.5">
                      <ShieldCheck size={8} /> Expediente activo
                    </span>
                  </div>
                  <ChevronRight size={15} className="text-gray-200 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Patient Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <UserPlus size={16} />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Crear paciente</h2>
              </div>
              <button
                onClick={() => { setCreateOpen(false); setCreateName(''); setCreateEmail(''); setCreatePhone('') }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreatePatient} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="Nombre del paciente"
                  required
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={e => setCreateEmail(e.target.value)}
                  placeholder="paciente@correo.com"
                  required
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={createPhone}
                  onChange={e => setCreatePhone(e.target.value)}
                  placeholder="52 81 XXXX XXXX"
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Se creará una cuenta pre-registrada. El paciente podrá completar su perfil al iniciar sesión.
              </p>
              <button
                type="submit"
                disabled={createLoading || !createName.trim() || !createEmail.trim()}
                className="w-full py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-1 bg-primary hover:bg-teal-600 text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                Crear paciente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Document Request Modal */}
      {docReqOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                  <WaIcon size={16} />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Solicitar documento</h2>
              </div>
              <button onClick={resetDocReqModal} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSendWhatsApp} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">WhatsApp del paciente</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <WaIcon size={14} />
                  </span>
                  <input
                    type="tel"
                    value={docReqPhone}
                    onChange={e => setDocReqPhone(e.target.value)}
                    placeholder="52 81 XXXX XXXX"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Correo (opcional)</label>
                <input
                  type="email"
                  value={docReqEmail}
                  onChange={e => setDocReqEmail(e.target.value)}
                  placeholder="paciente@correo.com"
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Documento solicitado</label>
                <input
                  type="text"
                  list="doc-type-options"
                  value={docReqType}
                  onChange={e => setDocReqType(e.target.value)}
                  placeholder="Ej. Análisis de sangre, Radiografía…"
                  required
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                className={`w-full py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-1 ${
                  isPhoneValid(docReqPhone) && !docReqWaLoading
                    ? 'bg-[#25D366] hover:bg-[#1db954] text-white active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {docReqWaLoading ? <Loader2 size={15} className="animate-spin" /> : <WaIcon size={16} />}
                Enviar por WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
