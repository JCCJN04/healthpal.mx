import { 
  FileArchive, 
  FileSpreadsheet, 
  Presentation, 
  FileImage,
  File as FileIcon,
  MoreVertical,
  Download,
  Trash2,
  Eye
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { getDocumentDownloadUrl } from '../lib/queries/documents'
import type { Database } from '../types/database'

type Document = Database['public']['Tables']['documents']['Row']

interface DocumentsTableProps {
  documents: Document[]
  onDelete: (documentId: string) => void
}

const getFileIcon = (mimeType: string | null) => {
  const iconProps = { size: 20, className: 'text-gray-600' }
  
  if (!mimeType) return <FileIcon {...iconProps} />
  
  if (mimeType.includes('zip')) {
    return <FileArchive {...iconProps} className="text-purple-600" />
  } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet {...iconProps} className="text-green-600" />
  } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <Presentation {...iconProps} className="text-orange-600" />
  } else if (mimeType.includes('image')) {
    return <FileImage {...iconProps} className="text-blue-600" />
  } else if (mimeType.includes('pdf')) {
    return <FileIcon {...iconProps} className="text-red-600" />
  } else {
    return <FileIcon {...iconProps} />
  }
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-'
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
  return `${mb.toFixed(2)} MB`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const DocumentRow = ({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleDownload = async () => {
    const url = await getDocumentDownloadUrl(doc.file_path)
    if (url) {
      window.open(url, '_blank')
    }
    setMenuOpen(false)
  }

  const handleDelete = () => {
    onDelete(doc.id)
    setMenuOpen(false)
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 md:py-4 px-3 md:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex-shrink-0">
            {getFileIcon(doc.mime_type)}
          </div>
          <button
            onClick={() => navigate(`/dashboard/documentos/${doc.id}`)}
            className="text-xs md:text-sm text-gray-900 font-medium hover:text-[#33C7BE] transition-colors text-left truncate"
          >
            {doc.title}
          </button>
        </div>
      </td>
      <td className="py-3 md:py-4 px-3 md:px-6 text-center hidden md:table-cell">
        <span className="text-sm text-gray-600">{formatDate(doc.created_at)}</span>
      </td>
      <td className="py-3 md:py-4 px-3 md:px-6 text-center hidden lg:table-cell">
        <span className="text-xs md:text-sm text-gray-600">{formatFileSize(doc.file_size)}</span>
      </td>
      <td className="py-3 md:py-4 px-3 md:px-6 text-right relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          <MoreVertical size={18} />
        </button>
        
        {menuOpen && (
          <>
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-6 top-12 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <button
                onClick={() => {
                  navigate(`/dashboard/documentos/${doc.id}`)
                  setMenuOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Eye size={16} />
                Ver
              </button>
              <button
                onClick={handleDownload}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Descargar
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </>
        )}
      </td>
    </tr>
  )
}

export default function DocumentsTable({ documents, onDelete }: DocumentsTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 md:py-4 px-3 md:px-6 text-xs md:text-sm font-semibold text-gray-700">
                Nombre
              </th>
              <th className="text-center py-3 md:py-4 px-3 md:px-6 text-xs md:text-sm font-semibold text-gray-700 hidden md:table-cell">
                Fecha
              </th>
              <th className="text-center py-3 md:py-4 px-3 md:px-6 text-xs md:text-sm font-semibold text-gray-700 hidden lg:table-cell">
                Tamaño
              </th>
              <th className="text-right py-3 md:py-4 px-3 md:px-6 text-xs md:text-sm font-semibold text-gray-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
