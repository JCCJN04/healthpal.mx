import React, { useState, useEffect } from 'react'
import { Upload, Search, FileText, Loader2, Plus, FileUp, X, Copy, Check } from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import ViewToggle from '@/shared/components/ui/ViewToggle'
import DocumentsTable from '@/shared/components/documents/DocumentsTable'
import { DocumentGrid } from '@/shared/components/documents/DocumentGrid'
import { useAuth } from '@/app/providers/AuthContext'
import { getUserDocuments, getDocumentsSharedWithMe, uploadDocument, deleteDocument, getFolders, createFolder, deleteFolder, updateFolder, updateDocument } from '@/shared/lib/queries/documents'
import { createDocumentRequest } from '@/shared/lib/queries/documentRequests'
import { showToast } from '@/shared/components/ui/Toast'
import { validateFile } from '@/shared/lib/errors'
import { isDemoMode } from '@/context/DemoContext'
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
  const { user, profile } = useAuth()
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
  const [_sharedFolders, setSharedFolders] = useState<Folder[]>([])
  const [movingDocId, setMovingDocId] = useState<string | null>(null)
  const [senderEmailMap, setSenderEmailMap] = useState<Map<string, string>>(new Map())

  // Document request modal (doctor only)
  const [docReqOpen, setDocReqOpen] = useState(false)
  const [docReqEmail, setDocReqEmail] = useState('')
  const [docReqType, setDocReqType] = useState('')
  const [docReqDesc, setDocReqDesc] = useState('')
  const [docReqLoading, setDocReqLoading] = useState(false)
  const [docReqLink, setDocReqLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
    loadContent(currentFolder.id)
  }, [user, currentFolder.id])

  useEffect(() => {
    filterContent()
  }, [documents, folders, searchQuery, selectedCategory])

  const loadContent = async (folderId: string | null = currentFolder.id) => {
    if (!user) return
    setLoading(true)

    const isSharedFolder = folderId?.startsWith('shared-')

    const [ownDocs, shared] = await Promise.all([
      // When viewing a synthetic shared folder, skip folder filter (null) to avoid UUID errors
      getUserDocuments(user.id, isSharedFolder ? null : folderId),
      getDocumentsSharedWithMe(user.id)
    ])

    // Drop imported copies (owner = me, uploaded_by != me) to avoid duplicates
    const cleanedOwn = ownDocs.filter(doc => !(doc.owner_id === user.id && doc.uploaded_by !== user.id))

    const sharedEntries = (shared as any[]) // document payload comes from join
      .map((s) => ({
        doc: (s as any).document as Document,
        senderId: (s as any).sender?.id || 'shared',
        senderName: (s as any).sender?.full_name || (s as any).sender?.email || 'Compartido',
        senderEmail: (s as any).sender?.email || ''
      }))
      .filter(entry => !!entry.doc)

    // Build email map for doc request pre-fill
    const emailMap = new Map<string, string>()
    sharedEntries.forEach(entry => { if (entry.senderEmail) emailMap.set(entry.senderId, entry.senderEmail) })
    setSenderEmailMap(emailMap)

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
    const ownFoldersInitial = await getFolders(user.id, isSharedFolder ? null : folderId)
    const legacyShared = ownFoldersInitial.filter(f => f.name.toLowerCase().startsWith('compartido de '))
    if (legacyShared.length) {
      await Promise.all(legacyShared.map(f => deleteFolder(f.id, user.id)))
      // If current folder was deleted, reset to root
      if (legacyShared.some(f => f.id === folderId)) {
        setCurrentFolder({ id: null, name: 'Mis Documentos' })
        setNavHistory([])
      }
    }
    const ownFolders = legacyShared.length ? await getFolders(user.id, folderId) : ownFoldersInitial
    const filteredOwnFolders = ownFolders.filter(f => !f.name.toLowerCase().startsWith('compartido de '))

    const targetSenderId = isSharedFolder ? folderId?.replace('shared-', '') ?? null : null

    const docsForView = isSharedFolder
      ? sharedEntries.filter(e => e.senderId === targetSenderId).map(e => e.doc)
      : cleanedOwn

    // Dedup folders by id and hide synthetic shared folders when inside any folder
    const finalFolders = isSharedFolder
      ? []                   // Inside a patient's shared folder: no subfolders
      : folderId
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
    if (!user) {
      showToast('No se detecto usuario activo en demo. Recarga la pagina.', 'error')
      return
    }

    if (!uploadForm.file) {
      showToast('Selecciona un archivo para continuar.', 'warning')
      return
    }

    setUploading(true)
    const result = await uploadDocument(uploadForm.file, user.id, {
      title: uploadForm.title || uploadForm.file.name,
      category: uploadForm.category,
      notes: uploadForm.notes,
      folderId: currentFolder.id?.startsWith('shared-') ? null : currentFolder.id
    })

    if (result.success && result.documentId) {
      setUploadModalOpen(false)

      if (isDemoMode()) {
        showToast('Documento subido correctamente (demo)', 'success')
        setCurrentFolder({ id: null, name: 'Mis Documentos' })
        setNavHistory([])
        setSearchQuery('')
        setSelectedCategory('all')
        setUploadForm({
          file: null,
          title: '',
          category: 'other',
          notes: '',
        })
        await loadContent(null)
        setUploading(false)
        return
      }

      showToast("Documento subido correctamente", "success")
      loadContent(currentFolder.id)
      setUploadForm({
        file: null,
        title: '',
        category: 'other',
        notes: '',
      })
      loadContent(currentFolder.id)
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
      loadContent(currentFolder.id)
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
      loadContent(currentFolder.id)
    } else {
      showToast(result.error || 'Error al crear carpeta', 'error')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!user || !user.id) return
    if (!confirm('¿Estás seguro de eliminar esta carpeta? Se eliminarán también todos los documentos que contiene. Esta acción no se puede deshacer.')) return

    const result = await deleteFolder(folderId, user.id)
    if (result.success) {
      showToast('Carpeta eliminada', 'success')
      loadContent(currentFolder.id)
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
      loadContent(currentFolder.id)
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
        await loadContent(currentFolder.id)
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

  const handleCreateDocRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setDocReqLoading(true)
    try {
      const { data, error } = await (createDocumentRequest as any)(user.id, docReqEmail, docReqType, docReqDesc)
      if (error || !data) {
        showToast(error || 'Error al crear la solicitud', 'error')
        return
      }
      setDocReqLink(`${window.location.origin}/solicitud/${data.token}`)
    } catch {
      showToast('Error inesperado', 'error')
    } finally {
      setDocReqLoading(false)
    }
  }

  const handleCopyDocReqLink = () => {
    if (!docReqLink) return
    navigator.clipboard.writeText(docReqLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetDocReqModal = () => {
    setDocReqOpen(false)
    setDocReqLink(null)
    setDocReqEmail('')
    setDocReqType('')
    setDocReqDesc('')
    setCopied(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size before accepting
      const validationError = validateFile(file, 'document')
      if (validationError) {
        showToast(validationError, 'error')
        e.target.value = '' // Reset input
        return
      }
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      }))
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-4">

        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-teal-600 p-6 md:p-7 text-white shadow-lg">
          <div className="absolute top-0 right-0 bottom-0 w-72 opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {currentFolder.id ? currentFolder.name : 'Mis Documentos'}
              </h1>
              <p className="text-sm text-white/75 mt-1">
                {currentFolder.id?.startsWith('shared-')
                  ? 'Documentos compartidos contigo por este paciente'
                  : currentFolder.id
                    ? 'Carpeta de documentos'
                    : 'Administra y organiza tus archivos médicos'}
              </p>
            </div>
            {/* Stats pills */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center min-w-[60px]">
                <p className="text-xl font-bold">{documents.length}</p>
                <p className="text-[10px] text-white/70 font-medium">Archivos</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center min-w-[60px]">
                <p className="text-xl font-bold">{new Set(documents.map(d => d.category)).size}</p>
                <p className="text-[10px] text-white/70 font-medium">Categorías</p>
              </div>
            </div>
          </div>
          {/* Action buttons row inside header */}
          <div className="relative z-10 flex items-center gap-2 mt-5 flex-wrap">
            {profile?.role === 'doctor' && currentFolder.id?.startsWith('shared-') && (
              <button
                onClick={() => {
                  const senderId = currentFolder.id!.replace('shared-', '')
                  setDocReqEmail(senderEmailMap.get(senderId) || '')
                  setDocReqOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all backdrop-blur-sm"
              >
                <FileUp size={15} />
                Solicitar documento
              </button>
            )}
            <button
              onClick={() => setFolderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all backdrop-blur-sm"
            >
              <Plus size={15} />
              Nueva Carpeta
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-primary text-sm font-bold rounded-xl hover:bg-white/90 transition-all shadow-sm"
            >
              <Upload size={15} />
              Subir Documento
            </button>
          </div>
        </div>

        {/* Search + Filter row */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar documentos y carpetas…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary text-sm transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100 overflow-x-auto no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat.value
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <ViewToggle view={view} onViewChange={setView} />
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-sm text-gray-400 overflow-x-auto py-0.5 no-scrollbar">
          <button
            onClick={() => handleBackNavigation(-1)}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation()
              const payload = e.dataTransfer.getData('application/healthpal-doc') || e.dataTransfer.getData('text/plain')
              try {
                const parsed = JSON.parse(payload)
                if (parsed?.docId) handleMoveDocument(parsed.docId, null)
              } catch {
                if (payload) handleMoveDocument(payload, null)
              }
            }}
            className={`hover:text-primary transition-colors whitespace-nowrap ${!currentFolder.id ? 'font-semibold text-gray-700' : ''}`}
          >
            Mis Documentos
          </button>
          {navHistory.map((folder, index) => (
            index > 0 && (
              <React.Fragment key={folder.id}>
                <span className="text-gray-200">/</span>
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
              <span className="text-gray-200">/</span>
              <span className="font-semibold text-gray-700 whitespace-nowrap">{currentFolder.name}</span>
            </>
          )}
        </div>

        {/* Documents List/Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-400">Cargando documentos…</p>
          </div>
        ) : filteredDocuments.length === 0 && filteredFolders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-teal-400/10 flex items-center justify-center">
              <FileText size={28} className="text-primary/40" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              {documents.length === 0 ? 'Sin documentos aún' : 'Sin resultados'}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
              {documents.length === 0
                ? 'Sube tu primer documento médico para comenzar'
                : 'Intenta ajustar los filtros de búsqueda'}
            </p>
            {documents.length === 0 && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold text-sm shadow-sm hover:shadow-md"
              >
                <Upload size={16} />
                Subir Documento
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
      {/* Document Request Modal */}
      {docReqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileUp size={18} className="text-primary" />
                <h2 className="text-base font-bold text-gray-900">Solicitar documento al paciente</h2>
              </div>
              <button onClick={resetDocReqModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {docReqLink ? (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Comparte este enlace con tu paciente. Al abrirlo, se le pedirá crear una cuenta (si no tiene) y subir el documento.
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-gray-700 truncate flex-1 font-mono">{docReqLink}</span>
                  <button
                    onClick={handleCopyDocReqLink}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">El enlace expira en 7 días.</p>
                <button
                  onClick={resetDocReqModal}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Listo
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateDocRequest} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Correo del paciente</label>
                  <input
                    type="email"
                    value={docReqEmail}
                    onChange={e => setDocReqEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-gray-400 mt-1">No necesita tener cuenta — se le pedirá crearla al abrir el enlace.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">¿Qué documento necesitas?</label>
                  <input
                    type="text"
                    list="doc-type-options-docs"
                    value={docReqType}
                    onChange={e => setDocReqType(e.target.value)}
                    placeholder="Selecciona o escribe el tipo de documento…"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <datalist id="doc-type-options-docs">
                    <option value="Análisis de sangre completo" />
                    <option value="Radiografía" />
                    <option value="Resonancia magnética" />
                    <option value="Tomografía" />
                    <option value="Ultrasonido" />
                    <option value="Receta médica" />
                    <option value="Historial médico" />
                    <option value="Resultados de laboratorio" />
                    <option value="Póliza de seguro médico" />
                    <option value="Electrocardiograma" />
                    <option value="Densitometría ósea" />
                    <option value="Expediente de vacunación" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Instrucción adicional (opcional)</label>
                  <textarea
                    value={docReqDesc}
                    onChange={e => setDocReqDesc(e.target.value)}
                    placeholder="Ej. Análisis de sangre completo del 15 de abril"
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={docReqLoading}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {docReqLoading ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
                  Generar enlace
                </button>
              </form>
            )}
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
