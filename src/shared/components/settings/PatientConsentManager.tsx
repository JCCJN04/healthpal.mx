import { useState, useEffect } from 'react'
import {
  ShieldCheck, ShieldAlert, ShieldX, Clock, UserCheck, UserX,
  Loader2, XCircle,
} from 'lucide-react'
import { useAuth } from '@/app/providers/AuthContext'
import {
  getPatientPendingRequests,
  getPatientDoctorAccess,
  acceptConsentRequest,
  rejectConsentRequest,
  revokeConsentAccess,
  ConsentWithProfile,
} from '@/shared/lib/queries/consent'
import { linkDoctorToPatient, unlinkDoctorFromPatient } from '@/features/patient/services/doctors'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const FULL_ACCESS = {
  share_basic_profile: true,
  share_contact: true,
  share_documents: true,
  share_appointments: true,
  share_medical_notes: true,
}

export default function PatientConsentManager() {
  const { user } = useAuth()
  const [pending, setPending] = useState<ConsentWithProfile[]>([])
  const [active, setActive] = useState<ConsentWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmingRow, setConfirmingRow] = useState<ConsentWithProfile | null>(null)

  useEffect(() => {
    if (user?.id) loadAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadAll() {
    setLoading(true)
    try {
      const [p, all] = await Promise.all([
        getPatientPendingRequests(user!.id),
        getPatientDoctorAccess(user!.id),
      ])
      setPending(p)
      setActive(all.filter((c) => c.status !== 'requested'))
    } catch (err) {
      logger.error('PatientConsentManager.load', err)
    } finally {
      setLoading(false)
    }
  }

  const confirmAccept = async () => {
    if (!confirmingRow || !user?.id) return
    setActionLoading(confirmingRow.id)
    const { ok, error } = await acceptConsentRequest(confirmingRow.id, FULL_ACCESS)
    if (ok) {
      await linkDoctorToPatient(user.id, confirmingRow.doctor_id)
      showToast('Acceso concedido al expediente', 'success')
      await loadAll()
    } else {
      showToast(error || 'Error', 'error')
    }
    setActionLoading(null)
    setConfirmingRow(null)
  }

  const handleReject = async (id: string) => {
    setActionLoading(id)
    const { ok, error } = await rejectConsentRequest(id)
    if (ok) {
      showToast('Solicitud rechazada', 'success')
      await loadAll()
    } else {
      showToast(error || 'Error', 'error')
    }
    setActionLoading(null)
  }

  const handleRevoke = async (id: string, doctorId: string) => {
    if (!confirm('¿Revocar el acceso de este doctor a tu expediente?')) return
    if (!user?.id) return
    setActionLoading(id)
    const { ok, error } = await revokeConsentAccess(id, doctorId, user.id)
    if (ok) {
      await unlinkDoctorFromPatient(user.id, doctorId)
      showToast('Acceso revocado', 'success')
      await loadAll()
    } else {
      showToast(error || 'Error', 'error')
    }
    setActionLoading(null)
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { bg: string; text: string; label: string; Icon: React.ElementType }> = {
      accepted: { bg: 'bg-green-50', text: 'text-green-700', label: 'Activo', Icon: ShieldCheck },
      rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rechazado', Icon: ShieldX },
      revoked: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Revocado', Icon: ShieldAlert },
      requested: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Pendiente', Icon: Clock },
    }
    const s = map[status] || map.requested
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
        <s.Icon className="w-3 h-3" />
        {s.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Pending Requests ──────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-gray-900">Solicitudes pendientes</h2>
          {pending.length > 0 && (
            <span className="bg-blue-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No tienes solicitudes pendientes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((row) => (
              <div key={row.id} className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 overflow-hidden">
                    {row.doctor?.avatar_url ? (
                      <img src={row.doctor.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      (row.doctor?.full_name?.charAt(0) || 'D').toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{row.doctor?.full_name || 'Doctor'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Solicitado el {new Date(row.requested_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {row.request_reason && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2 italic">
                        "{row.request_reason}"
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setConfirmingRow(row)}
                      disabled={actionLoading === row.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === row.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleReject(row.id)}
                      disabled={actionLoading === row.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Accept confirmation modal ─────────────────── */}
      {confirmingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmingRow(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-bold text-gray-900">Conceder acceso</h3>
            </div>
            <p className="text-sm text-gray-600">
              <strong>{confirmingRow.doctor?.full_name || 'Este doctor'}</strong> podrá ver tu expediente médico electrónico: documentos, historial de consultas y notas clínicas.
              <br /><br />
              Puedes revocar el acceso en cualquier momento.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmingRow(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAccept}
                disabled={actionLoading === confirmingRow.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
              >
                {actionLoading === confirmingRow.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Confirmar acceso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active / Past Access ─────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-900">Doctores con acceso</h2>
        </div>

        {active.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Ningún doctor tiene acceso a tu expediente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((row) => (
              <div key={row.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0 overflow-hidden">
                    {row.doctor?.avatar_url ? (
                      <img src={row.doctor.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      (row.doctor?.full_name?.charAt(0) || 'D').toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{row.doctor?.full_name || 'Doctor'}</p>
                      <StatusBadge status={row.status} />
                    </div>
                    {row.responded_at && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Desde {new Date(row.responded_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {row.status === 'accepted' && (
                    <button
                      onClick={() => handleRevoke(row.id, row.doctor_id)}
                      disabled={actionLoading === row.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      {actionLoading === row.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      Revocar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
