import { useState, useEffect } from 'react'
import {
  ShieldCheck, ShieldAlert, ShieldX, Clock, UserCheck, UserX,
  Loader2, XCircle, ChevronDown, ChevronUp, Save,
  FileText, Phone, StickyNote, CalendarDays, ShieldPlus,
} from 'lucide-react'
import { useAuth } from '@/app/providers/AuthContext'
import { useCrypto } from '@/context/CryptoContext'
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
import { getUserDocuments, shareEncryptedDocumentKey } from '@/shared/lib/queries/documents'
import { linkDoctorToPatient, unlinkDoctorFromPatient } from '@/features/patient/services/doctors'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const SCOPE_META: Array<{
  key: keyof ConsentScopes
  label: string
  description: string
  Icon: React.ElementType
  color: string
}> = [
  {
    key: 'share_basic_profile',
    label: 'Perfil básico',
    description: 'Nombre, edad, sexo, tipo de sangre',
    Icon: UserCheck,
    color: 'text-gray-500',
  },
  {
    key: 'share_contact',
    label: 'Contacto',
    description: 'Correo electrónico y teléfono',
    Icon: Phone,
    color: 'text-blue-500',
  },
  {
    key: 'share_documents',
    label: 'Expediente / Documentos',
    description: 'Estudios, recetas y archivos médicos',
    Icon: FileText,
    color: 'text-purple-500',
  },
  {
    key: 'share_appointments',
    label: 'Citas',
    description: 'Historial de consultas',
    Icon: CalendarDays,
    color: 'text-teal-500',
  },
  {
    key: 'share_medical_notes',
    label: 'Notas clínicas',
    description: 'Notas y observaciones médicas',
    Icon: StickyNote,
    color: 'text-orange-500',
  },
  {
    key: 'share_insurance',
    label: 'Seguro médico',
    description: 'Aseguradora, póliza y datos de cobertura',
    Icon: ShieldPlus,
    color: 'text-green-500',
  },
  {
    key: 'edit_clinical_history',
    label: 'Editar historial clínico',
    description: 'Permite al médico modificar tu historial clínico',
    Icon: FileText,
    color: 'text-red-500',
  },
]

const REQUIRED_SCOPES: Array<keyof ConsentScopes> = ['share_basic_profile']

const DEFAULT_ACCEPT_SCOPES: ConsentScopes = {
  share_basic_profile: true,
  share_contact: false,
  share_documents: false,
  share_appointments: false,
  share_medical_notes: false,
  share_insurance: false,
  edit_clinical_history: false,
}

