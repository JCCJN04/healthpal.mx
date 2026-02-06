import { DocumentCard } from './DocumentCard'
import type { Database } from '../types/database'

type Document = Database['public']['Tables']['documents']['Row']

interface DocumentGridProps {
  documents: Document[]
  onDelete: (documentId: string) => void
}

export const DocumentGrid = ({ documents, onDelete }: DocumentGridProps) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No se encontraron documentos.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
