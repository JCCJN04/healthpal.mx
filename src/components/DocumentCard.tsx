import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, FileText, Activity, Pill, Download, Trash2, Eye, Microscope, ShieldCheck, FolderOpen } from 'lucide-react'
import { getDocumentDownloadUrl } from '../lib/queries/documents'
import type { Database } from '../types/database'

type Document = Database['public']['Tables']['documents']['Row']
type DocCategory = Database['public']['Enums']['doc_category']

interface DocumentCardProps {
  document: Document
  onDelete: (documentId: string) => void
}

const getIcon = (category: DocCategory) => {
  switch (category) {
    case 'prescription':
      return <Pill className="w-5 h-5" />
    case 'radiology':
      return <Activity className="w-5 h-5" />
    case 'lab':
      return <Microscope className="w-5 h-5" />
    case 'insurance':
      return <ShieldCheck className="w-5 h-5" />
    case 'history':
      return <FileText className="w-5 h-5" />
    default:
      return <FolderOpen className="w-5 h-5" />
  }
}

const CATEGORY_LABELS: Record<DocCategory, string> = {
  radiology: 'Radiología',
  prescription: 'Recetas',
  history: 'Historial',
  lab: 'Laboratorio',
  insurance: 'Seguros',
  other: 'Otros',
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
  return `${mb.toFixed(1)} MB`
}

export const DocumentCard = ({ document, onDelete }: DocumentCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleAbrir = () => {
    navigate(`/dashboard/documentos/${document.id}`)
  }

  const handleDownload = async () => {
    const url = await getDocumentDownloadUrl(document.file_path)
    if (url) {
      window.open(url, '_blank')
    }
    setMenuOpen(false)
  }

  const handleDelete = () => {
    onDelete(document.id)
    setMenuOpen(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 overflow-hidden group">
      {/* Header with category color */}
      <div className="h-32 bg-gradient-to-br from-[#33C7BE] to-[#2bb5ad] relative">
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
            {formatFileSize(document.file_size)}
          </span>
        </div>
      </div>

      {/* Card content */}
      <div className="p-4 md:p-6">
        {/* Icon and title row */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#33C7BE] flex items-center justify-center text-white flex-shrink-0">
            {getIcon(document.category)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1 truncate">
              {document.title}
            </h3>
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
              <span>{CATEGORY_LABELS[document.category]}</span>
              <span className="text-gray-300">•</span>
              <span>{formatDate(document.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Notes/Description */}
        {document.notes && (
          <p className="text-xs md:text-sm text-gray-600 mb-4 line-clamp-2">
            {document.notes}
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button
            onClick={handleAbrir}
            className="text-xs md:text-sm font-semibold text-[#33C7BE] hover:text-[#2bb5ad] transition-colors uppercase tracking-wide"
          >
            ABRIR
          </button>

          {/* Kebab menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={handleAbrir}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Eye size={16} />
                    Ver
                  </button>
                  <button
                    onClick={handleDownload}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Descargar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
