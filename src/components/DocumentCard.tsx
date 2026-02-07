import { useState, useEffect } from 'react'
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPreview = async () => {
      // Only try to preview images or PDFs (if we want to try)
      // For now, let's at least get the URL if it exists
      if (document.file_path) {
        const url = await getDocumentDownloadUrl(document.file_path)
        setPreviewUrl(url)
      }
    }
    fetchPreview()
  }, [document.file_path])

  const handleAbrir = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log('Navegando a documento:', document.id);
    navigate(`/dashboard/documentos/${document.id}`)
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Iniciando descarga:', document.id);
    const url = await getDocumentDownloadUrl(document.file_path)
    if (url) {
      window.open(url, '_blank')
    } else {
      console.error('Error: No se pudo obtener la URL de descarga');
    }
    setMenuOpen(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Borrando documento:', document.id);
    onDelete(document.id)
    setMenuOpen(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#33C7BE]/20 group overflow-hidden flex flex-col h-full">
      {/* Header with preview or category color */}
      <div className="h-40 bg-gray-100 relative overflow-hidden flex items-center justify-center shrink-0">
        {previewUrl && (document.mime_type?.includes('image') || document.mime_type?.includes('pdf')) ? (
          document.mime_type?.includes('image') ? (
            <img
              src={previewUrl}
              alt={document.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setPreviewUrl(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
              <FileText size={48} className="text-[#33C7BE] opacity-60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#33C7BE]">PDF</span>
            </div>
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#33C7BE] via-[#4FD1C5] to-[#2bb5ad] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <div className="text-white transform group-hover:scale-110 transition-transform duration-300">
              {getIcon(document.category)}
            </div>
          </div>
        )}

        {/* Floating Category Tag */}
        <div className="absolute top-3 left-3 z-10 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-bold text-[#33C7BE] shadow-sm uppercase tracking-wide border border-white/50 shrink-0">
            {getIcon(document.category)}
            <span>{CATEGORY_LABELS[document.category]}</span>
          </div>
        </div>

        {/* Floating Size Tag */}
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-md text-[9px] font-bold text-white uppercase tracking-tighter">
            {formatFileSize(document.file_size)}
          </span>
        </div>

        {/* Quick View Overlay (Mobile & Desktop Hover) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={handleAbrir}>
          <div className="bg-white/90 backdrop-blur-md p-3 rounded-full text-[#33C7BE] shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <Eye size={20} />
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 mb-1 leading-snug line-clamp-2 hover:text-[#33C7BE] transition-colors cursor-pointer" onClick={handleAbrir} title={document.title}>
            {document.title}
          </h3>
          <p className="text-[10px] text-gray-500 font-medium">
            {formatDate(document.created_at)}
          </p>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handleAbrir}
            className="text-[10px] font-black text-[#33C7BE] hover:text-[#2bb5ad] transition-all tracking-widest uppercase py-1 px-3 border border-[#33C7BE]/20 rounded-full hover:bg-[#33C7BE]/5"
          >
            ABRIR
          </button>

          {/* Kebab menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 z-30 ring-1 ring-black ring-opacity-5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleAbrir(); }}
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
