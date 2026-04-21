import { useState, useEffect } from 'react'
import {
  X, Users, FileText, Trash2, Loader2, Activity, Pill,
  Microscope, ShieldCheck, ChevronDown, ChevronRight, UserX,
} from 'lucide-react'
import { getAllSharesByOwner, revokeDocumentShare } from '@/shared/lib/queries/documents'
import { showToast } from '@/shared/components/ui/Toast'

interface AccessPanelProps {
  isOpen: boolean
  onClose: () => void
  ownerId: string
}

type ShareEntry = {
  id: string
  document_id: string
  document_title: string
  document_category: string
  shared_with: string
  shared_with_name: string | null
  shared_with_email: string | null
  shared_with_avatar: string | null
  created_at: string
}

type DoctorAccess = {
  doctorId: string
  name: string
  email: string | null
  avatar: string | null
  documents: ShareEntry[]
}

const CATEGORY_LABELS: Record<string, string> = {
  radiology: 'Radiología',
  prescription: 'Recetas',
  history: 'Historial',
  lab: 'Laboratorio',
  insurance: 'Seguros',
  other: 'Otros',
}

function CategoryIcon({ category }: { category: string }) {
  const cls = 'text-primary'
  switch (category) {
    case 'radiology': return <Activity size={13} className={cls} />
    case 'prescription': return <Pill size={13} className={cls} />
    case 'history': return <FileText size={13} className={cls} />
    case 'lab': return <Microscope size={13} className={cls} />
    case 'insurance': return <ShieldCheck size={13} className={cls} />
    default: return <FileText size={13} className={cls} />
  }
}

export function AccessPanel({ isOpen, onClose, ownerId }: AccessPanelProps) {
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) loadShares()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ownerId])

  async function loadShares() {
    setLoading(true)
    const data = await getAllSharesByOwner(ownerId)
    setShares(data)
    // Auto-expand all doctors on first load
    setExpanded(new Set(data.map(s => s.shared_with)))
    setLoading(false)
  }

  async function handleRevoke(share: ShareEntry) {
    setRevoking(share.id)
    const result = await revokeDocumentShare(share.document_id, ownerId, share.shared_with)
    if (result.success) {
      setShares(prev => prev.filter(s => s.id !== share.id))
      showToast('Acceso revocado', 'success')
    } else {
      showToast(result.error || 'Error al revocar acceso', 'error')
    }
    setRevoking(null)
  }

  async function handleRevokeAll(doctorId: string, doctorDocs: ShareEntry[]) {
    setRevoking(doctorId)
    let failed = 0
    for (const s of doctorDocs) {
      const result = await revokeDocumentShare(s.document_id, ownerId, doctorId)
      if (!result.success) failed++
    }
    if (failed === 0) {
      setShares(prev => prev.filter(s => s.shared_with !== doctorId))
      showToast('Acceso completamente revocado', 'success')
    } else {
      showToast(`${failed} documento(s) no pudieron revocarse`, 'error')
      await loadShares()
    }
    setRevoking(null)
  }

  function toggleDoctor(doctorId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(doctorId) ? next.delete(doctorId) : next.add(doctorId)
      return next
    })
  }

  // Group shares by doctor
  const byDoctor: DoctorAccess[] = []
  const doctorMap = new Map<string, DoctorAccess>()
  for (const s of shares) {
    if (!doctorMap.has(s.shared_with)) {
      const entry: DoctorAccess = {
        doctorId: s.shared_with,
        name: s.shared_with_name || s.shared_with_email || 'Médico',
        email: s.shared_with_email,
        avatar: s.shared_with_avatar,
        documents: [],
      }
      doctorMap.set(s.shared_with, entry)
      byDoctor.push(entry)
    }
    doctorMap.get(s.shared_with)!.documents.push(s)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={17} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Acceso de médicos</h2>
              <p className="text-xs text-gray-400">
                {byDoctor.length} médico{byDoctor.length !== 1 ? 's' : ''} con acceso
              </p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : byDoctor.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <UserX size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600">Ningún médico tiene acceso</p>
              <p className="text-xs text-gray-400 mt-1">
                Usa el botón de compartir en tus documentos para dar acceso selectivo
              </p>
            </div>
          ) : (
            byDoctor.map(doctor => {
              const isExpanded = expanded.has(doctor.doctorId)
              const isRevokingAll = revoking === doctor.doctorId

              return (
                <div
                  key={doctor.doctorId}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Doctor header row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleDoctor(doctor.doctorId)}
                  >
                    {doctor.avatar ? (
                      <img
                        src={doctor.avatar}
                        alt={doctor.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                        {doctor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{doctor.name}</p>
                      <p className="text-xs text-gray-400">
                        {doctor.documents.length} documento{doctor.documents.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); handleRevokeAll(doctor.doctorId, doctor.documents) }}
                        disabled={!!revoking}
                        className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {isRevokingAll
                          ? <Loader2 size={11} className="animate-spin" />
                          : 'Revocar todo'
                        }
                      </button>
                      {isExpanded
                        ? <ChevronDown size={15} className="text-gray-400 shrink-0" />
                        : <ChevronRight size={15} className="text-gray-400 shrink-0" />
                      }
                    </div>
                  </div>

                  {/* Documents list */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {doctor.documents.map(share => (
                        <div key={share.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                            <CategoryIcon category={share.document_category} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate font-medium">
                              {share.document_title}
                            </p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                              {CATEGORY_LABELS[share.document_category] || 'Otro'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevoke(share)}
                            disabled={!!revoking}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            aria-label="Revocar acceso a este documento"
                          >
                            {revoking === share.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />
                            }
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Solo tú puedes ver y controlar el acceso a tus documentos
          </p>
        </div>
      </div>
    </>
  )
}
