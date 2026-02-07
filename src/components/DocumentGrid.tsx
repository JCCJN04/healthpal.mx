import { DocumentCard } from './DocumentCard'
import { FolderCard } from './FolderCard'
import type { Database } from '../types/database'

type Document = Database['public']['Tables']['documents']['Row']
type Folder = {
  id: string
  name: string
  color: string
  created_at: string
}

interface DocumentGridProps {
  documents: Document[]
  folders: Folder[]
  onDeleteDocument: (documentId: string) => void
  onDeleteFolder: (folderId: string) => void
  onFolderClick: (folderId: string, folderName: string) => void
  onRenameFolder: (folderId: string, currentName: string) => void
}

export const DocumentGrid = ({
  documents,
  folders,
  onDeleteDocument,
  onDeleteFolder,
  onFolderClick,
  onRenameFolder
}: DocumentGridProps) => {
  if (documents.length === 0 && folders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Esta carpeta está vacía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Carpetas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={onFolderClick}
                onDelete={onDeleteFolder}
                onRename={onRenameFolder}
              />
            ))}
          </div>
        </div>
      )}

      {/* Documents Section */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Documentos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDelete={onDeleteDocument}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
