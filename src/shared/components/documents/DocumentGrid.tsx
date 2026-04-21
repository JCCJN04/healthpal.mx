import { ShieldCheck } from 'lucide-react'
import { DocumentCard } from './DocumentCard'
import { FolderCard } from './FolderCard'
import type { Database } from '@/shared/types/database'

type Document = Database['public']['Tables']['documents']['Row']
type Folder = {
  id: string
  name: string
  color: string
  created_at: string
  avatarUrl?: string | null
  subtitle?: string | null
  docCount?: number
  hasNew?: boolean
}

interface DocumentGridProps {
  documents: Document[]
  folders: Folder[]
  onDeleteDocument: (documentId: string) => void
  onDeleteFolder: (folderId: string) => void
  onFolderClick: (folderId: string, folderName: string) => void
  onRenameFolder: (folderId: string, currentName: string) => void
  onMoveDocument?: (docId: string, folderId: string | null) => void
  movingDocId?: string | null
  onShareDocument?: (docId: string, title: string) => void
  onShareFolder?: (folderId: string, folderName: string) => void
  onPreviewDocument?: (document: Document) => void
}

export const DocumentGrid = ({
  documents,
  folders,
  onDeleteDocument,
  onDeleteFolder,
  onFolderClick,
  onRenameFolder,
  onMoveDocument,
  movingDocId,
  onShareDocument,
  onShareFolder,
  onPreviewDocument,
}: DocumentGridProps) => {
  if (documents.length === 0 && folders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Esta carpeta está vacía.</p>
      </div>
    )
  }

  const sharedFolders = folders.filter(f => f.id.startsWith('shared-'))
  const ownFolders = folders.filter(f => !f.id.startsWith('shared-'))

  return (
    <div className="space-y-8">
      {/* Shared (doctor/patient) folders — vertical profile cards */}
      {sharedFolders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">
            {sharedFolders.some(f => f.subtitle) ? 'Mis Médicos' : 'Mis Pacientes'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
            {sharedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={onFolderClick}
                onDelete={onDeleteFolder}
                onRename={onRenameFolder}
                onDropDocument={onMoveDocument && !folder.id.startsWith('shared-') ? (docId) => onMoveDocument(docId, folder.id) : undefined}
                onShare={onShareFolder}
              />
            ))}
          </div>
        </div>
      )}

      {/* Own folders — horizontal cards */}
      {ownFolders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Carpetas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ownFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={onFolderClick}
                onDelete={onDeleteFolder}
                onRename={onRenameFolder}
                onDropDocument={onMoveDocument ? (docId) => onMoveDocument(docId, folder.id) : undefined}
                onShare={onShareFolder}
              />
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Documentos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((document, index) => (
              <div
                key={document.id}
                className={index === 0 && documents.length > 1 ? 'sm:col-span-2 lg:col-span-2' : ''}
              >
                <DocumentCard
                  document={document}
                  onDelete={onDeleteDocument}
                  onDragStart={onMoveDocument ? (docId, e) => {
                    const payload = JSON.stringify({ docId })
                    e.dataTransfer.setData('application/healthpal-doc', payload)
                    e.dataTransfer.setData('text/plain', payload)
                  } : undefined}
                  isMoving={movingDocId === document.id}
                  onShare={onShareDocument}
                  onPreview={onPreviewDocument}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security footer */}
      {(documents.length > 0 || folders.length > 0) && (
        <div className="mt-6 p-5 rounded-3xl bg-primary/5 flex flex-col sm:flex-row items-center gap-4 border border-primary/10">
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Tus datos médicos están encriptados</h4>
            <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">HealthPal usa encriptación AES-256 para asegurar que tus expedientes de salud sean privados y accesibles solo para ti y tu personal médico autorizado.</p>
          </div>
        </div>
      )}
    </div>
  )
}
