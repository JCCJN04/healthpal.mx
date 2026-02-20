// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'

type Document = Database['public']['Tables']['documents']['Row']
type Folder = {
  id: string
  owner_id: string
  parent_id: string | null
  name: string
  color: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}

type Profile = Database['public']['Tables']['profiles']['Row']
type DocumentShare = Database['public']['Tables']['document_shares']['Row']

/**
 * Get documents for current user
 */
export async function getUserDocuments(userId: string, folderId: string | null = null): Promise<Document[]> {
  try {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('owner_id', userId)

    if (folderId) {
      query = query.eq('folder_id', folderId)
    } else {
      // In the root level, only show documents that don't belong to any folder
      query = query.is('folder_id', null)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.error('getUserDocuments', error)
      return []
    }

    const cleaned = (data || []).filter((doc) => {
      // Avoid counting imported copies where the owner was reassigned but uploader differs
      if (doc.owner_id === userId && doc.uploaded_by && doc.uploaded_by !== userId) return false
      return true
    })

    // Deduplicate by id in case of legacy duplicates
    const map = new Map<string, Document>()
    cleaned.forEach((doc) => map.set(doc.id, doc))

    return Array.from(map.values())
  } catch (err) {
    logger.error('getUserDocuments', err)
    return []
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId: string): Promise<Document | null> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle()

    if (error) {
      logger.error('getDocumentById', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('getDocumentById', err)
    return null
  }
}

/**
 * List incoming shares for a user with minimal profile info of sender and document payload.
 */
export async function getDocumentsSharedWithMe(userId: string) {
  try {
    const { data, error } = await supabase
      .from('document_shares')
      .select(`
        id,
        created_at,
        shared_by,
        shared_with,
        document_id,
        document:documents (*),
        sender:profiles!document_shares_shared_by_fkey (id, full_name, email)
      `)
      .eq('shared_with', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('getDocumentsSharedWithMe', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('getDocumentsSharedWithMe', err)
    return []
  }
}

/**
 * Upload document to Supabase Storage
 */
export async function uploadDocument(
  file: File,
  userId: string,
  metadata: {
    title: string
    category: Database['public']['Enums']['doc_category']
    notes?: string
    folderId?: string | null
  }
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // Generate document ID
    const documentId = crypto.randomUUID()
    const fileExt = file.name.split('.').pop()
    const fileName = `${documentId}.${fileExt}`
    const filePath = `${userId}/${documentId}/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      logger.error('uploadDocument.storage', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Create document record
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        owner_id: userId,
        patient_id: userId,
        uploaded_by: userId,
        title: metadata.title,
        category: metadata.category,
        file_path: filePath,
        mime_type: file.type,
        file_size: file.size,
        notes: metadata.notes || null,
        folder_id: metadata.folderId || null,
      })

    if (dbError) {
      logger.error('uploadDocument.db', dbError)
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath])
      return { success: false, error: dbError.message }
    }

    return { success: true, documentId }
  } catch (err) {
    logger.error('uploadDocument', err)
    return { success: false, error: 'Error inesperado al subir el documento' }
  }
}

/**
 * Delete document
 */
export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.debug('deleteDocument initiated')

    // Get document to find file path and verify ownership
    const document = await getDocumentById(documentId)
    if (!document) {
      return { success: false, error: 'Documento no encontrado' }
    }

    if (document.owner_id !== userId) {
      logger.warn('Document ownership violation detected')
      return { success: false, error: 'No tienes permiso para eliminar este documento' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      logger.error('deleteDocument.storage', storageError)
    }

    // Delete from database with explicit owner check
    const { error: dbError, count } = await supabase
      .from('documents')
      .delete({ count: 'exact' })
      .eq('id', documentId)
      .eq('owner_id', userId)

    if (dbError) {
      logger.error('deleteDocument.db', dbError)
      return { success: false, error: dbError.message }
    }

    if (count === 0) {
      logger.warn('deleteDocument: RLS rejected deletion')
      return { success: false, error: 'No se pudo eliminar el documento' }
    }

    return { success: true }
  } catch (err) {
    logger.error('deleteDocument', err)
    return { success: false, error: 'Error inesperado al eliminar el documento' }
  }
}

/**
 * Get folders for current user
 */
export async function getFolders(userId: string, parentId: string | null = null): Promise<Folder[]> {
  try {
    let query = supabase
      .from('folders')
      .select('*')
      .eq('owner_id', userId)

    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else {
      query = query.is('parent_id', null)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
      logger.error('getFolders', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('getFolders', err)
    return []
  }
}

/**
 * Create a new folder
 */
export async function createFolder(
  name: string,
  userId: string,
  parentId: string | null = null
): Promise<{ success: boolean; folderId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        owner_id: userId,
        parent_id: parentId,
      })
      .select()
      .single()

    if (error) {
      logger.error('createFolder', error)
      return { success: false, error: error.message }
    }

    return { success: true, folderId: data.id }
  } catch (err) {
    logger.error('createFolder', err)
    return { success: false, error: 'Error al crear la carpeta' }
  }
}

/**
 * Delete a folder
 */
export async function deleteFolder(folderId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error, count } = await supabase
      .from('folders')
      .delete({ count: 'exact' })
      .eq('id', folderId)
      .eq('owner_id', userId)

    if (error) {
      logger.error('deleteFolder', error)
      return { success: false, error: error.message }
    }

    if (count === 0) {
      return { success: false, error: 'No se pudo eliminar la carpeta' }
    }

    return { success: true }
  } catch (err) {
    logger.error('deleteFolder', err)
    return { success: false, error: 'Error al eliminar la carpeta' }
  }
}

/**
 * Update a folder (rename)
 */
export async function updateFolder(
  folderId: string,
  userId: string,
  data: { name?: string; color?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('folders')
      .update(data)
      .eq('id', folderId)
      .eq('owner_id', userId)

    if (error) {
      logger.error('updateFolder', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    logger.error('updateFolder', err)
    return { success: false, error: 'Error al actualizar la carpeta' }
  }
}

/**
 * Update a document (rename, move, notes)
 */
export async function updateDocument(
  documentId: string,
  userId: string,
  data: { title?: string; notes?: string; folder_id?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('documents')
      .update(data)
      .eq('id', documentId)
      .eq('owner_id', userId)

    if (error) {
      logger.error('updateDocument', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    logger.error('updateDocument', err)
    return { success: false, error: 'Error al actualizar el documento' }
  }
}

/**
 * Ensure a folder exists for incoming shares from a sender. Returns folder id.
 */
export async function ensureSharedFolderForSender(
  ownerId: string,
  sender: { full_name?: string | null; email?: string | null; id: string }
): Promise<string | null> {
  const folderName = `Compartido de ${sender.full_name || sender.email || sender.id}`

  try {
    // Lookup
    const { data: existing, error: findError } = await supabase
      .from('folders')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('name', folderName)
      .maybeSingle()

    if (!findError && existing?.id) {
      return existing.id
    }

    // Create
    const { data, error } = await supabase
      .from('folders')
      .insert({ owner_id: ownerId, name: folderName, parent_id: null })
      .select('id')
      .single()

    if (error) {
      logger.warn('ensureSharedFolderForSender: folder creation failed')
      return null
    }

    return data.id
  } catch (err) {
    logger.error('ensureSharedFolderForSender', err)
    return null
  }
}

/**
 * Copy a shared document into recipient ownership (metadata reuse, storage path reused).
 */
export async function importSharedDocument(
  share: { document: Document; sender: { id: string; full_name?: string | null; email?: string | null } },
  recipientId: string
): Promise<{ success: boolean; created?: boolean; documentId?: string; error?: string }> {
  try {
    const sharedDoc = share.document

    if (!sharedDoc) {
      logger.warn('importSharedDocument: missing document payload')
      return { success: false, error: 'Documento compartido no disponible' }
    }

    if (!sharedDoc.file_path) {
      logger.warn('importSharedDocument: document has no file_path')
      return { success: false, error: 'Documento sin archivo asociado' }
    }

    // Skip if already imported (same title uploaded_by sender)
    const { data: existingDoc, error: lookupErr } = await supabase
      .from('documents')
      .select('id')
      .eq('owner_id', recipientId)
      .eq('uploaded_by', share.sender.id)
      .eq('title', sharedDoc.title)
      .maybeSingle()

    if (!lookupErr && existingDoc?.id) {
      return { success: true, created: false, documentId: existingDoc.id }
    }

    const folderId = await ensureSharedFolderForSender(recipientId, share.sender)

    const newId = crypto.randomUUID()
    const fileName = sharedDoc.file_path.split('/').pop() || `${sharedDoc.id}.bin`
    const targetPath = `${recipientId}/${newId}/${fileName}`

    // Try to copy in storage (owner path -> recipient path)
    let copied = false
    let finalPath = sharedDoc.file_path
    const copyResult = await supabase.storage.from('documents').copy(sharedDoc.file_path, targetPath)
    if (!copyResult.error) {
      copied = true
      finalPath = targetPath
    } else {
      logger.warn('importSharedDocument: storage copy failed, trying fallback')
      const download = await supabase.storage.from('documents').download(sharedDoc.file_path)
      if (!download.error && download.data) {
        const upload = await supabase.storage.from('documents').upload(targetPath, download.data)
        if (!upload.error) {
          copied = true
          finalPath = targetPath
        } else {
          logger.error('importSharedDocument.uploadFallback', upload.error)
        }
      } else {
        logger.error('importSharedDocument.download', download.error)
      }
    }

    if (!copied) {
      logger.warn('importSharedDocument: proceeding without storage copy')
      finalPath = sharedDoc.file_path
    }

    const { error } = await supabase
      .from('documents')
      .insert({
        id: newId,
        owner_id: recipientId,
        patient_id: sharedDoc.patient_id || share.sender.id,
        uploaded_by: share.sender.id,
        title: sharedDoc.title,
        category: sharedDoc.category,
        file_path: finalPath,
        mime_type: sharedDoc.mime_type,
        file_size: sharedDoc.file_size,
        notes: sharedDoc.notes,
        folder_id: folderId,
      })

    if (error) {
      logger.error('importSharedDocument', error)
      return { success: false, error: error.message }
    }

    return { success: true, created: true, documentId: newId }
  } catch (err) {
    logger.error('importSharedDocument', err)
    return { success: false, error: 'No se pudo importar el documento compartido' }
  }
}

/**
 * Process all shares for a user, importing them into their library if missing.
 */
export async function syncSharedDocumentsIntoLibrary(userId: string) {
  // Copy-based import disabled for "just shared" model. Keep for backward compatibility return shape.
  return []
}

/**
 * Find a profile by email (case-insensitive). Returns first match.
 */
export async function findProfileByEmail(email: string): Promise<Profile | null> {
  try {
    logger.debug('findProfileByEmail initiated')
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .ilike('email', email)
      .maybeSingle()

    if (error) {
      logger.error('findProfileByEmail', error)
      return null
    }

    logger.debug('findProfileByEmail complete')
    return data
  } catch (err) {
    logger.error('findProfileByEmail', err)
    return null
  }
}

/**
 * Share a document with a target user (by userId or email lookup).
 */
export async function shareDocumentWithUser(
  documentId: string,
  sharedById: string,
  target: { userId?: string; email?: string },
  opts?: { document?: Document; senderProfile?: { full_name?: string | null; email?: string | null } }
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.debug('shareDocumentWithUser initiated')
    let targetUserId = target.userId || null

    if (!targetUserId && target.email) {
      const profile = await findProfileByEmail(target.email)
      if (!profile?.id) {
        return { success: false, error: 'No encontramos un usuario con ese correo' }
      }
      targetUserId = profile.id
    }

    if (!targetUserId) {
      return { success: false, error: 'Debes especificar un usuario de destino' }
    }

    // Avoid duplicate shares
    const { data: existing, error: existingError } = await supabase
      .from('document_shares')
      .select('id')
      .eq('document_id', documentId)
      .eq('shared_with', targetUserId)
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') {
      logger.error('shareDocumentWithUser.check', existingError)
      return { success: false, error: existingError.message }
    }

    if (existing) {
      logger.debug('shareDocumentWithUser: already shared')
      return { success: true }
    }

    const { error } = await supabase
      .from('document_shares')
      .insert({ document_id: documentId, shared_by: sharedById, shared_with: targetUserId })

    if (error) {
      logger.error('shareDocumentWithUser', error)
      return { success: false, error: error.message }
    }

    // Try to import immediately into recipient library (copy path)
    const senderMeta = {
      id: sharedById,
      full_name: opts?.senderProfile?.full_name,
      email: opts?.senderProfile?.email,
    }

    logger.debug('shareDocumentWithUser: success')
    return { success: true }
  } catch (err) {
    logger.error('shareDocumentWithUser', err)
    return { success: false, error: 'No se pudo compartir el documento' }
  }
}

/**
 * Revoke a document share
 */
export async function revokeDocumentShare(
  documentId: string,
  sharedById: string,
  sharedWithId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error, count } = await supabase
      .from('document_shares')
      .delete({ count: 'exact' })
      .eq('document_id', documentId)
      .eq('shared_by', sharedById)
      .eq('shared_with', sharedWithId)

    if (error) {
      logger.error('revokeDocumentShare', error)
      return { success: false, error: error.message }
    }

    if ((count || 0) === 0) {
      return { success: false, error: 'No se encontró la relación a revocar' }
    }

    return { success: true }
  } catch (err) {
    logger.error('revokeDocumentShare', err)
    return { success: false, error: 'No se pudo revocar el acceso' }
  }
}

/**
 * List users a document is shared with
 */
export async function listDocumentShares(documentId: string) {
  try {
    const { data, error } = await supabase
      .from('document_shares')
      .select('id, shared_with, created_at, profiles:profiles!document_shares_shared_with_fkey(id, full_name, email, role)')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('listDocumentShares', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('listDocumentShares', err)
    return []
  }
}

/**
 * Global search across documents the current user can access
 */
export async function searchDocuments(term: string, userId: string, limit = 30): Promise<Document[]> {
  if (!term.trim() || !userId) return []

  try {
    const [ownDocs, sharedRaw] = await Promise.all([
      getUserDocuments(userId, null),
      getDocumentsSharedWithMe(userId)
    ])

    const sharedDocs = (sharedRaw as any[])
      .map((s) => (s as any).document as Document)
      .filter(Boolean)

    // Merge own + shared and dedupe by id
    const mergedMap = new Map<string, Document>()
    ownDocs.forEach((doc) => mergedMap.set(doc.id, doc))
    sharedDocs.forEach((doc) => mergedMap.set(doc.id, doc))

    const termLower = term.trim().toLowerCase()

    const filtered = Array.from(mergedMap.values()).filter((doc) => {
      const titleMatch = doc.title?.toLowerCase().includes(termLower)
      const notesMatch = doc.notes?.toLowerCase().includes(termLower)
      const categoryMatch = doc.category?.toLowerCase().includes(termLower)

      return Boolean(titleMatch || notesMatch || categoryMatch)
    })

    return filtered.slice(0, limit)
  } catch (err) {
    logger.error('searchDocuments', err)
    return []
  }
}

/**
 * Get download URL for document
 */
/**
 * Download document file directly (forces download)
 */
export async function downloadDocumentFile(filePath: string, fileName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (error) {
      logger.error('downloadDocumentFile', error)
      return { success: false, error: error.message }
    }

    // Create blob URL and force download
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true }
  } catch (err) {
    logger.error('downloadDocumentFile', err)
    return { success: false, error: 'Error al descargar el archivo' }
  }
}

/**
 * Get download URL for document (for preview/viewing)
 */
export async function getDocumentDownloadUrl(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) {
      logger.error('getDocumentDownloadUrl', error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    logger.error('getDocumentDownloadUrl', err)
    return null
  }
}
