// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
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
      console.error('Error fetching documents:', error)
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
    console.error('Error in getUserDocuments:', err)
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
      console.error('Error fetching document:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Error in getDocumentById:', err)
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
      console.error('Error fetching documents shared with user:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getDocumentsSharedWithMe:', err)
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
      console.error('Error uploading file:', uploadError)
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
      console.error('Error creating document record:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath])
      return { success: false, error: dbError.message }
    }

    return { success: true, documentId }
  } catch (err) {
    console.error('Error in uploadDocument:', err)
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
    console.log('Intentando eliminar documento:', documentId, 'para el usuario:', userId)

    // Get document to find file path and verify ownership
    const document = await getDocumentById(documentId)
    if (!document) {
      return { success: false, error: 'Documento no encontrado' }
    }

    if (document.owner_id !== userId) {
      console.error('Violación de propiedad detectada:', { docOwner: document.owner_id, currentUser: userId })
      return { success: false, error: 'No tienes permiso para eliminar este documento' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
    }

    // Delete from database with explicit owner check
    const { error: dbError, count } = await supabase
      .from('documents')
      .delete({ count: 'exact' })
      .eq('id', documentId)
      .eq('owner_id', userId)

    if (dbError) {
      console.error('Error deleting document record:', dbError)
      return { success: false, error: dbError.message }
    }

    if (count === 0) {
      console.warn('No se eliminó ninguna fila. Verifique permisos RLS en Supabase para el usuario:', userId)
      return { success: false, error: 'La base de datos rechazó la eliminación (posible problema de RLS)' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in deleteDocument:', err)
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
      console.error('Error fetching folders:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getFolders:', err)
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
      console.error('Error creating folder:', error)
      return { success: false, error: error.message }
    }

    return { success: true, folderId: data.id }
  } catch (err) {
    console.error('Error in createFolder:', err)
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
      console.error('Error deleting folder:', error)
      return { success: false, error: error.message }
    }

    if (count === 0) {
      return { success: false, error: 'No se pudo eliminar la carpeta' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in deleteFolder:', err)
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
      console.error('Error updating folder:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in updateFolder:', err)
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
      console.error('Error updating document:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in updateDocument:', err)
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
      console.warn('Error creating shared folder (continuing without folder):', error)
      return null
    }

    return data.id
  } catch (err) {
    console.error('Error in ensureSharedFolderForSender:', err)
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
      console.warn('[share] importSharedDocument: missing document payload, skipping')
      return { success: false, error: 'Documento compartido no disponible' }
    }

    if (!sharedDoc.file_path) {
      console.warn('[share] importSharedDocument: document has no file_path, skipping', { documentId: sharedDoc.id })
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
      console.warn('[share] storage copy failed, attempting download/upload', copyResult.error)
      const download = await supabase.storage.from('documents').download(sharedDoc.file_path)
      if (!download.error && download.data) {
        const upload = await supabase.storage.from('documents').upload(targetPath, download.data)
        if (!upload.error) {
          copied = true
          finalPath = targetPath
        } else {
          console.error('[share] upload after download failed', upload.error)
        }
      } else {
        console.error('[share] download failed', download.error)
      }
    }

    if (!copied) {
      console.warn('[share] proceeding without copy; using original path (may rely on storage read policy)', { path: sharedDoc.file_path })
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
      console.error('Error importing shared document:', error)
      return { success: false, error: error.message }
    }

    return { success: true, created: true, documentId: newId }
  } catch (err) {
    console.error('Error in importSharedDocument:', err)
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
    console.log('[share] findProfileByEmail start', { email })
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .ilike('email', email)
      .maybeSingle()

    if (error) {
      console.error('Error searching profile by email:', error)
      return null
    }

    console.log('[share] findProfileByEmail result', data)
    return data
  } catch (err) {
    console.error('Error in findProfileByEmail:', err)
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
    console.log('[share] shareDocumentWithUser start', { documentId, sharedById, target })
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
      console.error('Error checking existing share:', existingError)
      return { success: false, error: existingError.message }
    }

    if (existing) {
      console.log('[share] already shared, skip insert', existing)
      return { success: true }
    }

    const { error } = await supabase
      .from('document_shares')
      .insert({ document_id: documentId, shared_by: sharedById, shared_with: targetUserId })

    if (error) {
      console.error('Error sharing document:', error)
      return { success: false, error: error.message }
    }

    // Try to import immediately into recipient library (copy path)
    const senderMeta = {
      id: sharedById,
      full_name: opts?.senderProfile?.full_name,
      email: opts?.senderProfile?.email,
    }

    console.log('[share] shareDocumentWithUser success (no immediate import in share-only mode)', { documentId, sharedById, targetUserId })
    return { success: true }
  } catch (err) {
    console.error('Error in shareDocumentWithUser:', err)
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
      console.error('Error revoking share:', error)
      return { success: false, error: error.message }
    }

    if ((count || 0) === 0) {
      return { success: false, error: 'No se encontró la relación a revocar' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in revokeDocumentShare:', err)
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
      console.error('Error listing shares:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in listDocumentShares:', err)
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
    console.error('Error in searchDocuments:', err)
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
      console.error('Error downloading file:', error)
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
    console.error('Error in downloadDocumentFile:', err)
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
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error('Error in getDocumentDownloadUrl:', err)
    return null
  }
}
