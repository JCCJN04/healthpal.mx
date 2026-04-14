import { MoreVertical, Folder, Trash2, Edit, Share2, UserCircle, ChevronRight, FileText } from 'lucide-react'
import { useState } from 'react'

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

// Subtle pastel accent per folder — cycles through a small palette based on name
const CARD_ACCENTS = [
    { bg: 'from-teal-50 to-cyan-50', ring: 'ring-teal-200', pill: 'bg-teal-100 text-teal-700' },
    { bg: 'from-violet-50 to-purple-50', ring: 'ring-violet-200', pill: 'bg-violet-100 text-violet-700' },
    { bg: 'from-rose-50 to-pink-50', ring: 'ring-rose-200', pill: 'bg-rose-100 text-rose-700' },
    { bg: 'from-amber-50 to-orange-50', ring: 'ring-amber-200', pill: 'bg-amber-100 text-amber-700' },
    { bg: 'from-sky-50 to-blue-50', ring: 'ring-sky-200', pill: 'bg-sky-100 text-sky-700' },
    { bg: 'from-emerald-50 to-green-50', ring: 'ring-emerald-200', pill: 'bg-emerald-100 text-emerald-700' },
]

function accentFor(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return CARD_ACCENTS[Math.abs(hash) % CARD_ACCENTS.length]
}

export const FolderCard = ({ folder, onClick, onDelete, onRename, onDropDocument, onShare }: FolderCardProps) => {
    const [menuOpen, setMenuOpen] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)
    const [imgError, setImgError] = useState(false)
    const isShared = folder.id.startsWith('shared-')
    const accent = accentFor(folder.name)

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        const payload = e.dataTransfer.getData('application/healthpal-doc') || e.dataTransfer.getData('text/plain')
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

    // ── Shared folder: expediente card ───────────────────────────────────────
    if (isShared) {
        const initials = folder.name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('')

        return (
            <div
                onClick={() => onClick(folder.id, folder.name)}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (onDropDocument) setIsDragOver(true) }}
                onDragLeave={(e) => { e.stopPropagation(); setIsDragOver(false) }}
                onDrop={handleDrop}
                className="relative cursor-pointer group select-none transition-all duration-200 hover:-translate-y-1.5 active:scale-[0.97]"
                style={{ paddingTop: '14px' }}
            >
                {/* Folder tab */}
                <div
                    className="absolute top-0 left-3 h-[14px] w-[45%] rounded-t-lg"
                    style={{ background: 'linear-gradient(135deg, #2ab5ac, #33C7BE)' }}
                />

                {/* Folder body */}
                <div
                    className={`rounded-2xl rounded-tl-none overflow-hidden transition-shadow duration-200
                        ${isDragOver ? 'ring-2 ring-primary shadow-xl' : 'shadow-md group-hover:shadow-xl'}
                    `}
                    style={{ background: 'linear-gradient(160deg, #f0fdfb 0%, #ffffff 60%)' ,
                        border: '1.5px solid #c8f0ed'
                    }}
                >
                    {/* Header band */}
                    <div className="px-3 py-2 flex items-center justify-between"
                        style={{ background: 'linear-gradient(90deg, #e6faf8, #f0fdfb)', borderBottom: '1px solid #c8f0ed' }}
                    >
                        <div className="flex items-center gap-1.5">
                            <FileText size={10} style={{ color: '#33C7BE' }} />
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#2ab5ac' }}>
                                Expediente
                            </span>
                        </div>
                        {folder.hasNew && (
                            <span className="text-[9px] font-black bg-emerald-500 text-white rounded-full px-1.5 py-0.5 uppercase tracking-wide animate-pulse">
                                Nuevo
                            </span>
                        )}
                    </div>

                    {/* Content — altura fija para igualar todas las tarjetas */}
                    <div className="px-4 pt-4 pb-3 flex flex-col items-center gap-2.5" style={{ height: '110px' }}>
                        {folder.avatarUrl && !imgError ? (
                            <img
                                src={folder.avatarUrl}
                                alt={folder.name}
                                className="w-14 h-14 rounded-full object-cover shadow-md shrink-0"
                                style={{ outline: '3px solid #e6faf8', outlineOffset: '2px' }}
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center shadow-md shrink-0"
                                style={{ background: 'linear-gradient(135deg, #33C7BE, #2ab5ac)', outline: '3px solid #e6faf8', outlineOffset: '2px' }}
                            >
                                <span className="text-white font-black text-base leading-none">{initials}</span>
                            </div>
                        )}

                        <div className="text-center w-full">
                            <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">
                                {folder.name}
                            </h3>
                            {folder.subtitle && (
                                <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5"
                                    style={{ color: '#2ab5ac', background: '#e6faf8' }}>
                                    {folder.subtitle}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid #e6faf8' }}>
                        <div className="flex items-center gap-1 text-gray-400">
                            <FileText size={11} />
                            <span className="text-xs font-medium">
                                {folder.docCount ?? 0} doc{(folder.docCount ?? 0) !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#33C7BE' }}>
                            <span className="text-xs font-semibold">Abrir</span>
                            <ChevronRight size={13} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Own folder: horizontal card ──────────────────────────────────────────
    return (
        <div
            onClick={() => onClick(folder.id, folder.name)}
            onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!onDropDocument) return
                setIsDragOver(true)
            }}
            onDragLeave={(e) => {
                e.stopPropagation()
                setIsDragOver(false)
            }}
            onDrop={handleDrop}
            className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${isDragOver ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/20'} group cursor-pointer p-4`}
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
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors opacity-50 group-hover:opacity-100 cursor-pointer"
                    >
                        <MoreVertical size={18} className="text-gray-400" />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
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
        </div>
    )
}
