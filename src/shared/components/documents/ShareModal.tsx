import { useState, useEffect } from 'react'
import { X, Mail, Send, Loader2, Trash2, Users, Folder } from 'lucide-react'
import { listDocumentShares, revokeShareById } from '@/shared/lib/queries/documents'
import { revokeRequestAccess } from '@/shared/lib/queries/documentRequests'

export interface KnownDoctor {
  id: string
  full_name: string | null
  email: string | null
  avatar_url?: string | null
}

interface CurrentShare {
  id: string
  shared_with: string
  created_at: string
  source: 'share' | 'request'
  profiles: { id: string; full_name: string | null; email: string | null; role: string | null } | null
}

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  /** Document or folder name shown in the header */
  title: string
  /** Owner (sharer) user ID — needed for revoke */
  ownerId: string
  /** Single document ID — used to load current shares */
  documentId?: string
  /** For folder sharing: show a count note */
  isFolder?: boolean
  folderDocCount?: number
  /** Called when user submits an email to share with */
  onShare: (email: string) => Promise<{ success: boolean; error?: string }>
  /** Optional: doctors the patient already knows (for quick-select) */
  knownDoctors?: KnownDoctor[]
  /** Called after a share is revoked so parent can refresh */
  onRevoked?: () => void
}

export function ShareModal({
  isOpen,
  onClose,
  title,
  ownerId,
  documentId,
  isFolder,
  folderDocCount,
  onShare,
  knownDoctors = [],
  onRevoked,
}: ShareModalProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentShares, setCurrentShares] = useState<CurrentShare[]>([])
  const [loadingShares, setLoadingShares] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  // Fetch current shares when modal opens (single-doc only)
  useEffect(() => {
    if (!isOpen || !documentId || isFolder) return
    setLoadingShares(true)
    listDocumentShares(documentId).then(data => {
      setCurrentShares((data as CurrentShare[]) || [])
      setLoadingShares(false)
    })
  }, [isOpen, documentId, isFolder])

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setError(null)
      setCurrentShares([])
    }
  }, [isOpen])

  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Ingresa un correo para compartir'); return }
    setSubmitting(true)
    setError(null)
    const result = await onShare(email.trim())
    setSubmitting(false)
    if (result.success) {
      setEmail('')
      // Refresh current shares if single doc
      if (documentId && !isFolder) {
        const updated = await listDocumentShares(documentId)
        setCurrentShares((updated as CurrentShare[]) || [])
      }
    } else {
      setError(result.error || 'No se pudo compartir')
    }
  }

  async function handleRevoke(share: CurrentShare) {
    if (!documentId) return
    setRevoking(share.id)
    const result = share.source === 'request'
      ? await revokeRequestAccess(share.id)
      : await revokeShareById(share.id)
    if (result.success) {
      setCurrentShares(prev => prev.filter(s => s.id !== share.id))
      onRevoked?.()
    } else {
      setError(result.error || 'No se pudo revocar el acceso')
    }
    setRevoking(null)
  }

  function selectDoctor(doctor: KnownDoctor) {
    if (doctor.email) setEmail(doctor.email)
  }

  // Doctors not already shared with (avoid duplicates in quick-select)
  const sharedWithIds = new Set(currentShares.map(s => s.shared_with))
  const availableDoctors = knownDoctors.filter(d => !sharedWithIds.has(d.id))

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {isFolder ? <Folder size={16} className="text-primary" /> : <Send size={16} className="text-primary" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900">
                  {isFolder ? 'Compartir carpeta' : 'Compartir documento'}
                </h2>
                <p className="text-xs text-gray-400 truncate max-w-[200px]">{title}</p>
                {isFolder && folderDocCount !== undefined && (
                  <p className="text-[10px] text-primary font-medium">{folderDocCount} documento{folderDocCount !== 1 ? 's' : ''} incluido{folderDocCount !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Current shares (single doc only) */}
            {!isFolder && documentId && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Compartido con
                </p>
                {loadingShares ? (
                  <div className="flex items-center gap-2 py-2 text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Cargando…</span>
                  </div>
                ) : currentShares.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">Nadie tiene acceso a este documento todavía</p>
                ) : (
                  <ul className="space-y-1.5">
                    {currentShares.map(share => {
                      const name = share.profiles?.full_name || share.profiles?.email || 'Usuario'
                      const initials = name.charAt(0).toUpperCase()
                      return (
                        <li key={share.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                            {share.profiles?.email && share.profiles.email !== name && (
                              <p className="text-xs text-gray-400 truncate">{share.profiles.email}</p>
                            )}
                            {share.source === 'request' && (
                              <p className="text-[10px] text-amber-500 font-semibold">vía solicitud</p>
                            )}
                          </div>
                          {share.shared_with !== ownerId && (
                            <button
                              onClick={() => handleRevoke(share)}
                              disabled={!!revoking}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                              aria-label="Revocar acceso"
                            >
                              {revoking === share.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} />
                              }
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Known doctors quick-select */}
            {availableDoctors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Users size={12} />
                  Mis médicos
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableDoctors.map(doctor => (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => selectDoctor(doctor)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[9px] font-bold shrink-0">
                        {(doctor.full_name || doctor.email || '?').charAt(0).toUpperCase()}
                      </div>
                      {doctor.full_name || doctor.email || 'Médico'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email input */}
            <form onSubmit={handleShare} className="space-y-3">
              <div>
                <label htmlFor="share-email" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Agregar acceso
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="share-email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null) }}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!email.trim() || submitting}
                className="w-full bg-primary text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting
                  ? <><Loader2 size={15} className="animate-spin" /> Compartiendo…</>
                  : <><Send size={15} /> Compartir</>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
