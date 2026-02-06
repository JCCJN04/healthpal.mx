// @ts-nocheck
import { supabase } from '../supabase'
import type { Database } from '../../types/database'

type Document = Database['public']['Tables']['documents']['Row']

/**
 * Get documents for current user
 */
export async function getUserDocuments(userId: string): Promise<Document[]> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

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
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get document to find file path
    const document = await getDocumentById(documentId)
    if (!document) {
      return { success: false, error: 'Documento no encontrado' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error('Error deleting document record:', dbError)
      return { success: false, error: dbError.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in deleteDocument:', err)
    return { success: false, error: 'Error inesperado al eliminar el documento' }
  }
}

/**
 * Get download URL for document
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
