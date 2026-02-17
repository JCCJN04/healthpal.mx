import React, { useState, useEffect } from 'react'
import { Upload, Search, Filter, FileText, Calendar, FolderOpen, Loader2, Plus } from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import ViewToggle from '@/shared/components/ui/ViewToggle'
import DocumentsTable from '@/shared/components/documents/DocumentsTable'
import { DocumentGrid } from '@/shared/components/documents/DocumentGrid'
import { useAuth } from '@/app/providers/AuthContext'
import { getUserDocuments, getDocumentsSharedWithMe, uploadDocument, deleteDocument, getFolders, createFolder, deleteFolder, updateFolder, updateDocument } from '@/shared/lib/queries/documents'
import { showToast } from '@/shared/components/ui/Toast'
import type { Database } from '@/shared/types/database'

type Document = Database['public']['Tables']['documents']['Row']
type DocCategory = Database['public']['Enums']['doc_category']
type Folder = {
  id: string
  name: string
  color: string
  created_at: string
}

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'radiology', label: 'Radiología' },
  { value: 'prescription', label: 'Recetas' },
  { value: 'history', label: 'Historial' },
  { value: 'lab', label: 'Laboratorio' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'other', label: 'Otros' },
]

export default function Documentos() {
  const { user } = useAuth()
  const [view, setView] = useState<'list' | 'grid'>('grid')
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [filteredFolders, setFilteredFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [currentFolder, setCurrentFolder] = useState<{ id: string | null; name: string }>({ id: null, name: 'Mis Documentos' })
  const [navHistory, setNavHistory] = useState<{ id: string | null; name: string }[]>([])
  const [sharedDocs, setSharedDocs] = useState<Array<{ doc: Document; senderId: string }>>([])
  const [sharedFolders, setSharedFolders] = useState<Folder[]>([])
  const [movingDocId, setMovingDocId] = useState<string | null>(null)

  const [uploadForm, setUploadForm] = useState<{
    file: File | null
    title: string
    category: DocCategory
    notes: string
  }>({
    file: null,
    title: '',
    category: 'other',
    notes: '',
  })

  useEffect(() => {
    loadContent()
  }, [user, currentFolder.id])

  useEffect(() => {
    filterContent()
  }, [documents, folders, searchQuery, selectedCategory])

  const loadContent = async () => {
    if (!user) return
    setLoading(true)

    const isSharedFolder = currentFolder.id?.startsWith('shared-')

    const [ownDocs, shared] = await Promise.all([
      // When viewing a synthetic shared folder, skip folder filter (null) to avoid UUID errors
      getUserDocuments(user.id, isSharedFolder ? null : currentFolder.id),
      getDocumentsSharedWithMe(user.id)
    ])

    // Drop imported copies (owner = me, uploaded_by != me) to avoid duplicates
    const cleanedOwn = ownDocs.filter(doc => !(doc.owner_id === user.id && doc.uploaded_by !== user.id))

    const sharedEntries = (shared as any[]) // document payload comes from join
      .map((s) => ({
        doc: (s as any).document as Document,
        senderId: (s as any).sender?.id || 'shared',
        senderName: (s as any).sender?.full_name || (s as any).sender?.email || 'Compartido'
      }))
      .filter(entry => !!entry.doc)

    // Build synthetic shared folders by sender, short name = patient name/email only
    const sharedFolderMap = new Map<string, string>()
    sharedEntries.forEach(entry => {
      sharedFolderMap.set(entry.senderId, entry.senderName)
    })
    const syntheticSharedFolders: Folder[] = Array.from(sharedFolderMap.entries()).map(([senderId, name]) => ({
      id: `shared-${senderId}`,
      name,
      color: '#33C7BE',
      created_at: new Date().toISOString(),
    }))

    // Remove legacy imported shared folders from DB to avoid clutter
    const ownFoldersInitial = await getFolders(user.id, isSharedFolder ? null : currentFolder.id)
    const legacyShared = ownFoldersInitial.filter(f => f.name.toLowerCase().startsWith('compartido de '))
    if (legacyShared.length) {
      await Promise.all(legacyShared.map(f => deleteFolder(f.id, user.id)))
      // If current folder was deleted, reset to root
      if (legacyShared.some(f => f.id === currentFolder.id)) {
        setCurrentFolder({ id: null, name: 'Mis Documentos' })
        setNavHistory([])
      }
    }
    const ownFolders = legacyShared.length ? await getFolders(user.id, currentFolder.id) : ownFoldersInitial
    const filteredOwnFolders = ownFolders.filter(f => !f.name.toLowerCase().startsWith('compartido de '))

    const targetSenderId = isSharedFolder ? currentFolder.id.replace('shared-', '') : null

    const docsForView = isSharedFolder
      ? sharedEntries.filter(e => e.senderId === targetSenderId).map(e => e.doc)
      : cleanedOwn

    // Dedup folders by id and hide synthetic shared folders when inside any folder
    const finalFolders = isSharedFolder
      ? filteredOwnFolders
      : currentFolder.id
        ? filteredOwnFolders
        : [...filteredOwnFolders, ...syntheticSharedFolders]
    const dedupFolders = finalFolders.filter((f, idx, arr) => arr.findIndex(x => x.id === f.id) === idx)

    setSharedDocs(sharedEntries.map(e => ({ doc: e.doc, senderId: e.senderId })))
    setSharedFolders(syntheticSharedFolders)
    setDocuments(docsForView)
    setFolders(dedupFolders)
    setLoading(false)
  }

  const filterContent = () => {
    let filtDocs = [...documents]
    let filtFlds = [...folders]

    // Filter by search
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      filtDocs = filtDocs.filter(doc =>
        doc.title.toLowerCase().includes(search) ||
        doc.notes?.toLowerCase().includes(search)
      )
      filtFlds = filtFlds.filter(f => f.name.toLowerCase().includes(search))
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtDocs = filtDocs.filter(doc => doc.category === selectedCategory)
      // Hide all folders when filtering by category unless they match search (folders don't have categories)
      if (!searchQuery) filtFlds = []
    }

    setFilteredDocuments(filtDocs)
    setFilteredFolders(filtFlds)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !uploadForm.file) return

    setUploading(true)
    const result = await uploadDocument(uploadForm.file, user.id, {
      title: uploadForm.title || uploadForm.file.name,
      category: uploadForm.category,
      notes: uploadForm.notes,
      folderId: currentFolder.id
    })

    if (result.success) {
      showToast('¡Documento subido exitosamente!', 'success')
      setUploadModalOpen(false)
      setUploadForm({
        file: null,
        title: '',
        category: 'other',
        notes: '',
      })
      loadContent()
    } else {
      showToast(result.error || 'Error al subir el documento', 'error')
    }
    setUploading(false)
  }

  const handleDelete = async (documentId: string) => {
    if (!user || !user.id) return
    if (!confirm('¿Estás seguro de eliminar este documento?')) return

    // Save original state for recovery
    const originalDocs = [...documents]

    // Optimistic Update: Remove from local state immediately
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))

    const result = await deleteDocument(documentId, user.id)
    if (result.success) {
      showToast('Documento eliminado correctamente', 'success')
      loadContent()
    } else {
      setDocuments(originalDocs)
      showToast(result.error || 'Error al eliminar', 'error')
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newFolderName) return

    const result = await createFolder(newFolderName, user.id, currentFolder.id)
    if (result.success) {
      showToast('Carpeta creada', 'success')
      setFolderModalOpen(false)
      setNewFolderName('')
      loadContent()
    } else {
      showToast(result.error || 'Error al crear carpeta', 'error')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!user || !user.id) return
    if (!confirm('¿Estás seguro de eliminar esta carpeta? Todos los documentos dentro permanecerán en la base de datos pero sin carpeta.')) return

    const result = await deleteFolder(folderId, user.id)
    if (result.success) {
      showToast('Carpeta eliminada', 'success')
      loadContent()
    } else {
      showToast(result.error || 'Error al eliminar carpeta', 'error')
    }
  }

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    if (!user || !user.id) return
    const newName = prompt('Ingresa el nuevo nombre de la carpeta:', currentName)
    if (!newName || newName === currentName) return

    const result = await updateFolder(folderId, user.id, { name: newName })
    if (result.success) {
      showToast('Carpeta renombrada', 'success')
      loadContent()
    } else {
      showToast(result.error || 'Error al renombrar carpeta', 'error')
    }
  }

  const handleMoveDocument = async (docId: string, targetFolderId: string | null) => {
    if (!user) return
    const doc = [...documents, ...sharedDocs.map(s => s.doc)].find(d => d.id === docId)
    if (!doc) {
      showToast('No encontramos el documento a mover', 'error')
      return
    }
    if (doc.owner_id !== user.id) {
      showToast('Solo puedes mover tus documentos', 'error')
      return
    }

    try {
      setMovingDocId(docId)
      const result = await updateDocument(docId, user.id, { folder_id: targetFolderId })
      if (result.success) {
        showToast('Documento movido', 'success')
        await loadContent()
      } else {
        showToast(result.error || 'No se pudo mover el documento', 'error')
      }
    } finally {
      setMovingDocId(null)
    }
  }

  const handleFolderClick = (id: string, name: string) => {
    setNavHistory(prev => [...prev, currentFolder])
    setCurrentFolder({ id, name })
  }

  const handleBackNavigation = (index: number) => {
    if (index === -1) {
      setCurrentFolder({ id: null, name: 'Mis Documentos' })
      setNavHistory([])
    } else {
      const target = navHistory[index]
      setCurrentFolder(target)
      setNavHistory(navHistory.slice(0, index))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      }))
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
              Tus Documentos
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              {currentFolder.id ? `Carpeta: ${currentFolder.name}` : 'Administra y organiza tus documentos médicos'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFolderModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              <span>Nueva Carpeta</span>
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm md:text-base"
            >
              <Plus size={20} />
              <span>Subir Documento</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{documents.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Calendar size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Este mes</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {documents.filter(d => {
                    const created = new Date(d.created_at)
                    const now = new Date()
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200 col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <FolderOpen size={18} className="text-teal-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Categorías</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {new Set(documents.map(d => d.category)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-gray-400 hidden md:block" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm flex-1 md:flex-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <ViewToggle view={view} onViewChange={setView} />
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-500 overflow-x-auto py-1 no-scrollbar">
          <button
            onClick={() => handleBackNavigation(-1)}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const payload = e.dataTransfer.getData('application/healthpal-doc') || e.dataTransfer.getData('text/plain')
              try {
                const parsed = JSON.parse(payload)
                if (parsed?.docId) {
                  handleMoveDocument(parsed.docId, null)
                }
              } catch {
                if (payload) handleMoveDocument(payload, null)
              }
            }}
            className={`hover:text-primary transition-colors whitespace-nowrap ${!currentFolder.id ? 'font-bold text-gray-900' : ''}`}
          >
            Mis Documentos
          </button>
          {navHistory.map((folder, index) => (
            index > 0 && (
              <React.Fragment key={folder.id}>
                <span className="text-gray-300">/</span>
                <button
                  onClick={() => handleBackNavigation(index)}
                  className="hover:text-primary transition-colors whitespace-nowrap"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            )
          ))}
          {currentFolder.id && (
            <>
              <span className="text-gray-300">/</span>
              <span className="font-bold text-gray-900 whitespace-nowrap">{currentFolder.name}</span>
            </>
          )}
        </div>

        {/* Documents List/Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12 md:py-16">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : filteredDocuments.length === 0 && filteredFolders.length === 0 ? (
          <div className="bg-white rounded-lg p-8 md:p-12 text-center border border-gray-200">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              {documents.length === 0 ? 'No hay documentos' : 'No se encontraron resultados'}
            </h3>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              {documents.length === 0
                ? 'Comienza subiendo tu primer documento médico'
                : 'Intenta ajustar los filtros de búsqueda'
              }
            </p>
            {documents.length === 0 && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus size={20} />
                <span>Subir Documento</span>
              </button>
            )}
          </div>
        ) : view === 'list' ? (
          <DocumentsTable
            documents={filteredDocuments}
            folders={filteredFolders}
            onDelete={handleDelete}
            onFolderClick={handleFolderClick}
            onMoveDocument={handleMoveDocument}
            movingDocId={movingDocId}
          />
        ) : (
          <DocumentGrid
            documents={filteredDocuments}
            folders={filteredFolders}
            onDeleteDocument={handleDelete}
            onDeleteFolder={handleDeleteFolder}
            onFolderClick={handleFolderClick}
            onRenameFolder={handleRenameFolder}
            onMoveDocument={handleMoveDocument}
            movingDocId={movingDocId}
          />
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                Subir Documento
              </h2>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      id="file-upload"
                      required
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                      {uploadForm.file ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {uploadForm.file.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600">
                            Click para seleccionar o arrastra un archivo
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, DOC, JPG, PNG (Máx. 10MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="Ej: Radiografía de tórax"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría *
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value as DocCategory }))}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                    required
                  >
                    {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    placeholder="Agrega notas o observaciones..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    disabled={uploading}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadForm.file}
                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <span>Subir Documento</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* New Folder Modal */}
      {folderModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Nueva Carpeta</h2>
              <form onSubmit={handleCreateFolder} className="space-y-4">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nombre de la carpeta"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFolderModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
                  >
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
