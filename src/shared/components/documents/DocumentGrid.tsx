import { ShieldCheck } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
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

const listStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
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
  showSecurityFooter?: boolean
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
  showSecurityFooter = false,
}: DocumentGridProps) => {
  if (documents.length === 0 && folders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Esta carpeta está vacía.</p>
      </div>
    )
  }

  const sharedFolders = folders.filter((f) => f.id.startsWith('shared-'))
  const ownFolders = folders.filter((f) => !f.id.startsWith('shared-'))

  return (
    <div className="space-y-8">
      {/* Shared (doctor/patient) folders — clinical dossier cards */}
      {sharedFolders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 mb-1">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">
              {sharedFolders.some((f) => f.subtitle) ? 'Mis Médicos' : 'Expedientes de Pacientes'}
            </h2>
            <span className="text-xs font-bold text-[#33C7BE] bg-teal-50 border border-teal-100/80 px-2.5 py-0.5 rounded-full">
              {sharedFolders.length}
            </span>
          </div>
          <motion.div
            variants={listStagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1"
          >
            {sharedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={onFolderClick}
                onDelete={onDeleteFolder}
                onRename={onRenameFolder}
                onDropDocument={
                  onMoveDocument && !folder.id.startsWith('shared-')
                    ? (docId) => onMoveDocument(docId, folder.id)
                    : undefined
                }
                onShare={onShareFolder}
              />
            ))}
          </motion.div>
        </div>
      )}

      {/* Own folders — horizontal cards */}
      {ownFolders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 mb-1">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Carpetas</h2>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {ownFolders.length}
            </span>
          </div>
          <motion.div
            variants={listStagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {ownFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={onFolderClick}
                onDelete={onDeleteFolder}
                onRename={onRenameFolder}
                onDropDocument={
                  onMoveDocument ? (docId) => onMoveDocument(docId, folder.id) : undefined
                }
                onShare={onShareFolder}
              />
            ))}
          </motion.div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">
            Documentos
          </h2>
          <motion.div
            variants={listStagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {documents.map((document) => (
              <motion.div key={document.id} variants={fadeUpVariant}>
                <DocumentCard
                  document={document}
                  onDelete={onDeleteDocument}
                  onDragStart={
                    onMoveDocument
                      ? (docId, e) => {
                          const payload = JSON.stringify({ docId })
                          e.dataTransfer.setData('application/healthpal-doc', payload)
                          e.dataTransfer.setData('text/plain', payload)
                        }
                      : undefined
                  }
                  isMoving={movingDocId === document.id}
                  onShare={onShareDocument}
                  onPreview={onPreviewDocument}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Security footer */}
      {showSecurityFooter && (documents.length > 0 || folders.length > 0) && (
        <div className="mt-6 p-5 rounded-3xl bg-primary/5 flex flex-col sm:flex-row items-center gap-4 border border-primary/10">
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Tus datos médicos están encriptados</h4>
            <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
              HealthPal usa encriptación AES-256 para asegurar que tus expedientes de salud sean
              privados y accesibles solo para ti y tu personal médico autorizado.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
