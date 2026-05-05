// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'
import { isDemoMode } from '@/context/DemoContext'
import { demoDocuments } from '@/data/demoData'
import { DEMO_DOCTOR_EMAIL, DEMO_DOCTOR_PASSWORD, DEMO_PATIENT_IDS } from '@/data/demoConfig'

const DEMO_DOCUMENTS_KEY = 'healthpal:demo:documents'
const DEMO_FOLDERS_KEY = 'healthpal:demo:folders'
const DEMO_DOCUMENTS_IN_MEMORY = (import.meta.env.VITE_DEMO_DOCUMENTS_IN_MEMORY as string | undefined) === 'true'
const DEFAULT_DEMO_DOCTOR_EMAIL = 'demo@healthpal.mx'

function checkInMemoryDemoDocuments(): boolean {
  return isDemoMode() && DEMO_DOCUMENTS_IN_MEMORY
}

async function getAuthenticatedUserIdForWrite(): Promise<{ userId: string | null; authError?: string }> {
  try {
    const { data: currentSessionData } = await supabase.auth.getSession()
    if (currentSessionData.session?.user?.id) {
      return { userId: currentSessionData.session.user.id }
    }

    const { data: currentUserData } = await supabase.auth.getUser()
    if (currentUserData.user?.id) {
      return { userId: currentUserData.user.id }
    }

    if (!isDemoMode()) return { userId: null }

    const emailCandidates = Array.from(new Set([DEMO_DOCTOR_EMAIL, DEFAULT_DEMO_DOCTOR_EMAIL].filter(Boolean)))
    const passwordCandidates = Array.from(new Set([DEMO_DOCTOR_PASSWORD].filter(Boolean)))

    let lastErrorMessage = 'No se pudo autenticar la sesion de demo'

    for (const email of emailCandidates) {
      for (const password of passwordCandidates) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error && data.user?.id) {
          return { userId: data.user.id }
        }

        if (error) {
          lastErrorMessage = error.message || lastErrorMessage
          logger.warn('demo:documents:signInWithPassword failed', { email, error: error.message })
        }
      }
    }

    return { userId: null, authError: lastErrorMessage }
  } catch (err: unknown) {
    logger.error('demo:documents:getAuthenticatedUserIdForWrite', err)
    return { userId: null, authError: (err as Error)?.message || 'No se pudo autenticar la sesion de demo' }
  }
}

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
// DocumentShare type reserved for future use

type DocumentPathInput =
  | string
  | null
  | undefined
  | {
      owner_id?: string | null
      id?: string | null
      demo_preview_url?: string | null
      storage_path?: string | null
    }

async function readFileAsDataUrl(file: File): Promise<string | null> {
  if (typeof FileReader === 'undefined') return null

  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      resolve(null)
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export function buildDeterministicDocumentPath(ownerId: string, documentId: string): string {
  return `${ownerId}/${documentId}/${documentId}.bin`
}

function getDemoDocumentsState(): Document[] {
  if (typeof window === 'undefined') return demoDocuments as Document[]

  const raw = window.sessionStorage.getItem(DEMO_DOCUMENTS_KEY)
  if (!raw) {
    window.sessionStorage.setItem(DEMO_DOCUMENTS_KEY, JSON.stringify(demoDocuments))
    return demoDocuments as Document[]
  }

  try {
    return JSON.parse(raw) as Document[]
  } catch {
    window.sessionStorage.setItem(DEMO_DOCUMENTS_KEY, JSON.stringify(demoDocuments))
    return demoDocuments as Document[]
  }
}

function setDemoDocumentsState(next: Document[]) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(DEMO_DOCUMENTS_KEY, JSON.stringify(next))
}

function getDemoFoldersState(): Folder[] {
  if (typeof window === 'undefined') return []

  const raw = window.sessionStorage.getItem(DEMO_FOLDERS_KEY)
  if (!raw) {
    window.sessionStorage.setItem(DEMO_FOLDERS_KEY, JSON.stringify([]))
    return []
  }

  try {
    return JSON.parse(raw) as Folder[]
  } catch {
    window.sessionStorage.setItem(DEMO_FOLDERS_KEY, JSON.stringify([]))
    return []
  }
}

