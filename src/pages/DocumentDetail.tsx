import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Share2,
  MoreVertical,
  FolderOpen,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { DocumentViewer } from '../components/DocumentViewer'
import { NotesPanel } from '../components/NotesPanel'
import { ShareModal } from '../components/ShareModal'
import { RenameDocumentModal, MoveDocumentModal } from '../components/documents/DocumentModals'
import { getDocumentById, getDocumentDownloadUrl, deleteDocument, updateDocument, downloadDocumentFile } from '../lib/queries/documents'
import { showToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'


export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadDocumentData(id)
    }
  }, [id])

  const loadDocumentData = async (docId: string) => {
    setLoading(true)
    try {
      const doc = await getDocumentById(docId)
      if (doc) {
        setDocument(doc)
        const url = await getDocumentDownloadUrl(doc.file_path)
        setFileUrl(url)
      }
    } catch (err) {
      console.error('Error loading document:', err)
      showToast('Error al cargar el documento', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!document) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Documento no encontrado
            </h2>
            <p className="text-gray-600 mb-6">
              El documento que buscas no existe o ha sido eliminado.
            </p>
            <button
              onClick={() => navigate('/dashboard/documentos')}
              className="text-[#33C7BE] font-semibold hover:underline"
            >
              Volver a documentos
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }


  const handleBack = () => {
    navigate(-1)
  }

  const handleDownload = async () => {
    if (!document) return
    console.log('Descargando documento:', document.id)

    // Use the new blob download method to force download
    const result = await downloadDocumentFile(document.file_path, document.title)

    if (!result.success) {
      showToast(result.error || 'No se pudo descargar el documento', 'error')
    }
  }

  const handleShare = () => {
    setShareModalOpen(true)
  }

  const handleMenuAction = async (action: string) => {
    if (!document) return
    console.log(`Acción menu: ${action} para`, document.id)
    setMenuOpen(false)

    if (action === 'Eliminar') {
      if (!user || !document) return
      if (!confirm('¿Estás seguro de que deseas eliminar este documento permanentemente?')) return

      const result = await deleteDocument(document.id, user.id)
      if (result.success) {
        showToast('Documento eliminado correctamente', 'success')
        navigate('/dashboard/documentos')
      } else {
        showToast(result.error || 'Error al eliminar', 'error')
      }
    } else if (action === 'Renombrar') {
      setRenameModalOpen(true)
    } else if (action === 'Mover a carpeta') {
      setMoveModalOpen(true)
    }
  }

  // Define Note interface locally to match mock/Component expectation
  interface Note {
    id: string
    author: string
    authorInitial: string
    timeAgo: string
    content: string
    timestamp: string // Changed from createdAt
  }

  // Parse notes from string (JSON or plain text)
  const parseNotes = (notesData: string | null): Note[] => {
    if (!notesData) return []
    try {
      const parsed = JSON.parse(notesData)
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }
      return [] // If valid JSON but not array, fallback
    } catch (e) {
      // Not JSON, treat as legacy plain text note if not empty
      if (notesData.trim()) {
        return [{
          id: 'legacy',
          author: 'Sistema',
          authorInitial: 'S',
          timeAgo: 'Nota antigua',
          content: notesData,
          timestamp: new Date().toISOString()
        }]
      }
      return []
    }
  }

  const handleAddNote = async (content: string) => {
    if (!user || !document) return
    console.log('Guardando nota:', content)

    // Create new note object
    const newNote: Note = {
      id: crypto.randomUUID(),
      author: profile?.full_name || user.email || 'Usuario',
      authorInitial: (profile?.full_name || user.email || 'U').charAt(0).toUpperCase(),
      timeAgo: 'Justo ahora',
      content: content,
      timestamp: new Date().toISOString()
    }

    // Get current notes
    const currentNotes = parseNotes(document.notes)

    // Update locally
    const updatedNotes = [newNote, ...currentNotes]
    const notesString = JSON.stringify(updatedNotes)

    // Optimistic update
    const previousNotesString = document.notes
    setDocument({ ...document, notes: notesString })

    const result = await updateDocument(document.id, user.id, { notes: notesString })

    if (result.success) {
      showToast('Nota guardada', 'success')
    } else {
      // Revert if failed
      setDocument({ ...document, notes: previousNotesString })
      showToast(result.error || 'Error al guardar la nota', 'error')
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'prescription':
        return 'bg-purple-100 text-purple-700'
      case 'radiology':
        return 'bg-blue-100 text-blue-700'
      case 'lab':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      radiology: 'Radiología',
      prescription: 'Recetas',
      history: 'Historial',
      lab: 'Laboratorio',
      insurance: 'Seguros',
      other: 'Otros',
    }
    return labels[category] || category
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getFileType = (mimeType: string | null): 'pdf' | 'image' => {
    if (mimeType?.includes('pdf')) return 'pdf'
    return 'image'
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Top Row: Back + Actions */}
          <div className="flex items-center justify-between mb-6">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Volver a Documentos</span>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors group"
                title="Descargar"
              >
                <Download className="w-5 h-5 text-gray-600 group-hover:text-[#33C7BE]" />
              </button>
              <button
                onClick={handleShare}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors group"
                title="Compartir"
              >
                <Share2 className="w-5 h-5 text-gray-600 group-hover:text-[#33C7BE]" />
              </button>

              {/* More Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Más opciones"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      <button
                        onClick={() => handleMenuAction('Renombrar')}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <Edit className="w-4 h-4" />
                        Renombrar
                      </button>
                      <button
                        onClick={() => handleMenuAction('Mover a carpeta')}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Mover a carpeta
                      </button>
                      <div className="border-t border-gray-200 my-2"></div>
                      <button
                        onClick={() => handleMenuAction('Eliminar')}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Document Info */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {document.title}
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Chip */}
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wider ${getCategoryColor(
                  document.category
                )}`}
              >
                {getCategoryLabel(document.category)}
              </span>

              {/* Date */}
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                {formatDate(document.created_at)}
              </span>

              {/* File Info */}
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                {document.mime_type?.split('/')[1].toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Document Viewer (75%) */}
          <div className="lg:col-span-3">
            {fileUrl ? (
              <DocumentViewer
                fileUrl={fileUrl}
                fileType={getFileType(document.mime_type)}
                title={document.title}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border-2 border-dashed border-gray-100 min-h-[600px] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-gray-900 font-bold text-lg">Cargando documento...</p>
                <p className="text-gray-500">Generando enlace seguro...</p>
              </div>
            )}
          </div>

          {/* Right: Notes Panel (25%) */}
          <div className="lg:col-span-1">
            <NotesPanel notes={parseNotes(document.notes)} onAddNote={handleAddNote} />
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        documentTitle={document.title}
      />

      {/* Rename Modal */}
      {user && (
        <RenameDocumentModal
          isOpen={renameModalOpen}
          onClose={() => setRenameModalOpen(false)}
          currentTitle={document.title}
          documentId={document.id}
          userId={user.id}
          onSuccess={(newTitle) => setDocument({ ...document, title: newTitle })}
        />
      )}

      {/* Move Modal */}
      {user && (
        <MoveDocumentModal
          isOpen={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          currentFolderId={document.folder_id}
          documentId={document.id}
          userId={user.id}
          onSuccess={(newFolderId) => setDocument({ ...document, folder_id: newFolderId })}
        />
      )}
    </DashboardLayout>
  )
}
