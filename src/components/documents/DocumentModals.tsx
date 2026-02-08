import { useState, useEffect } from 'react'
import { X, Folder, Edit2, Loader2, Save } from 'lucide-react'
import { getFolders, updateDocument } from '../../lib/queries/documents'
import { showToast } from '../Toast'

/**
 * Modal to rename a document
 */
interface RenameDocumentModalProps {
    isOpen: boolean
    onClose: () => void
    currentTitle: string
    documentId: string
    userId: string
    onSuccess: (newTitle: string) => void
}

export function RenameDocumentModal({
    isOpen,
    onClose,
    currentTitle,
    documentId,
    userId,
    onSuccess
}: RenameDocumentModalProps) {
    const [title, setTitle] = useState(currentTitle)
    const [loading, setLoading] = useState(false)

    // Reset title when modal opens
    useEffect(() => {
        if (isOpen) setTitle(currentTitle)
    }, [isOpen, currentTitle])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || title === currentTitle) return

        setLoading(true)
        try {
            const result = await updateDocument(documentId, userId, { title: title.trim() })
            if (result.success) {
                showToast('Documento renombrado correctamente', 'success')
                onSuccess(title.trim())
                onClose()
            } else {
                showToast(result.error || 'Error al renombrar', 'error')
            }
        } catch (error) {
            console.error('Error renaming:', error)
            showToast('Error inesperado', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-[#33C7BE]" />
                        Renombrar documento
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nuevo nombre
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all"
                            placeholder="Nombre del documento"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title.trim() || title === currentTitle}
                            className="px-4 py-2 bg-[#33C7BE] text-white font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

/**
 * Modal to move a document to a folder
 */
interface MoveDocumentModalProps {
    isOpen: boolean
    onClose: () => void
    currentFolderId: string | null
    documentId: string
    userId: string
    onSuccess: (folderId: string | null) => void
}

export function MoveDocumentModal({
    isOpen,
    onClose,
    currentFolderId,
    documentId,
    userId,
    onSuccess
}: MoveDocumentModalProps) {
    const [folders, setFolders] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId)
    const [fetchingFolders, setFetchingFolders] = useState(true)

    useEffect(() => {
        if (isOpen) {
            loadFolders()
            setSelectedFolderId(currentFolderId)
        }
    }, [isOpen, currentFolderId])

    const loadFolders = async () => {
        setFetchingFolders(true)
        try {
            const data = await getFolders(userId)
            setFolders(data)
        } catch (error) {
            console.error('Error loading folders:', error)
            showToast('Error al cargar carpetas', 'error')
        } finally {
            setFetchingFolders(false)
        }
    }

    if (!isOpen) return null

    const handleMove = async () => {
        if (selectedFolderId === currentFolderId) return

        setLoading(true)
        try {
            const result = await updateDocument(documentId, userId, { folder_id: selectedFolderId })
            if (result.success) {
                showToast('Documento movido correctamente', 'success')
                onSuccess(selectedFolderId)
                onClose()
            } else {
                showToast(result.error || 'Error al mover', 'error')
            }
        } catch (error) {
            console.error('Error moving:', error)
            showToast('Error inesperado', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-[#33C7BE]" />
                        Mover a carpeta
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {fetchingFolders ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setSelectedFolderId(null)}
                                    className={`w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center gap-3 ${selectedFolderId === null
                                            ? 'border-[#33C7BE] bg-teal-50 ring-1 ring-[#33C7BE]'
                                            : 'border-gray-100 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                        <Folder className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">Documentos principales</h4>
                                        <p className="text-xs text-gray-500">Sin carpeta</p>
                                    </div>
                                </button>

                                {folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => setSelectedFolderId(folder.id)}
                                        className={`w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center gap-3 ${selectedFolderId === folder.id
                                                ? 'border-[#33C7BE] bg-teal-50 ring-1 ring-[#33C7BE]'
                                                : 'border-gray-100 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: folder.color || '#33C7BE' }}>
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">{folder.name}</h4>
                                            <p className="text-xs text-gray-500">Carpeta personalizada</p>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleMove}
                            disabled={loading || selectedFolderId === currentFolderId}
                            className="px-4 py-2 bg-[#33C7BE] text-white font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Moviendo...
                                </>
                            ) : (
                                <>
                                    <Folder className="w-4 h-4" />
                                    Mover aquí
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
