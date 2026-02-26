import { useState, useEffect } from 'react'
import {
  ShieldCheck, ShieldAlert, ShieldX, Clock, UserCheck, UserX,
  Eye, Phone, FileText, Calendar, StickyNote, Loader2,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '@/app/providers/AuthContext'
import {
  getPatientPendingRequests,
  getPatientDoctorAccess,
  acceptConsentRequest,
  rejectConsentRequest,
  revokeConsentAccess,
  updateConsentScopes,
  ConsentWithProfile,
  ConsentScopes,
} from '@/shared/lib/queries/consent'
import { linkDoctorToPatient, unlinkDoctorFromPatient } from '@/features/patient/services/doctors'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const SCOPE_META: { key: keyof ConsentScopes; label: string; description: string; icon: React.ElementType }[] = [
  { key: 'share_basic_profile', label: 'Perfil básico', description: 'Nombre, foto, edad y sexo', icon: Eye },
  { key: 'share_contact', label: 'Contacto', description: 'Teléfono y correo', icon: Phone },
  { key: 'share_documents', label: 'Documentos', description: 'Estudios, archivos y recetas', icon: FileText },
  { key: 'share_appointments', label: 'Citas', description: 'Historial de consultas', icon: Calendar },
  { key: 'share_medical_notes', label: 'Notas clínicas', description: 'Notas médicas del doctor', icon: StickyNote },
]

export default function PatientConsentManager() {
  const { user } = useAuth()
  const [pending, setPending] = useState<ConsentWithProfile[]>([])
  const [active, setActive] = useState<ConsentWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Scope editor state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editScopes, setEditScopes] = useState<ConsentScopes>({
    share_basic_profile: true,
    share_contact: false,
    share_documents: false,
    share_appointments: false,
    share_medical_notes: false,
  })

  // Accept modal
  const [acceptingRow, setAcceptingRow] = useState<ConsentWithProfile | null>(null)
  const [acceptScopes, setAcceptScopes] = useState<ConsentScopes>({
    share_basic_profile: true,
    share_contact: false,
    share_documents: false,
    share_appointments: false,
    share_medical_notes: false,
  })

  useEffect(() => {
    if (user?.id) loadAll()
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

  // ── Accept flow ─────────────────────────────────────
  const openAcceptModal = (row: ConsentWithProfile) => {
    setAcceptingRow(row)
    setAcceptScopes({
      share_basic_profile: true,
      share_contact: false,
      share_documents: false,
      share_appointments: false,
      share_medical_notes: false,
    })
  }

  const confirmAccept = async () => {
    if (!acceptingRow || !user?.id) return
    setActionLoading(acceptingRow.id)
    const { ok, error } = await acceptConsentRequest(acceptingRow.id, acceptScopes)
    if (ok) {
      // Also add the doctor to the care_links so they appear in "Tus Doctores"
      await linkDoctorToPatient(user.id, acceptingRow.doctor_id)
      showToast('Acceso concedido', 'success')
      await loadAll()
    } else {
      showToast(error || 'Error', 'error')
    }
    setActionLoading(null)
    setAcceptingRow(null)
  }

  // ── Reject ──────────────────────────────────────────
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

  // ── Revoke ──────────────────────────────────────────
  const handleRevoke = async (id: string, doctorId: string) => {
    if (!confirm('¿Seguro que deseas revocar el acceso de este doctor? Se perderá inmediatamente.')) return
    if (!user?.id) return
    setActionLoading(id)
    const { ok, error } = await revokeConsentAccess(id)
    if (ok) {
      // Also remove the doctor from care_links so they disappear from "Tus Doctores"
      await unlinkDoctorFromPatient(user.id, doctorId)
      showToast('Acceso revocado', 'success')
      await loadAll()
    } else {
      showToast(error || 'Error', 'error')
    }
    setActionLoading(null)
  }

  // ── Update scopes ───────────────────────────────────
  const startEditScopes = (row: ConsentWithProfile) => {
    setEditingId(row.id)
    setEditScopes({
      share_basic_profile: row.share_basic_profile,
      share_contact: row.share_contact,
      share_documents: row.share_documents,
      share_appointments: row.share_appointments,
      share_medical_notes: row.share_medical_notes,
    })
  }

  const saveScopes = async () => {
    if (!editingId) return
    setActionLoading(editingId)
    const { ok, error } = await updateConsentScopes(editingId, editScopes)
    if (ok) {
      showToast('Permisos actualizados', 'success')
      await loadAll()
    } else {
      showToast(error || 'Error', 'error')
    }
    setActionLoading(null)
    setEditingId(null)
  }

  // ── Status badge ────────────────────────────────────
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

  // ── Scope toggle list ───────────────────────────────
  const ScopeToggles = ({
    scopes,
    onChange,
    disabled = false,
  }: {
    scopes: ConsentScopes
    onChange: (k: keyof ConsentScopes, v: boolean) => void
    disabled?: boolean
  }) => (
    <div className="grid gap-2 mt-3">
      {SCOPE_META.map(({ key, label, description, icon: Icon }) => (
        <label
          key={key}
          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
            scopes[key] ? 'border-primary/30 bg-primary/5' : 'border-gray-100 bg-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/20'}`}
        >
          <input
            type="checkbox"
            checked={scopes[key]}
            onChange={(e) => onChange(key, e.target.checked)}
            disabled={disabled || (key === 'share_basic_profile')} // basic always required
            className="accent-primary w-4 h-4"
          />
          <Icon className={`w-4 h-4 ${scopes[key] ? 'text-primary' : 'text-gray-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            <p className="text-[11px] text-gray-400">{description}</p>
          </div>
        </label>
      ))}
    </div>
  )

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
                  {/* Doctor avatar */}
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

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openAcceptModal(row)}
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

      {/* ── Accept Modal ──────────────────────────────── */}
      {acceptingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAcceptingRow(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-bold text-gray-900">Conceder acceso</h3>
            </div>

            <p className="text-sm text-gray-600">
              Elige qué información deseas compartir con{' '}
              <strong>{acceptingRow.doctor?.full_name || 'este doctor'}</strong>.
              Puedes cambiar estos permisos en cualquier momento.
            </p>

            <ScopeToggles
              scopes={acceptScopes}
              onChange={(k, v) => setAcceptScopes((prev) => ({ ...prev, [k]: v }))}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAcceptingRow(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAccept}
                disabled={actionLoading === acceptingRow.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
              >
                {actionLoading === acceptingRow.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
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
            <p className="text-sm text-gray-500">Ningún doctor tiene acceso a tu información.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((row) => {
              const isEditing = editingId === row.id
              const isAccepted = row.status === 'accepted'

              return (
                <div key={row.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5">
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

                      {isAccepted && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => isEditing ? setEditingId(null) : startEditScopes(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {isEditing ? 'Cerrar' : 'Permisos'}
                          </button>
                          <button
                            onClick={() => handleRevoke(row.id, row.doctor_id)}
                            disabled={actionLoading === row.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === row.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            Revocar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Current scopes summary (when not editing) */}
                    {isAccepted && !isEditing && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {SCOPE_META.filter((s) => row[s.key]).map((s) => (
                          <span
                            key={s.key}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary text-[11px] font-semibold rounded-full"
                          >
                            <s.icon className="w-3 h-3" />
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expanded scope editor */}
                  {isEditing && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Editar permisos compartidos</p>
                      <ScopeToggles
                        scopes={editScopes}
                        onChange={(k, v) => setEditScopes((prev) => ({ ...prev, [k]: v }))}
                      />
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={saveScopes}
                          disabled={actionLoading === row.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === row.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Guardar permisos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
