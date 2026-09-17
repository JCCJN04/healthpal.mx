import { MoreVertical, Folder, Trash2, Edit, Share2, ChevronRight, FileText } from 'lucide-react'
import { useState } from 'react'
import type { Variants } from 'framer-motion'
import { SpotlightCard } from '@/shared/components/ui/SpotlightCard'

interface FolderCardProps {
  folder: {
    id: string
    name: string
    color: string
    created_at: string
    avatarUrl?: string | null
    subtitle?: string | null
    docCount?: number
    hasNew?: boolean
  }
  onClick: (folderId: string, folderName: string) => void
  onDelete: (folderId: string) => void
  onRename: (folderId: string, currentName: string) => void
  onDropDocument?: (docId: string, folderId: string) => void
  onShare?: (folderId: string, folderName: string) => void
}

const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

export const FolderCard = ({
  folder,
  onClick,
  onDelete,
  onRename,
  onDropDocument,
  onShare,
}: FolderCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [imgError, setImgError] = useState(false)
  const isShared = folder.id.startsWith('shared-')
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const payload =
      e.dataTransfer.getData('application/healthpal-doc') || e.dataTransfer.getData('text/plain')
    try {
      const parsed = JSON.parse(payload)
      if (parsed?.docId) onDropDocument?.(parsed.docId, folder.id)
    } catch {
      if (payload) onDropDocument?.(payload, folder.id)
    }
  }

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
    setMenuOpen(false)
  }

  // ── Shared folder: modern clinical dossier card ──────────────────────────
  if (isShared) {
    const initials = folder.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('')

    return (
      <SpotlightCard
        variants={fadeUpVariant}
        onClick={() => onClick(folder.id, folder.name)}
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault()
          e.stopPropagation()
          if (onDropDocument) setIsDragOver(true)
        }}
        onDragLeave={(e: React.DragEvent) => {
          e.stopPropagation()
          setIsDragOver(false)
        }}
        onDrop={handleDrop}
        spotlightColor="rgba(51, 199, 190, 0.18)"
        className={`relative cursor-pointer group select-none transition-all duration-200 p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
          isDragOver
            ? 'border-[#33C7BE] ring-2 ring-[#33C7BE]/30 bg-teal-50/20 shadow-md'
            : 'border-gray-200/70 bg-white hover:border-teal-200 hover:shadow-md'
        }`}
      >
        {/* Header: Tag & Doc Count */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-teal-50/80 border border-teal-100/80 text-teal-700 px-2.5 py-0.5 rounded-full">
            <Folder size={11} className="text-[#33C7BE]" fill="currentColor" fillOpacity={0.25} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Expediente</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full font-medium">
            <FileText size={11} className="text-gray-400" />
            <span>
              {folder.docCount ?? 0} doc{(folder.docCount ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Patient Information */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {folder.avatarUrl && !imgError ? (
              <img
                src={folder.avatarUrl}
                alt={folder.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-teal-100 shadow-xs"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#33C7BE] to-teal-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-teal-50 shadow-xs">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#33C7BE] transition-colors truncate">
              {folder.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {folder.subtitle || 'Historial y archivos médicos'}
            </p>
          </div>

          <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 group-hover:bg-[#33C7BE] group-hover:text-white group-hover:border-[#33C7BE] flex items-center justify-center transition-all shrink-0 shadow-2xs">
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </SpotlightCard>
    )
  }

  // ── Own folder: horizontal card ──────────────────────────────────────────
  return (
    <SpotlightCard
      onClick={() => onClick(folder.id, folder.name)}
      onDragOver={(e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!onDropDocument) return
        setIsDragOver(true)
      }}
      onDragLeave={(e: React.DragEvent) => {
        e.stopPropagation()
        setIsDragOver(false)
      }}
      onDrop={handleDrop}
      variants={fadeUpVariant}
      spotlightColor="rgba(51, 199, 190, 0.18)"
      className={`bg-white rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 border ${isDragOver ? 'border-[#33C7BE] ring-2 ring-[#33C7BE]/30 bg-teal-50/20' : 'border-gray-100/90 hover:border-teal-200'} group cursor-pointer p-4`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: folder.color || '#33C7BE' }}
          >
            <Folder size={24} fill="currentColor" fillOpacity={0.3} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 truncate pr-2 max-w-[160px] sm:max-w-[200px]">
              {folder.name}
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">
              Carpeta
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors opacity-50 group-hover:opacity-100 cursor-pointer"
          >
            <MoreVertical size={18} className="text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-30 ring-1 ring-black ring-opacity-5">
                {onShare && (
                  <button
                    onClick={(e) => handleMenuClick(e, () => onShare(folder.id, folder.name))}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Share2 size={14} />
                    Compartir
                  </button>
                )}
                <button
                  onClick={(e) => handleMenuClick(e, () => onRename(folder.id, folder.name))}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit size={14} />
                  Renombrar
                </button>
                <button
                  onClick={(e) => handleMenuClick(e, () => onDelete(folder.id))}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </SpotlightCard>
  )
}
