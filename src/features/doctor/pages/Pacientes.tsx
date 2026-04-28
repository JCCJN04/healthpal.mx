import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Search, ShieldCheck, ShieldAlert,
  Clock, Send, Loader2, ShieldX, FileUp, X, Copy, Check, ChevronRight,
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

  // Document request modal
  const [docReqOpen, setDocReqOpen] = useState(false)
  const [docReqEmail, setDocReqEmail] = useState('')
  const [docReqPhone, setDocReqPhone] = useState('')
  const [docReqType, setDocReqType] = useState('')
  const [docReqDesc, setDocReqDesc] = useState('')
  const [docReqLoading, setDocReqLoading] = useState(false)
  const [docReqWaLoading, setDocReqWaLoading] = useState(false)
  const [docReqLink, setDocReqLink] = useState<string | null>(null)
  const [docReqId, setDocReqId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  const handleCreateDocRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setDocReqLoading(true)
    try {
      const phone = docReqPhone.trim() ? normalizePhone(docReqPhone) : undefined
      const { data, error } = await createDocumentRequest(user.id, docReqEmail, docReqType, docReqDesc, phone)
      if (error || !data) {
        showToast(error || 'Error al crear la solicitud', 'error', 3000)
        return
      }
      const link = `${window.location.origin}/solicitud/${data.token}`
      setDocReqLink(link)
      setDocReqId(data.id)
    } catch (err) {
      logger.error('Pacientes.createDocRequest', err)
      showToast('Error inesperado', 'error', 3000)
    } finally {
      setDocReqLoading(false)
    }
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
        const { data, error } = await createDocumentRequest(user.id, docReqEmail, docReqType, docReqDesc, phone)
        if (error || !data) {
          showToast(error || 'Error al crear la solicitud', 'error', 3000)
          return
        }
        requestId = data.id
        setDocReqLink(`${window.location.origin}/solicitud/${data.token}`)
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
          // Prefer Meta's raw error over our generic wrapper
          const bodyData = body as { detail?: string; error?: string } | null
          detail = bodyData?.detail ?? bodyData?.error ?? detail
          logger.error('Pacientes.sendWhatsApp', body)
        } catch { logger.error('Pacientes.sendWhatsApp', fnErr) }
        showToast(`❌ ${detail} — copia el enlace manualmente`, 'error', 8000)
      } else {
        showToast('✅ Solicitud enviada por WhatsApp al paciente', 'success', 4000)
        resetDocReqModal()
      }
    } catch (err) {
      logger.error('Pacientes.sendWhatsApp', err)
      showToast('❌ Error al enviar WhatsApp, copia el enlace manualmente', 'error', 4000)
    } finally {
      setDocReqWaLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!docReqLink) return
    navigator.clipboard.writeText(docReqLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetDocReqModal = () => {
    setDocReqOpen(false)
    setDocReqLink(null)
    setDocReqId(null)
    setDocReqEmail('')
    setDocReqPhone('')
    setDocReqType('')
    setDocReqDesc('')
    setCopied(false)
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

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-4">

        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-emerald-500 p-6 md:p-8 text-white shadow-lg">
          <div className="absolute top-0 right-0 bottom-0 w-80 opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/65 mb-1">Panel Doctor</p>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">Mis Pacientes</h1>
              <p className="text-sm text-white/75 mt-1">Gestiona expedientes y solicita documentos a tus pacientes</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 text-center min-w-[76px] border border-white/10">
                <p className="text-2xl font-bold">{patients.length}</p>
                <p className="text-[11px] text-white/70 font-medium mt-0.5">Con acceso</p>
              </div>
              {pendingRequests.length > 0 && (
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 text-center min-w-[76px] border border-white/10">
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-[11px] text-white/70 font-medium mt-0.5">Pendientes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search + Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar paciente por nombre (mín. 3 letras)…"
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary shadow-sm transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-teal-600 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Buscar
          </button>
          <button
            onClick={() => setDocReqOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm whitespace-nowrap"
          >
            <FileUp size={15} className="text-primary" />
            Solicitar doc.
          </button>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <p className="text-sm font-bold text-gray-800">Resultados de búsqueda</p>
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
                  <div key={p.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-teal-400/15 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.full_name || 'Paciente'}</p>
                          <div className="mt-0.5">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                <Clock size={9} /> Pendiente
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                <ShieldX size={9} /> {status === 'rejected' ? 'Rechazado' : 'Revocado'}
                              </span>
                            )}
                            {isAccepted && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <ShieldCheck size={9} /> Con acceso
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {isAccepted && (
                          <button
                            onClick={() => navigate(mapDashboardPath(`/dashboard/pacientes/${p.id}`))}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
                          >
                            Ver expediente <ChevronRight size={14} />
                          </button>
                        )}
                        {!status && (
                          showReasonFor === p.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={requestReason}
                                onChange={(e) => setRequestReason(e.target.value)}
                                placeholder="Motivo (opcional)"
                                className="w-40 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/25"
                              />
                              <button
                                onClick={() => handleRequestAccess(p.id)}
                                disabled={requestingId === p.id}
                                className="inline-flex items-center gap-1 px-3.5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-colors"
                              >
                                {requestingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                Enviar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setShowReasonFor(p.id); setRequestReason('') }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-primary border border-primary/25 rounded-xl hover:bg-primary/5 transition-colors"
                            >
                              <ShieldAlert size={13} />
                              Solicitar acceso
                            </button>
                          )
                        )}
                        {isRejected && (
                          <button
                            onClick={() => handleReRequest(p.id)}
                            disabled={requestingId === p.id}
                            className="inline-flex items-center gap-1 px-3.5 py-2 text-sm font-semibold text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 disabled:opacity-50 transition-colors"
                          >
                            {requestingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            Re-solicitar
                          </button>
                        )}
                      </div>
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
            <div className="px-5 py-3.5 border-b border-amber-100/80 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm font-bold text-amber-900">Solicitudes de acceso pendientes</p>
              <span className="ml-auto bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            </div>
            <div className="px-3 py-1">
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-3 px-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0 overflow-hidden">
                    {r.patient?.avatar_url ? (
                      <img src={r.patient.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (r.patient?.full_name?.charAt(0) || 'P').toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.patient?.full_name || 'Paciente'}</p>
                    <p className="text-[11px] text-amber-700">
                      Enviada el {new Date(r.requested_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full shrink-0">
                    Esperando…
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patients with Access */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-gray-800">Pacientes con acceso</p>
            {patients.length > 0 && (
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{patients.length}</span>
            )}
            {loading && patients.length === 0 && <Loader2 size={13} className="animate-spin text-gray-400 ml-auto" />}
          </div>

          {patients.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-teal-400/10 flex items-center justify-center">
                <User size={28} className="text-primary/40" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Sin pacientes aún</h3>
              <p className="text-xs text-gray-400 max-w-[240px] mx-auto leading-relaxed">
                Usa el buscador para encontrar pacientes y solicitar acceso a su expediente médico.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(mapDashboardPath(`/dashboard/pacientes/${p.id}`))}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-primary/25 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-teal-400/15 flex items-center justify-center text-primary font-bold text-base overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors text-sm leading-tight">
                        {p.full_name || 'Paciente'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Acceso activo</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-200 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-gray-50 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={9} /> Expediente disponible
                    </span>
                    <span className="text-[11px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Request Modal */}
      {docReqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileUp size={18} className="text-primary" />
                <h2 className="text-base font-bold text-gray-900">Solicitar documento al paciente</h2>
              </div>
              <button onClick={resetDocReqModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {docReqLink ? (
              /* Link generated — show copy UI */
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Comparte este enlace con tu paciente. Al abrirlo, se le pedirá crear una cuenta (si no tiene) y subir el documento.
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-gray-700 truncate flex-1 font-mono">{docReqLink}</span>
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">El enlace expira en 7 días.</p>
                <button
                  onClick={resetDocReqModal}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Listo
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleCreateDocRequest} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Correo del paciente</label>
                  <input
                    type="email"
                    value={docReqEmail}
                    onChange={e => setDocReqEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-gray-400 mt-1">No necesita tener cuenta — se le pedirá crearla al abrir el enlace.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp del paciente (opcional)</label>
                  <input
                    type="tel"
                    value={docReqPhone}
                    onChange={e => setDocReqPhone(e.target.value)}
                    placeholder="52 81 XXXX XXXX"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-gray-400 mt-1">Si lo proporcionas, podrás enviar la solicitud directo por WhatsApp</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">¿Qué documento necesitas?</label>
                  <input
                    type="text"
                    list="doc-type-options"
                    value={docReqType}
                    onChange={e => setDocReqType(e.target.value)}
                    placeholder="Selecciona o escribe el tipo de documento…"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Instrucción adicional (opcional)</label>
                  <textarea
                    value={docReqDesc}
                    onChange={e => setDocReqDesc(e.target.value)}
                    placeholder="Ej. Análisis de sangre completo del 15 de abril"
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                {docReqPhone.trim() ? (
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={docReqLoading || docReqWaLoading}
                      className="flex-1 py-2.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {docReqLoading ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
                      Copiar enlace
                    </button>
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      disabled={docReqLoading || docReqWaLoading}
                      className="flex-1 py-2.5 text-sm font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {docReqWaLoading ? <Loader2 size={15} className="animate-spin" /> : <span>📱</span>}
                      Enviar por WhatsApp
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={docReqLoading}
                    className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {docReqLoading ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
                    Generar enlace
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