export default function PatientConsentManager() {
  const { user } = useAuth()
  const { privateKey } = useCrypto()
  const [pending, setPending] = useState<ConsentWithProfile[]>([])
  const [active, setActive] = useState<ConsentWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Accept modal state
  const [confirmingRow, setConfirmingRow] = useState<ConsentWithProfile | null>(null)
  const [acceptScopes, setAcceptScopes] = useState<ConsentScopes>(DEFAULT_ACCEPT_SCOPES)

  // Per-consent scope editing
  const [editingScopes, setEditingScopes] = useState<string | null>(null) // consent id
  const [editScopeValues, setEditScopeValues] = useState<ConsentScopes>(DEFAULT_ACCEPT_SCOPES)
  const [savingScopes, setSavingScopes] = useState(false)

  useEffect(() => {
    if (user?.id) loadAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Retroactively share document keys with all doctors that already have accepted consent
  useEffect(() => {
    if (!user?.id || !privateKey) return
    const syncExistingKeys = async () => {
      try {
        const all = await getPatientDoctorAccess(user.id)
        const accepted = all.filter((c) => c.status === 'accepted')
        if (accepted.length === 0) return
        const docs = await getUserDocuments(user.id, null, true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const encrypted = docs.filter((d) => (d as any).is_encrypted)
        if (encrypted.length === 0) return
        for (const consent of accepted) {
          await Promise.allSettled(
            encrypted.map((d) => shareEncryptedDocumentKey(d.id, privateKey, consent.doctor_id))
          )
        }
      } catch (err) {
        logger.error('PatientConsentManager.syncExistingKeys', err)
      }
    }
    syncExistingKeys()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, privateKey])

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

  const openAcceptModal = (row: ConsentWithProfile) => {
    setConfirmingRow(row)
    setAcceptScopes(DEFAULT_ACCEPT_SCOPES)
  }

  const confirmAccept = async () => {
    if (!confirmingRow || !user?.id) return
    setActionLoading(confirmingRow.id)
    const { ok, error } = await acceptConsentRequest(confirmingRow.id, acceptScopes)
    if (ok) {
      await linkDoctorToPatient(user.id, confirmingRow.doctor_id)
      if (privateKey && acceptScopes.share_documents) {
        try {
          const docs = await getUserDocuments(user.id, null, true)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const encrypted = docs.filter((d) => (d as any).is_encrypted)
          await Promise.allSettled(
            encrypted.map((d) => shareEncryptedDocumentKey(d.id, privateKey, confirmingRow.doctor_id))
          )
        } catch (err) {
          logger.error('PatientConsentManager.shareKeys', err)
        }
      }
      showToast('Acceso concedido', 'success')
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

  const openEditScopes = (row: ConsentWithProfile) => {
    setEditingScopes(row.id)
    setEditScopeValues({
      share_basic_profile: row.share_basic_profile ?? true,
      share_contact: row.share_contact ?? false,
      share_documents: row.share_documents ?? false,
      share_appointments: row.share_appointments ?? false,
      share_medical_notes: row.share_medical_notes ?? false,
      share_insurance: row.share_insurance ?? false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      edit_clinical_history: (row as any).edit_clinical_history ?? false,
    })
  }

  const handleSaveScopes = async (consentId: string, doctorId: string) => {
    setSavingScopes(true)
    try {
      const { ok, error } = await updateConsentScopes(consentId, editScopeValues)
      if (ok) {
        // If documents scope changed, re-sync keys
        if (editScopeValues.share_documents && user?.id && privateKey) {
          try {
            const docs = await getUserDocuments(user.id, null, true)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const encrypted = docs.filter((d) => (d as any).is_encrypted)
            await Promise.allSettled(
              encrypted.map((d) => shareEncryptedDocumentKey(d.id, privateKey, doctorId))
            )
          } catch (err) {
            logger.error('PatientConsentManager.resyncKeys', err)
          }
        }
        showToast('Permisos actualizados', 'success')
        setEditingScopes(null)
        await loadAll()
      } else {
        showToast(error || 'Error al actualizar', 'error')
      }
    } finally {
      setSavingScopes(false)
    }
  }

  const ScopesPanel = ({
    scopes,
    onChange,
    disabled = false,
  }: {
    scopes: ConsentScopes
    onChange: (key: keyof ConsentScopes, value: boolean) => void
    disabled?: boolean
  }) => (
    <div className="space-y-2">
      {SCOPE_META.map(({ key, label, description, Icon, color }) => {
        const isRequired = REQUIRED_SCOPES.includes(key)
        const checked = scopes[key]
        return (
          <label
            key={key}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
              checked ? 'bg-teal-50/60 border-teal-200' : 'bg-gray-50 border-gray-200'
            } ${isRequired || disabled ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={isRequired || disabled}
              onChange={(e) => onChange(key, e.target.checked)}
              className="mt-0.5 rounded accent-[#33C7BE]"
            />
            <div className="flex items-center gap-2 min-w-0">
              <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {label}
                  {isRequired && <span className="ml-1.5 text-[10px] text-gray-400">(requerido)</span>}
                </p>
                <p className="text-[11px] text-gray-500">{description}</p>
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )

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

      {/* ── Accept modal with granular scopes ─────────── */}
      {confirmingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmingRow(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Conceder acceso</h3>
                <p className="text-xs text-gray-500">{confirmingRow.doctor?.full_name || 'Este doctor'}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Elige qué información puede ver este doctor. Puedes modificar o revocar el acceso en cualquier momento.
            </p>

            <ScopesPanel
              scopes={acceptScopes}
              onChange={(key, value) => setAcceptScopes(s => ({ ...s, [key]: value }))}
            />

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
            {active.map((row) => {
              const isEditing = editingScopes === row.id
              const activeScopes = {
                share_basic_profile: row.share_basic_profile ?? true,
                share_contact: row.share_contact ?? false,
                share_documents: row.share_documents ?? false,
                share_appointments: row.share_appointments ?? false,
                share_medical_notes: row.share_medical_notes ?? false,
                share_insurance: row.share_insurance ?? false,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                edit_clinical_history: (row as any).edit_clinical_history ?? false,
              }
              const activeCount = Object.values(activeScopes).filter(Boolean).length

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">{row.doctor?.full_name || 'Doctor'}</p>
                          <StatusBadge status={row.status} />
                        </div>
                        {row.responded_at && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Desde {new Date(row.responded_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {row.status === 'accepted' && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {activeCount} {activeCount === 1 ? 'permiso' : 'permisos'} activos
                          </p>
                        )}
                      </div>
                    </div>

                    {row.status === 'accepted' && (
                      <div className="flex items-center gap-2 justify-end mt-3">
                        <button
                          onClick={() => isEditing ? setEditingScopes(null) : openEditScopes(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          Permisos
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

                  {/* Scope editor for accepted consents */}
                  {isEditing && row.status === 'accepted' && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Editar permisos</p>
                      <ScopesPanel
                        scopes={editScopeValues}
                        onChange={(key, value) => setEditScopeValues(s => ({ ...s, [key]: value }))}
                        disabled={savingScopes}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingScopes(null)}
                          className="px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100"
                          disabled={savingScopes}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveScopes(row.id, row.doctor_id)}
                          disabled={savingScopes}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                        >
                          {savingScopes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