function setDemoFoldersState(next: Folder[]) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(DEMO_FOLDERS_KEY, JSON.stringify(next))
}

async function resolveDocumentStoragePath(input: DocumentPathInput): Promise<string | null> {
  if (!input) return null

  if (typeof input === 'string') {
    const value = input.trim()
    return value.length > 0 ? value : null
  }

  if (input.owner_id && input.id) {
    const defaultPath = buildDeterministicDocumentPath(input.owner_id, input.id)
    
    try {
      const folderPath = `${input.owner_id}/${input.id}`
      const { data } = await supabase.storage.from('documents').list(folderPath, { limit: 1 })
      
      if (data && data.length > 0 && data[0].name) {
        return `${folderPath}/${data[0].name}`
      }
    } catch (e) {
      // Silently fallback to default path
    }
    
    return defaultPath
  }

  return null
}

/**
 * Get documents for current user
 */
export async function getUserDocuments(userId: string, folderId: string | null = null, allFolders = false): Promise<Document[]> {
  if (checkInMemoryDemoDocuments()) {
    return getDemoDocumentsState()
      .filter((doc) => doc.owner_id === userId)
      .filter((doc) => allFolders ? true : (folderId ? doc.folder_id === folderId : doc.folder_id === null)) as Document[]
  }

  try {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('owner_id', userId)

    if (!allFolders) {
      if (folderId) {
        query = query.eq('folder_id', folderId)
      } else {
        // In the root level, only show documents that don't belong to any folder
        query = query.is('folder_id', null)
      }
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
  if (checkInMemoryDemoDocuments()) {
    const found = getDemoDocumentsState().find((doc) => doc.id === documentId)
    return (found || null) as Document | null
  }

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
  if (checkInMemoryDemoDocuments()) {
    return []
  }

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
        sender:profiles!document_shares_shared_by_fkey (
          id, full_name, email, avatar_url, role,
          doctor_profile:doctor_profiles(specialty)
        )
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
 * Get documents the current user shared with a specific user (outbound shares).
 * Used to show doctor-uploaded docs inside a patient's folder view.
 */
export async function getDocumentsSharedByMeWith(myUserId: string, targetUserId: string) {
  if (checkInMemoryDemoDocuments()) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('document_shares')
      .select(`
        id,
        created_at,
        shared_by,
        shared_with,
        document_id,
        document:documents (*)
      `)
      .eq('shared_by', myUserId)
      .eq('shared_with', targetUserId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('getDocumentsSharedByMeWith', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('getDocumentsSharedByMeWith', err)
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
    patientId?: string | null
  }
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  if (checkInMemoryDemoDocuments()) {
    const id = `demo-doc-${Date.now()}`
    const createdAt = new Date().toISOString()
    const demoPreviewUrl = await readFileAsDataUrl(file)
    const nextDoc = {
      id,
      owner_id: userId,
      patient_id: userId,
      uploaded_by: userId,
      title: metadata.title || file.name,
      category: metadata.category,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      notes: metadata.notes || null,
      folder_id: metadata.folderId || null,
      storage_path: demoPreviewUrl,
      demo_preview_url: demoPreviewUrl,
      created_at: createdAt,
      updated_at: createdAt,
    } as Document

    const docs = getDemoDocumentsState()
    setDemoDocumentsState([nextDoc, ...docs])

    logger.info('demo:uploadDocument', { fileName: file.name, userId, metadata, id })
    return { success: true, documentId: id }
  }

  try {
    const { userId: authenticatedUserId, authError } = await getAuthenticatedUserIdForWrite()
    const ownerId = authenticatedUserId || userId

    if (isDemoMode() && !authenticatedUserId) {
      return {
        success: false,
        error: `No se pudo autenticar la sesion demo para subir documentos: ${authError || 'credenciales invalidas'}`,
      }
    }

    // Generate document ID
    const documentId = crypto.randomUUID()
    const filePath = buildDeterministicDocumentPath(ownerId, documentId)

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
        owner_id: ownerId,
        patient_id: metadata.patientId || ownerId,
        uploaded_by: ownerId,
        title: metadata.title || file.name,
        category: metadata.category,
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
 * Save an external URL as a document record (no file upload)
 * Used for radiology links, lab result portals, etc.
 */
export async function saveExternalUrlDocument(
  userId: string,
  metadata: {
    title: string
    category: Database['public']['Enums']['doc_category']
    external_url: string
    notes?: string
    folderId?: string | null
    patientId?: string | null
  }
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        owner_id: userId,
        patient_id: metadata.patientId || userId,
        uploaded_by: userId,
        title: metadata.title,
        category: metadata.category,
        external_url: metadata.external_url,
        notes: metadata.notes || null,
        folder_id: metadata.folderId || null,
        mime_type: null,
        file_size: null,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('saveExternalUrlDocument', error)
      return { success: false, error: 'No se pudo guardar el enlace' }
    }

    return { success: true, documentId: data.id }
  } catch (err) {
    logger.error('saveExternalUrlDocument', err)
    return { success: false, error: 'Error inesperado al guardar el enlace' }
  }
}

/**
 * Delete document
 */
export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (checkInMemoryDemoDocuments()) {
    const docs = getDemoDocumentsState()
    setDemoDocumentsState(docs.filter((doc) => !(doc.id === documentId && doc.owner_id === userId)))
    logger.info('demo:deleteDocument', { documentId, userId })
    return { success: true }
  }

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
    const path = await resolveDocumentStoragePath(document)
    let storageError = null
    if (path) {
      const result = await supabase.storage
        .from('documents')
        .remove([path])
      storageError = result.error
    }

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
  if (checkInMemoryDemoDocuments()) {
    return getDemoFoldersState()
      .filter((folder) => folder.owner_id === userId)
      .filter((folder) => folder.parent_id === parentId)
  }

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
  if (checkInMemoryDemoDocuments()) {
    const id = `demo-folder-${Date.now()}`
    const now = new Date().toISOString()
    const folder: Folder = {
      id,
      owner_id: userId,
      parent_id: parentId,
      name,
      color: '#33C7BE',
      is_favorite: false,
      created_at: now,
      updated_at: now,
    }

    const folders = getDemoFoldersState()
    setDemoFoldersState([...folders, folder])

    logger.info('demo:createFolder', { name, userId, parentId, id })
    return { success: true, folderId: id }
  }

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
  if (checkInMemoryDemoDocuments()) {
    const folders = getDemoFoldersState()
    const remainingFolders = folders.filter((folder) => !(folder.id === folderId && folder.owner_id === userId))
    setDemoFoldersState(remainingFolders)

    const docs = getDemoDocumentsState()
    const docsToDelete = docs.filter((doc) => doc.folder_id === folderId && doc.owner_id === userId)
    const remainingDocs = docs.filter((doc) => !(doc.folder_id === folderId && doc.owner_id === userId)) as Document[]
    setDemoDocumentsState(remainingDocs)

    logger.info('demo:deleteFolder', { folderId, userId, deletedDocs: docsToDelete.length })
    return { success: true }
  }

  try {
    // Fetch all documents in the folder owned by this user
    const { data: docsInFolder, error: fetchError } = await supabase
      .from('documents')
      .select('id, owner_id')
      .eq('folder_id', folderId)
      .eq('owner_id', userId)

    if (fetchError) {
      logger.error('deleteFolder.fetchDocs', fetchError)
      return { success: false, error: fetchError.message }
    }

    // Delete files from storage
    if (docsInFolder && docsInFolder.length > 0) {
      const storagePaths: string[] = []
      for (const doc of docsInFolder) {
        const path = await resolveDocumentStoragePath(doc as DocumentPathInput)
        if (path) storagePaths.push(path)
      }
      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('documents').remove(storagePaths)
        if (storageError) logger.error('deleteFolder.storage', storageError)
      }

      // Delete document records
      const { error: docsDeleteError } = await supabase
        .from('documents')
        .delete()
        .eq('folder_id', folderId)
        .eq('owner_id', userId)

      if (docsDeleteError) {
        logger.error('deleteFolder.deleteDocs', docsDeleteError)
        return { success: false, error: docsDeleteError.message }
      }
    }

    // Delete the folder
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
  if (checkInMemoryDemoDocuments()) {
    const folders = getDemoFoldersState()
    const next = folders.map((folder) => {
      if (folder.id !== folderId || folder.owner_id !== userId) return folder
      return {
        ...folder,
        ...data,
        updated_at: new Date().toISOString(),
      }
    })
    setDemoFoldersState(next)

    logger.info('demo:updateFolder', { folderId, userId, data })
    return { success: true }
  }

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
  if (checkInMemoryDemoDocuments()) {
    const docs = getDemoDocumentsState()
    const next = docs.map((doc) => {
      if (doc.id !== documentId || doc.owner_id !== userId) return doc
      return {
        ...doc,
        ...data,
        updated_at: new Date().toISOString(),
      }
    }) as Document[]
    setDemoDocumentsState(next)

    logger.info('demo:updateDocument', { documentId, userId, data })
    return { success: true }
  }

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
  if (checkInMemoryDemoDocuments()) {
    return { success: true, created: true, documentId: `demo-import-${Date.now()}` }
  }

  try {
    const sharedDoc = share.document

    if (!sharedDoc) {
      logger.warn('importSharedDocument: missing document payload')
      return { success: false, error: 'Documento compartido no disponible' }
    }

    const sourcePath = await resolveDocumentStoragePath(sharedDoc)
    if (!sourcePath) {
      logger.warn('importSharedDocument: document path is not resolvable')
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
    const targetPath = buildDeterministicDocumentPath(recipientId, newId)

    // Try to copy in storage (owner path -> recipient path)
    let copied = false
    const copyResult = await supabase.storage.from('documents').copy(sourcePath, targetPath)
    if (!copyResult.error) {
      copied = true
    } else {
      logger.warn('importSharedDocument: storage copy failed, trying fallback')
      const download = await supabase.storage.from('documents').download(sourcePath)
      if (!download.error && download.data) {
        const upload = await supabase.storage.from('documents').upload(targetPath, download.data)
        if (!upload.error) {
          copied = true
        } else {
          logger.error('importSharedDocument.uploadFallback', upload.error)
        }
      } else {
        logger.error('importSharedDocument.download', download.error)
      }
    }

    if (!copied) {
      logger.warn('importSharedDocument: storage copy failed, aborting import')
      return { success: false, error: 'No se pudo copiar el archivo compartido' }
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
 
export async function syncSharedDocumentsIntoLibrary(_userId: string) {
  // Copy-based import disabled for "just shared" model. Keep for backward compatibility return shape.
  return []
}

/**
 * Find a profile by email (case-insensitive). Returns first match.
 */
export async function findProfileByEmail(email: string): Promise<Profile | null> {
  if (checkInMemoryDemoDocuments()) {
    return {
      id: DEMO_PATIENT_IDS.ana,
      email,
      full_name: 'Paciente Demo',
      role: 'patient',
    } as Profile
  }

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opts?: { document?: Document; senderProfile?: { full_name?: string | null; email?: string | null } }
): Promise<{ success: boolean; error?: string }> {
  if (checkInMemoryDemoDocuments()) {
    logger.info('demo:shareDocumentWithUser', { documentId, sharedById, target })
    return { success: true }
  }

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

    logger.debug('shareDocumentWithUser: success')
    return { success: true }
  } catch (err) {
    logger.error('shareDocumentWithUser', err)
    return { success: false, error: 'No se pudo compartir el documento' }
  }
}

/**
 * Revoke a document share by share row ID.
 * Works for both the sharer (shared_by) and the recipient (shared_with) — RLS allows both.
 */
export async function revokeShareById(
  shareId: string,
): Promise<{ success: boolean; error?: string }> {
  if (checkInMemoryDemoDocuments()) {
    logger.info('demo:revokeShareById', { shareId })
    return { success: true }
  }

  try {
    const { error, count } = await supabase
      .from('document_shares')
      .delete({ count: 'exact' })
      .eq('id', shareId)

    if (error) {
      logger.error('revokeShareById', error)
      return { success: false, error: error.message }
    }

    if ((count || 0) === 0) {
      return { success: false, error: 'No se encontró el acceso a revocar' }
    }

    return { success: true }
  } catch (err) {
    logger.error('revokeShareById', err)
    return { success: false, error: 'No se pudo revocar el acceso' }
  }
}

/**
 * Revoke a document share by document/sharer/recipient triple (legacy — prefer revokeShareById).
 */
export async function revokeDocumentShare(
  documentId: string,
  sharedById: string,
  sharedWithId: string
): Promise<{ success: boolean; error?: string }> {
  if (checkInMemoryDemoDocuments()) {
    logger.info('demo:revokeDocumentShare', { documentId, sharedById, sharedWithId })
    return { success: true }
  }

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
 * List all people who have access to a document (via explicit shares OR fulfilled requests).
 * Uses separate queries instead of embedded joins to avoid silent RLS failures.
 */
export async function listDocumentShares(documentId: string): Promise<Array<{
  id: string
  shared_with: string
  created_at: string
  source: 'share' | 'request'
  profiles: { id: string; full_name: string | null; email: string | null; role: string | null } | null
}>> {
  if (checkInMemoryDemoDocuments()) {
    return []
  }

  try {
    // Part A: explicit document_shares
    const { data: shares, error: sharesError } = await supabase
      .from('document_shares')
      .select('id, shared_with, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (sharesError) {
      logger.error('listDocumentShares:shares', sharesError)
    }

    // Part B: fulfilled document_requests for this specific document
    const { data: requests, error: requestsError } = await supabase
      .from('document_requests')
      .select('id, doctor_id, fulfilled_at, created_at')
      .eq('document_id', documentId)
      .eq('status', 'fulfilled')

    if (requestsError) {
      logger.error('listDocumentShares:requests', requestsError)
    }

    const shareList = shares || []
    const requestList = requests || []

    // Collect all profile IDs to resolve
    const allProfileIds = [
      ...new Set([
        ...shareList.map(s => s.shared_with),
        ...requestList.map(r => r.doctor_id),
      ]),
    ]

    const profileMap = new Map<string, { id: string; full_name: string | null; email: string | null; role: string | null }>()
    if (allProfileIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', allProfileIds)
      for (const p of profileRows || []) {
        profileMap.set(p.id, p)
      }
    }

    const shareEntries = shareList.map(row => ({
      id: row.id,
      shared_with: row.shared_with,
      created_at: row.created_at,
      source: 'share' as const,
      profiles: profileMap.get(row.shared_with) ?? null,
    }))

    const requestEntries = requestList.map(row => ({
      id: row.id,
      shared_with: row.doctor_id,
      created_at: row.fulfilled_at || row.created_at,
      source: 'request' as const,
      profiles: profileMap.get(row.doctor_id) ?? null,
    }))

    // Merge, dedup by shared_with — explicit share wins over request
    const seen = new Set<string>()
    const result = []
    for (const entry of [...shareEntries, ...requestEntries]) {
      if (!seen.has(entry.shared_with)) {
        seen.add(entry.shared_with)
        result.push(entry)
      }
    }
    return result
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharedDocs = (sharedRaw as any[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export async function downloadDocumentFile(pathOrDocument: DocumentPathInput, fileName: string): Promise<{ success: boolean; error?: string }> {
  if (checkInMemoryDemoDocuments()) {
    try {
      const demoUrl =
        (typeof pathOrDocument === 'string' && pathOrDocument.startsWith('data:') ? pathOrDocument : null) ||
        (typeof pathOrDocument === 'object' && pathOrDocument
          ? (pathOrDocument.demo_preview_url || pathOrDocument.storage_path || null)
          : null)

      if (!demoUrl) {
        logger.info('demo:downloadDocumentFile', { fileName, hasPreview: false })
        return { success: true }
      }

      const link = document.createElement('a')
      link.href = demoUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      logger.info('demo:downloadDocumentFile', { fileName, hasPreview: true })
      return { success: true }
    } catch (err) {
      logger.error('demo:downloadDocumentFile', err)
      return { success: false, error: 'Error al descargar el archivo en modo demo' }
    }
  }

  try {
    const resolvedPath = await resolveDocumentStoragePath(pathOrDocument)
    if (!resolvedPath) {
      return { success: false, error: 'No se pudo resolver la ruta del archivo' }
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .download(resolvedPath)

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
export async function getDocumentDownloadUrl(pathOrDocument: DocumentPathInput): Promise<string | null> {
  // External URL documents have no storage file — return the URL directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (pathOrDocument && typeof pathOrDocument === 'object' && (pathOrDocument as any).external_url) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (pathOrDocument as any).external_url as string
  }

  if (checkInMemoryDemoDocuments()) {
    if (typeof pathOrDocument === 'string') {
      return pathOrDocument.startsWith('data:') ? pathOrDocument : null
    }

    if (pathOrDocument && typeof pathOrDocument === 'object') {
      const url = pathOrDocument.demo_preview_url || pathOrDocument.storage_path || null
      if (url && typeof url === 'string' && url.startsWith('data:')) {
        return url
      }
    }

    return null
  }

  try {
    const resolvedPath = await resolveDocumentStoragePath(pathOrDocument)
    if (!resolvedPath) {
      return null
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(resolvedPath, 3600) // 1 hour expiry

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

/**
 * Upload a document on behalf of a patient (doctor uploads).
 * The doctor is the storage owner; patient_id links the document to the patient.
 * The document is also shared with the patient so they can see it in their own list.
 */
export async function uploadDocumentForPatient(
  file: File,
  doctorId: string,
  patientId: string,
  metadata: {
    title: string
    category: Database['public']['Enums']['doc_category']
    notes?: string
  }
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    const documentId = crypto.randomUUID()
    const filePath = buildDeterministicDocumentPath(doctorId, documentId)

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      logger.error('uploadDocumentForPatient.storage', uploadError)
      return { success: false, error: uploadError.message }
    }

    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        owner_id: doctorId,
        patient_id: patientId,
        uploaded_by: doctorId,
        title: metadata.title || file.name,
        category: metadata.category,
        mime_type: file.type,
        file_size: file.size,
        notes: metadata.notes || null,
        folder_id: null,
      })

    if (dbError) {
      logger.error('uploadDocumentForPatient.db', dbError)
      await supabase.storage.from('documents').remove([filePath])
      return { success: false, error: dbError.message }
    }

    // Share with patient so it appears in their documents list
    await supabase.from('document_shares').insert({
      document_id: documentId,
      shared_by: doctorId,
      shared_with: patientId,
    }).then(({ error }) => {
      if (error) logger.warn('uploadDocumentForPatient.share', error)
    })

    return { success: true, documentId }
  } catch (err) {
    logger.error('uploadDocumentForPatient', err)
    return { success: false, error: 'Error inesperado al subir el documento' }
  }
}

/**
 * Fetch documents that a specific doctor has uploaded for a specific patient.
 */
export async function getDoctorDocumentsForPatient(
  doctorId: string,
  patientId: string
): Promise<Document[]> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', doctorId)
      .eq('patient_id', patientId)
      .eq('uploaded_by', doctorId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('getDoctorDocumentsForPatient', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('getDoctorDocumentsForPatient', err)
    return []
  }
}

/**
 * Fetch documents that a patient has shared with a specific doctor.
 * Used in the patient expediente tab to show documents uploaded by the patient via solicitud.
 */
export async function getAllSharesByOwner(ownerId: string): Promise<Array<{
  id: string
  document_id: string
  document_title: string
  document_category: string
  shared_with: string
  shared_with_name: string | null
  shared_with_email: string | null
  shared_with_avatar: string | null
  created_at: string
  source: 'share' | 'request'
}>> {
  if (checkInMemoryDemoDocuments()) return []

  try {
    // --- Part A: explicit document_shares ---
    const { data: shares, error: sharesError } = await supabase
      .from('document_shares')
      .select('id, document_id, shared_with, created_at')
      .eq('shared_by', ownerId)
      .order('created_at', { ascending: false })

    if (sharesError) {
      logger.error('getAllSharesByOwner:shares', sharesError)
    }

    // --- Part B: fulfilled document_requests (doctor requested, patient uploaded) ---
    const { data: requests, error: requestsError } = await supabase
      .from('document_requests')
      .select('id, document_id, doctor_id, fulfilled_at, created_at')
      .eq('patient_id', ownerId)
      .eq('status', 'fulfilled')
      .not('document_id', 'is', null)
      .order('fulfilled_at', { ascending: false })

    if (requestsError) {
      logger.error('getAllSharesByOwner:requests', requestsError)
    }

    // Collect all doc IDs and profile IDs to resolve in bulk
    const shareList = shares || []
    const requestList = requests || []

    const allDocIds = [
      ...new Set([
        ...shareList.map(s => s.document_id),
        ...requestList.map(r => r.document_id as string),
      ]),
    ]
    const allProfileIds = [
      ...new Set([
        ...shareList.map(s => s.shared_with),
        ...requestList.map(r => r.doctor_id),
      ]),
    ]

    const [{ data: docs }, { data: profileRows }] = await Promise.all([
      allDocIds.length > 0
        ? supabase.from('documents').select('id, title, category').in('id', allDocIds)
        : Promise.resolve({ data: [] }),
      allProfileIds.length > 0
        ? supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', allProfileIds)
        : Promise.resolve({ data: [] }),
    ])

    const docMap = new Map((docs || []).map(d => [d.id, d]))
    const profileMap = new Map((profileRows || []).map(p => [p.id, p]))

    const shareEntries = shareList.map(row => {
      const doc = docMap.get(row.document_id)
      const recipient = profileMap.get(row.shared_with)
      return {
        id: row.id,
        document_id: row.document_id,
        document_title: doc?.title || 'Documento',
        document_category: doc?.category || 'other',
        shared_with: row.shared_with,
        shared_with_name: recipient?.full_name ?? null,
        shared_with_email: recipient?.email ?? null,
        shared_with_avatar: recipient?.avatar_url ?? null,
        created_at: row.created_at,
        source: 'share' as const,
      }
    })

    const requestEntries = requestList.map(row => {
      const doc = docMap.get(row.document_id as string)
      const doctor = profileMap.get(row.doctor_id)
      return {
        id: row.id,
        document_id: row.document_id as string,
        document_title: doc?.title || 'Documento',
        document_category: doc?.category || 'other',
        shared_with: row.doctor_id,
        shared_with_name: doctor?.full_name ?? null,
        shared_with_email: doctor?.email ?? null,
        shared_with_avatar: doctor?.avatar_url ?? null,
        created_at: row.fulfilled_at || row.created_at,
        source: 'request' as const,
      }
    })

    // Merge: deduplicate by (document_id, shared_with) — if both a share and request exist, keep share
    const seen = new Set<string>()
    const result = []
    for (const entry of [...shareEntries, ...requestEntries]) {
      const key = `${entry.document_id}::${entry.shared_with}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push(entry)
      }
    }
    return result
  } catch (err) {
    logger.error('getAllSharesByOwner', err)
    return []
  }
}

export async function getDocumentsSharedByPatientWithDoctor(
  doctorId: string,
  patientId: string
): Promise<Document[]> {
  try {
    const { data, error } = await supabase
      .from('document_shares')
      .select('document:documents(*)')
      .eq('shared_with', doctorId)
      .eq('shared_by', patientId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('getDocumentsSharedByPatientWithDoctor', error)
      return []
    }

     
    return (data || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => row.document as Document)
      .filter(Boolean)
  } catch (err) {
    logger.error('getDocumentsSharedByPatientWithDoctor', err)
    return []
  }
}
