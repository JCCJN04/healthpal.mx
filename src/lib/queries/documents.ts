// @ts-nocheck
import { supabase } from '../supabase'
import type { Database } from '../../types/database'

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

    return data || []
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
      .single()

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
