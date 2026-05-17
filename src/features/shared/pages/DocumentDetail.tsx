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
  Loader2,
  CalendarDays,
  HardDrive,
  Tag,
  FileText,
  Clock,
  Info,
  StickyNote,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Link2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { DocumentViewer } from '@/shared/components/documents/DocumentViewer'
import { NotesPanel } from '@/shared/components/documents/NotesPanel'
import { ShareModal } from '@/shared/components/documents/ShareModal'
import { RenameDocumentModal, MoveDocumentModal } from '@/shared/components/documents/DocumentModals'
import { getDocumentById, getDocumentDownloadUrl, deleteDocument, updateDocument, downloadDocumentFile, shareDocumentWithUser, buildDeterministicDocumentPath, getDecryptedDocumentUrl, downloadDocumentFileDecrypted } from '@/shared/lib/queries/documents'
import { showToast } from '@/shared/components/ui/Toast'
import { extractDocumentInfo } from '@/shared/lib/gemini'
import { useAuth } from '@/app/providers/AuthContext'
import { useCrypto } from '@/context/CryptoContext'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'

type Document = Database['public']['Tables']['documents']['Row']

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { privateKey } = useCrypto()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'notas'>('info')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (id) {
      loadDocumentData(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadDocumentData = async (docId: string) => {
    setLoading(true)
    setLoadError(false)
    try {
      const doc = await getDocumentById(docId)
      if (doc) {
        setDocument(doc)
        if (doc.external_url) {
          setFileUrl(doc.external_url)
        } else if ((doc as Document & { is_encrypted?: boolean }).is_encrypted && privateKey) {
          // Encrypted document: decrypt in-browser before preview
          const url = await getDecryptedDocumentUrl(doc, privateKey)
          if (url) {
            setFileUrl(url)
          } else {
            setLoadError(true)
          }
        } else {
          const url = await getDocumentDownloadUrl(doc)
          if (url) {
            setFileUrl(url)
          } else {
            setLoadError(true)
          }
        }
      }
    } catch (err) {
      logger.error('DocumentDetail:loadDocument', err)
      showToast('Error al cargar el documento', 'error')
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <Loader2 className="w-6 h-6 text-primary animate-spin absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">Cargando documento</p>
            <p className="text-sm text-gray-500 mt-1">Generando enlace seguro...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!document) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Documento no encontrado</h2>
            <p className="text-gray-500 mb-6">El documento que buscas no existe o fue eliminado.</p>
            <button
              onClick={() => navigate('/dashboard/documentos')}
              className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
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

  const handleAskAI = async () => {
    if (!user || !document) return
    setIsAskingAI(true)
    showToast('Analizando documento con IA...', 'info')
    
    try {
      const filePath = buildDeterministicDocumentPath(document.owner_id, document.id)
      const result_ai = await extractDocumentInfo(document.id, filePath, document.mime_type || 'application/octet-stream')
      
      if (result_ai.success) {
        showToast('¡Análisis generado exitosamente!', 'success')
        // Refresh document to fetch the new notes from the backend
        const docResult = await getDocumentById(document.id)
        if (docResult) setDocument(docResult)
      } else {
        showToast(result_ai.error || 'La IA no pudo procesar el documento.', 'warning')
      }
    } catch (err: unknown) {
      logger.error('Error during Ask AI', err)
      showToast('Ocurrió un error inesperado con la IA.', 'error')
    } finally {
      setIsAskingAI(false)
    }
  }

  const handleDownload = async () => {
    if (!document) return

    const isEncrypted = (document as Document & { is_encrypted?: boolean }).is_encrypted

    if (isEncrypted && privateKey) {
      // Decrypt in-browser before download
      const result = await downloadDocumentFileDecrypted(
        document,
        document.id,
        document.mime_type || 'application/octet-stream',
        document.title,
        privateKey
      )
      if (!result.success) {
        showToast(result.error || 'No se pudo descargar el documento cifrado', 'error')
      }
      return
    }

    // Plain (non-encrypted) document
    const result = await downloadDocumentFile(document, document.title)
    if (!result.success) {
      showToast(result.error || 'No se pudo descargar el documento', 'error')
    }
  }

  const handleShare = () => {
    setShareModalOpen(true)
  }

  const handleShareSubmit = async (email: string) => {
    if (!user || !document) return { success: false, error: 'No hay usuario autenticado' }

    const result = await shareDocumentWithUser(
      document.id,
      user.id,
      { email },
      { document, senderProfile: { full_name: profile?.full_name, email: user.email } }
    )

    if (result.success) {
      showToast('Documento compartido', 'success')
      return { success: true }
    }

    showToast(result.error || 'No se pudo compartir el documento', 'error')
    return { success: false, error: result.error }
  }

  const handleMenuAction = async (action: string) => {
    if (!document) return
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
      case 'prescription': return 'bg-purple-100 text-purple-700'
      case 'radiology':    return 'bg-blue-100 text-blue-700'
      case 'lab':          return 'bg-green-100 text-green-700'
      case 'history':      return 'bg-orange-100 text-orange-700'
      case 'insurance':    return 'bg-teal-100 text-teal-700'
      default:             return 'bg-gray-100 text-gray-600'
    }
  }

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'prescription': return 'bg-purple-50'
      case 'radiology':    return 'bg-blue-50'
      case 'lab':          return 'bg-green-50'
      case 'history':      return 'bg-orange-50'
      case 'insurance':    return 'bg-teal-50'
      default:             return 'bg-gray-50'
    }
  }

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'prescription': return 'text-purple-600'
      case 'radiology':    return 'text-blue-600'
      case 'lab':          return 'text-green-600'
      case 'history':      return 'text-orange-600'
      case 'insurance':    return 'text-teal-600'
      default:             return 'text-gray-500'
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

  const getMimeLabel = (mimeType: string | null): string => {
    if (!mimeType) return 'ARCHIVO'
    const mimeLabels: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.ms-powerpoint': 'PPT',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/webp': 'WEBP',
      'image/gif': 'GIF',
      'image/tiff': 'TIFF',
      'image/heic': 'HEIC',
      'image/heif': 'HEIF',
      'image/bmp': 'BMP',
      'video/mp4': 'MP4',
      'video/quicktime': 'MOV',
      'video/x-msvideo': 'AVI',
      'video/webm': 'WEBM',
      'audio/mpeg': 'MP3',
      'audio/wav': 'WAV',
      'audio/mp4': 'M4A',
      'audio/ogg': 'OGG',
      'text/plain': 'TXT',
      'text/csv': 'CSV',
      'application/csv': 'CSV',
      'application/dicom': 'DICOM',
    }
    return mimeLabels[mimeType] ?? mimeType.split('/')[1]?.toUpperCase() ?? 'ARCHIVO'
  }

  const getFileType = (mimeType: string | null): 'pdf' | 'image' | 'video' | 'audio' | 'office' | 'text' | 'dicom' | 'other' => {
    if (!mimeType) return 'other'
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType === 'application/dicom') return 'dicom'
    // Some browsers report .dcm as octet-stream; detect by stored filename extension
    if (mimeType === 'application/octet-stream' && document.title?.toLowerCase().endsWith('.dcm')) return 'dicom'
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (
      mimeType.includes('msword') ||
      mimeType.includes('wordprocessingml') ||
      mimeType.includes('ms-excel') ||
      mimeType.includes('spreadsheetml') ||
      mimeType.includes('ms-powerpoint') ||
      mimeType.includes('presentationml')
    ) return 'office'
    if (mimeType.startsWith('text/') || mimeType.includes('csv')) return 'text'
    return 'other'
  }

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getCategoryIcon = (category: string) => {
    const cls = 'w-5 h-5'
    switch (category) {
      case 'radiology':    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
      case 'prescription': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      case 'history':      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      case 'lab':          return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
      case 'insurance':    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
      default:             return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
    }
  }

  const notesList = parseNotes(document.notes)
  const fileType  = getFileType(document.mime_type)

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:gap-4">

        {/* ══ HEADER ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 px-5 sm:px-7 pt-5 pb-5 sm:pb-6">
          {/* Back */}
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors mb-2 group py-3 pr-4 -ml-1 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Documentos
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            {/* Left: icon + title + badges */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${getCategoryBg(document.category)}`}>
                <span className={`[&>svg]:w-5 [&>svg]:h-5 ${getCategoryText(document.category)}`}>
                  {getCategoryIcon(document.category)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight line-clamp-2 mb-2">
                  {document.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${getCategoryColor(document.category)}`}>
                    {getCategoryLabel(document.category)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    {document.external_url ? <Link2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {document.external_url ? 'ENLACE' : getMimeLabel(document.mime_type)}
                  </span>
                  {document.file_size && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(document.file_size)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {formatDate(document.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2.5 flex-wrap md:flex-nowrap md:flex-shrink-0">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-50 text-primary font-semibold hover:bg-gray-100 transition-colors text-sm"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Compartir</span>
              </button>
              {document.external_url ? (
                <a
                  href={document.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-teal-400 text-white font-semibold shadow-sm shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir enlace
                </a>
              ) : (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-teal-400 text-white font-semibold shadow-sm shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <DropdownMenu open={menuOpen} onClose={() => setMenuOpen(false)} onAction={handleMenuAction} />
              </div>
            </div>
          </div>
        </div>

        {/* ══ CONTENT GRID ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 items-start">

          {/* Viewer — 3 cols (desktop) / full width (mobile, shown first) */}
          <div className="lg:col-span-3 order-1 lg:order-1">
            {document.external_url ? (
              <div className="relative overflow-hidden bg-gray-50 rounded-3xl flex flex-col items-center justify-center gap-5 py-20 px-8 text-center">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#33C7BE,_transparent)] pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Estudio en plataforma externa</p>
                  <p className="text-sm text-gray-500 max-w-xs break-all">{document.external_url}</p>
                </div>
                <a
                  href={document.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir estudio
                </a>
              </div>
            ) : fileUrl ? (
              <DocumentViewer
                fileUrl={fileUrl}
                fileType={fileType}
                title={document.title}
                mimeType={document.mime_type ?? undefined}
              />
            ) : loadError ? (
              <div className="relative overflow-hidden bg-gray-50 rounded-3xl flex flex-col items-center justify-center gap-4 py-20 px-8 text-center">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#33C7BE,_transparent)] pointer-events-none" />
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center relative z-10">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">No se pudo cargar el documento</p>
                  <p className="text-sm text-gray-500">El enlace seguro expiró o no tienes permisos.</p>
                </div>
                <button
                  onClick={() => loadDocumentData(id!)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="relative overflow-hidden bg-gray-50 rounded-3xl flex flex-col items-center justify-center gap-3 py-20">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#33C7BE,_transparent)] pointer-events-none" />
                <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
                <p className="font-semibold text-gray-900 text-sm relative z-10">Cargando documento...</p>
              </div>
            )}
          </div>

          {/* Sidebar — 1 col (desktop: sticky right; mobile: collapsible below viewer) */}
          <div className="lg:col-span-1 order-2 lg:order-2 lg:sticky lg:top-4">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Mobile collapse toggle */}
              <button
                className="lg:hidden w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setSidebarOpen(v => !v)}
              >
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Información y notas
                  {notesList.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                      {notesList.length}
                    </span>
                  )}
                </span>
                {sidebarOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Content: always visible on desktop, collapsible on mobile */}
              <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                  <TabBtn active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={<Info className="w-4 h-4" />}>
                    Información
                  </TabBtn>
                  <TabBtn active={activeTab === 'notas'} onClick={() => setActiveTab('notas')} icon={<StickyNote className="w-4 h-4" />}>
                    Notas
                    {notesList.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                        {notesList.length}
                      </span>
                    )}
                  </TabBtn>
                </div>

                {/* Info panel */}
                {activeTab === 'info' && (
                  <div className="p-5 sm:p-6 space-y-8">
                    {/* Document Details */}
                    <div>
                      <h3 className="font-bold text-gray-900 text-base mb-5">Detalles del documento</h3>
                      <div className="space-y-5">
                        <MetaRow icon={<Tag className="w-4 h-4" />} label="Categoría">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(document.category)}`}>
                            {getCategoryLabel(document.category)}
                          </span>
                        </MetaRow>
                        <MetaRow icon={<FileText className="w-4 h-4" />} label="Formato">
                          <span className="text-sm font-semibold text-gray-900">{getMimeLabel(document.mime_type)}</span>
                        </MetaRow>
                        <MetaRow icon={<HardDrive className="w-4 h-4" />} label="Tamaño">
                          <span className="text-sm font-semibold text-gray-900">{formatFileSize(document.file_size)}</span>
                        </MetaRow>
                        <MetaRow icon={<CalendarDays className="w-4 h-4" />} label="Fecha de subida">
                          <span className="text-sm font-semibold text-gray-900">{formatDate(document.created_at)}</span>
                        </MetaRow>
                        <MetaRow icon={<Clock className="w-4 h-4" />} label="Última modificación">
                          <span className="text-sm font-semibold text-gray-900">{formatDate(document.updated_at)}</span>
                        </MetaRow>
                        <MetaRow icon={<FolderOpen className="w-4 h-4" />} label="Carpeta">
                          {document.folder_id
                            ? <span className="text-sm text-primary font-semibold cursor-pointer hover:underline">Ver carpeta</span>
                            : <span className="text-sm text-gray-400">Sin carpeta</span>
                          }
                        </MetaRow>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="pt-5 border-t border-gray-100 space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Acciones</p>
                      <QuickAction icon={<Edit className="w-4 h-4" />} onClick={() => handleMenuAction('Renombrar')}>
                        Renombrar
                      </QuickAction>
                      <QuickAction icon={<FolderOpen className="w-4 h-4" />} onClick={() => handleMenuAction('Mover a carpeta')}>
                        Mover a carpeta
                      </QuickAction>
                      <QuickAction icon={<Trash2 className="w-4 h-4" />} onClick={() => handleMenuAction('Eliminar')} danger>
                        Eliminar documento
                      </QuickAction>
                    </div>
                  </div>
                )}

                {/* Notes panel */}
                {activeTab === 'notas' && (
                  <NotesPanel
                    notes={notesList}
                    onAddNote={handleAddNote}
                    onAskAI={handleAskAI}
                    isAskingAI={isAskingAI}
                    embedded
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={document.title}
        ownerId={user?.id || ''}
        documentId={document.id}
        onShare={handleShareSubmit}
      />
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

// ── Sub-components ──────────────────────────────────────────

function DropdownMenu({ open, onClose, onAction }: { open: boolean; onClose: () => void; onAction: (a: string) => void }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40">
        <MenuItem icon={<Edit className="w-4 h-4 text-gray-400" />} onClick={() => onAction('Renombrar')}>Renombrar</MenuItem>
        <MenuItem icon={<FolderOpen className="w-4 h-4 text-gray-400" />} onClick={() => onAction('Mover a carpeta')}>Mover a carpeta</MenuItem>
        <div className="h-px bg-gray-100 my-1 mx-3" />
        <MenuItem icon={<Trash2 className="w-4 h-4" />} onClick={() => onAction('Eliminar')} danger>Eliminar documento</MenuItem>
      </div>
    </>
  )
}

function MenuItem({ icon, onClick, danger, children }: { icon: React.ReactNode; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      {icon}{children}
    </button>
  )
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold transition-all ${
        active
          ? 'text-primary border-b-2 border-primary bg-primary/5'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50 border-b-2 border-transparent'
      }`}
    >
      {icon}{children}
    </button>
  )
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-primary/70">
        {icon}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

function QuickAction({ icon, onClick, danger, children }: { icon: React.ReactNode; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm transition-colors ${
        danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className={danger ? 'text-red-400' : 'text-gray-300'}>{icon}</span>
      {children}
    </button>
  )
}
