import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Search, ShieldCheck, ShieldAlert,
  Clock, Send, Loader2, ShieldX,
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

  useEffect(() => {
    if (!user) return
    loadAll()
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary uppercase">Panel Doctor</p>
            <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
            <p className="text-sm text-gray-500">
              Busca pacientes y solicita acceso a su expediente médico.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por nombre (min. 3 letras)"
                className="w-full px-3 py-2 pl-9 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-60"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Resultados</p>
              {loading && <span className="text-xs text-gray-500">Buscando…</span>}
            </div>
            <div className="divide-y divide-gray-100">
              {results.map((p) => {
                const status = p.consentStatus || getStatusForPatient(p.id)
                const isAccepted = status === 'accepted'
                const isPending = status === 'requested'
                const isRejected = status === 'rejected' || status === 'revoked'

                return (
                  <div key={p.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <User size={18} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.full_name || 'Paciente'}</p>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full mt-0.5">
                              <Clock size={10} /> Solicitud pendiente
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full mt-0.5">
                              <ShieldX size={10} /> {status === 'rejected' ? 'Rechazado' : 'Revocado'}
                            </span>
                          )}
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full mt-0.5">
                              <ShieldCheck size={10} /> Acceso concedido
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions based on status */}
                      <div className="flex gap-2 flex-shrink-0">
                        {isAccepted && (
                          <button
                            onClick={() => navigate(`/dashboard/pacientes/${p.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary rounded-lg hover:bg-primary/10 transition-colors"
                          >
                            Ver expediente
                          </button>
                        )}
                        {!status && (
                          <>
                            {showReasonFor === p.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  value={requestReason}
                                  onChange={(e) => setRequestReason(e.target.value)}
                                  placeholder="Motivo (opcional)"
                                  className="w-48 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                                <button
                                  onClick={() => handleRequestAccess(p.id)}
                                  disabled={requestingId === p.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-50"
                                >
                                  {requestingId === p.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Send size={14} />
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
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                              >
                                <ShieldAlert size={14} />
                                Solicitar acceso
                              </button>
                            )}
                          </>
                        )}
                        {isRejected && (
                          <button
                            onClick={() => handleReRequest(p.id)}
                            disabled={requestingId === p.id}
                            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                          >
                            {requestingId === p.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
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
          <div className="bg-white rounded-lg shadow-sm border border-blue-100">
            <div className="p-4 border-b border-blue-50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-semibold text-gray-800">Solicitudes pendientes</p>
              <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold overflow-hidden">
                      {r.patient?.avatar_url ? (
                        <img src={r.patient.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        (r.patient?.full_name?.charAt(0) || 'P').toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{r.patient?.full_name || 'Paciente'}</p>
                      <p className="text-[11px] text-gray-400">
                        Enviada {new Date(r.requested_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Esperando respuesta
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patients with Access */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-gray-800">Pacientes con acceso</p>
            </div>
            {loading && patients.length === 0 && <span className="text-xs text-gray-500">Cargando…</span>}
          </div>
          {patients.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aún no tienes pacientes con acceso concedido.</p>
              <p className="text-xs text-gray-400 mt-1">Busca pacientes y solicita acceso a su expediente.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/dashboard/pacientes/${p.id}`)}
                  className="flex items-start justify-between gap-3 p-4 hover:bg-gray-50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform overflow-hidden">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">{p.full_name || 'Paciente'}</p>
                      <p className="text-[10px] text-primary font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Ver expediente →</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <ShieldCheck size={12} /> Acceso activo
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
