import { MoreVertical, Folder, Trash2, Edit } from 'lucide-react'
import { useState } from 'react'

interface FolderCardProps {
    folder: {
        id: string
        name: string
        color: string
        created_at: string
    }
    onClick: (folderId: string, folderName: string) => void
    onDelete: (folderId: string) => void
    onRename: (folderId: string, currentName: string) => void
    onDropDocument?: (docId: string, folderId: string) => void
}

export const FolderCard = ({ folder, onClick, onDelete, onRename, onDropDocument }: FolderCardProps) => {
    const [menuOpen, setMenuOpen] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        const payload = e.dataTransfer.getData('application/healthpal-doc') || e.dataTransfer.getData('text/plain')
        try {
            const parsed = JSON.parse(payload)
            if (parsed?.docId) {
                onDropDocument?.(parsed.docId, folder.id)
            }
        } catch {
            if (payload) {
                onDropDocument?.(payload, folder.id)
            }
        }
    }

    const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation()
        action()
        setMenuOpen(false)
    }

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
            className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${isDragOver ? 'border-[#33C7BE] ring-2 ring-[#33C7BE]/30' : 'border-transparent hover:border-[#33C7BE]/20'} group cursor-pointer p-4`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="p-3 rounded-lg flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: folder.color || '#33C7BE' }}
                    >
                        <Folder size={24} fill="currentColor" fillOpacity={0.3} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate pr-2 max-w-[160px] sm:max-w-[220px]">
                            {folder.name}
                        </h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                            Carpeta
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <MoreVertical size={18} className="text-gray-400" />
                    </button>

                    {menuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-20"
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-30 ring-1 ring-black ring-opacity-5">
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
