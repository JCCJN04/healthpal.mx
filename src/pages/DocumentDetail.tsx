import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Share2,
  Heart,
  MoreVertical,
  FolderOpen,
  Edit,
  Trash2
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { DocumentViewer } from '../components/DocumentViewer'
import { NotesPanel } from '../components/NotesPanel'
import { ShareModal } from '../components/ShareModal'
import { getDocumentById } from '../mock/documentDetail'

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  // Get document data
  const document = id ? getDocumentById(id) : undefined

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

  // Initialize favorite state from document
  if (document.isFavorite !== isFavorite) {
    setIsFavorite(document.isFavorite)
  }

  const handleBack = () => {
    navigate(-1)
  }

  const handleDownload = () => {
    console.log('Descargar documento:', document.title)
    // TODO: Implement actual download
  }

  const handleShare = () => {
    setShareModalOpen(true)
  }

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite)
    console.log('Toggle favorite:', document.id, !isFavorite)
  }

  const handleMenuAction = (action: string) => {
    console.log(`${action} documento:`, document.id)
    setMenuOpen(false)
    // TODO: Implement actions
  }

  const handleAddNote = (content: string) => {
    console.log('Nueva nota:', content)
    // TODO: Add note to document
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Recetas':
        return 'bg-purple-100 text-purple-700'
      case 'Radiografías':
        return 'bg-blue-100 text-blue-700'
      case 'Estudios':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
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
              <button
                onClick={handleToggleFavorite}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFavorite
                      ? 'fill-red-500 text-red-500'
                      : 'text-gray-600 hover:text-red-500'
                  }`}
                />
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
                className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getCategoryColor(
                  document.category
                )}`}
              >
                {document.category}
              </span>

              {/* Date */}
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                {document.date}
              </span>

              {/* Owner */}
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#33C7BE] to-[#2bb5ad] flex items-center justify-center text-white text-xs font-semibold">
                    {document.ownerInitial}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    {document.ownerName}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {document.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Document Viewer (70%) */}
          <div className="lg:col-span-2">
            <DocumentViewer
              fileUrl={document.fileUrl}
              fileType={document.fileType}
              title={document.title}
            />
          </div>

          {/* Right: Notes Panel (30%) */}
          <div className="lg:col-span-1">
            <NotesPanel notes={document.notes} onAddNote={handleAddNote} />
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        documentTitle={document.title}
      />
    </DashboardLayout>
  )
}
