import React, { useState, useEffect } from 'react'
import { Upload, Search, FileText, Loader2, Plus, FileUp, X, Copy, Check, Activity, Pill, Microscope, ShieldCheck, Users, Link2, MessageCircle, Share2, ChevronLeft, UserCircle, UserPlus } from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import ViewToggle from '@/shared/components/ui/ViewToggle'
import DocumentsTable from '@/shared/components/documents/DocumentsTable'
import { DocumentGrid } from '@/shared/components/documents/DocumentGrid'
import { DocumentPreviewModal } from '@/shared/components/documents/DocumentPreviewModal'
import { ShareModal, type KnownDoctor } from '@/shared/components/documents/ShareModal'
import { AccessPanel } from '@/shared/components/documents/AccessPanel'
import { useAuth } from '@/app/providers/AuthContext'
import { getUserDocuments, getDocumentsSharedWithMe, getDocumentsSharedByMeWith, uploadDocument, uploadDocumentEncrypted, deleteDocument, getFolders, createFolder, deleteFolder, updateFolder, updateDocument, shareDocumentWithUser, saveExternalUrlDocument, findProfileByEmail } from '@/shared/lib/queries/documents'
import { useCrypto } from '@/context/CryptoContext'
import { getPatientDoctorAccess, getDoctorConsentRequests, requestPatientAccess, reRequestAccess } from '@/shared/lib/queries/consent'
import { createDocumentRequest, getFulfilledRequestDocsByPatient, getPatientsWithFulfilledRequests } from '@/shared/lib/queries/documentRequests'
import { showToast } from '@/shared/components/ui/Toast'
import { validateFile } from '@/shared/lib/errors'
import { isDemoMode } from '@/context/DemoContext'
import type { Database } from '@/shared/types/database'

type Document = Database['public']['Tables']['documents']['Row']
type DocCategory = Database['public']['Enums']['doc_category']
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

type SharedEntry = {
  id: string
  document?: Document | null
  sender?: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    role: string | null
    doctor_profile?: { specialty: string | null } | null
  } | null
}

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'radiology', label: 'Radiología' },
  { value: 'prescription', label: 'Recetas' },
  { value: 'history', label: 'Historial' },
  { value: 'lab', label: 'Laboratorio' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'other', label: 'Otros' },
]

function getCategoryIcon(value: string) {
  switch (value) {
    case 'radiology': return <Activity size={12} />
    case 'prescription': return <Pill size={12} />
    case 'history': return <FileText size={12} />
    case 'lab': return <Microscope size={12} />
    case 'insurance': return <ShieldCheck size={12} />
    default: return null
  }
}

export default function Documentos() {
  const { user, profile } = useAuth()
  const { publicKey: cryptoPublicKey } = useCrypto()
  const [view, setView] = useState<'list' | 'grid'>('grid')
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [filteredFolders, setFilteredFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [currentFolder, setCurrentFolder] = useState<{ id: string | null; name: string }>({ id: null, name: 'Mis Documentos' })
  const [navHistory, setNavHistory] = useState<{ id: string | null; name: string }[]>([])
  const [currentFolderInfo, setCurrentFolderInfo] = useState<{ avatarUrl?: string | null; subtitle?: string | null } | null>(null)
  const [sharedDocs, setSharedDocs] = useState<Array<{ doc: Document; senderId: string }>>([])
  const [, setSharedFolders] = useState<Folder[]>([])
  const [movingDocId, setMovingDocId] = useState<string | null>(null)
  const [senderEmailMap, setSenderEmailMap] = useState<Map<string, string>>(new Map())

  // Request patient access modal (doctor only)
  const [accessReqOpen, setAccessReqOpen] = useState(false)
  const [accessReqEmail, setAccessReqEmail] = useState('')
  const [accessReqReason, setAccessReqReason] = useState('')
  const [accessReqLoading, setAccessReqLoading] = useState(false)

  // Document request modal (doctor only)
  const [docReqOpen, setDocReqOpen] = useState(false)
  const [docReqEmail, setDocReqEmail] = useState('')
  const [docReqType, setDocReqType] = useState('')
  const [docReqDesc, setDocReqDesc] = useState('')
  const [docReqLoading, setDocReqLoading] = useState(false)
  const [docReqLink, setDocReqLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')

  // Share modal state
  const [shareTarget, setShareTarget] = useState<{
    type: 'document' | 'folder'
    id: string
    title: string
    documentIds?: string[]
  } | null>(null)
  const [accessPanelOpen, setAccessPanelOpen] = useState(false)
  const [knownDoctors, setKnownDoctors] = useState<KnownDoctor[]>([])

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  const [uploadForm, setUploadForm] = useState<{
    file: File | null
    title: string
    category: DocCategory
    notes: string
  }>({
    file: null,
    title: '',
    category: 'other',
    notes: '',
  })

  // URL-link mode (for radiology/lab links instead of file upload)
  const [urlMode, setUrlMode] = useState(false)
  const [urlForm, setUrlForm] = useState<{
    url: string
    title: string
    category: DocCategory
    notes: string
  }>({ url: '', title: '', category: 'radiology', notes: '' })
  const [savingUrl, setSavingUrl] = useState(false)

  useEffect(() => {
    loadContent(currentFolder.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentFolder.id])

  useEffect(() => {
    filterContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, folders, searchQuery, selectedCategory, currentFolder.id, sortBy])

  // Load known doctors for patient quick-select in ShareModal
  useEffect(() => {
    if (!user || profile?.role !== 'patient') return
    getPatientDoctorAccess(user.id).then(consents => {
      const doctors: KnownDoctor[] = consents
        .filter(c => c.status === 'accepted' && c.doctor)
        .map(c => ({
          id: c.doctor!.id,
          full_name: c.doctor!.full_name,
          email: c.doctor!.email,
          avatar_url: c.doctor!.avatar_url,
        }))
      setKnownDoctors(doctors)
    })
  }, [user, profile?.role])

  const loadContent = async (folderId: string | null = currentFolder.id) => {
    if (!user) return
    setLoading(true)

    const isSharedFolder = folderId?.startsWith('shared-')

    const [ownDocs, shared] = await Promise.all([
      // When viewing a synthetic shared folder, skip folder filter (null) to avoid UUID errors
      getUserDocuments(user.id, isSharedFolder ? null : folderId),
      getDocumentsSharedWithMe(user.id)
    ])

    // Drop imported copies (owner = me, uploaded_by != me) to avoid duplicates
    // Also drop docs uploaded for a patient context (patient_id != user.id) from root view
    const cleanedOwn = ownDocs.filter(doc =>
      !(doc.owner_id === user.id && doc.uploaded_by && doc.uploaded_by !== user.id) &&
      (!doc.patient_id || doc.patient_id === user.id)
    )

    const sharedEntries = (shared as SharedEntry[])
      .map((s) => ({
        doc: s.document as Document,
        senderId: s.sender?.id || 'shared',
        senderName: s.sender?.full_name || s.sender?.email || 'Compartido',
        senderEmail: s.sender?.email || '',
        senderAvatarUrl: s.sender?.avatar_url || null,
        senderRole: s.sender?.role || null,
        senderSpecialty: s.sender?.doctor_profile?.specialty || null,
      }))
      .filter(entry => !!entry.doc)

    // Build email map for doc request pre-fill
    const emailMap = new Map<string, string>()
    sharedEntries.forEach(entry => { if (entry.senderEmail) emailMap.set(entry.senderId, entry.senderEmail) })
    setSenderEmailMap(emailMap)

    // Build synthetic shared folders by sender
    const senderMetaMap = new Map<string, { name: string; avatarUrl: string | null; role: string | null; specialty: string | null }>()
    sharedEntries.forEach(entry => {
      if (!senderMetaMap.has(entry.senderId)) {
        senderMetaMap.set(entry.senderId, {
          name: entry.senderName,
          avatarUrl: entry.senderAvatarUrl,
          role: entry.senderRole,
          specialty: entry.senderSpecialty,
        })
      }
    })

    // Count docs per sender and track newest doc date
    const NEW_THRESHOLD_MS = 48 * 60 * 60 * 1000 // 48 hours
    const docCountBySender = new Map<string, number>()
    const latestDocBySender = new Map<string, number>()
    sharedEntries.forEach(entry => {
      docCountBySender.set(entry.senderId, (docCountBySender.get(entry.senderId) ?? 0) + 1)
      const docTime = new Date(entry.doc.created_at).getTime()
      const prev = latestDocBySender.get(entry.senderId) ?? 0
      if (docTime > prev) latestDocBySender.set(entry.senderId, docTime)
    })

    const syntheticSharedFolders: Folder[] = Array.from(senderMetaMap.entries()).map(([senderId, meta]) => ({
      id: `shared-${senderId}`,
      name: meta.name,
      color: '#33C7BE',
      created_at: new Date().toISOString(),
      avatarUrl: meta.avatarUrl,
      subtitle: meta.role === 'doctor' ? (meta.specialty ?? 'Doctor') : null,
      docCount: docCountBySender.get(senderId) ?? 0,
      hasNew: (Date.now() - (latestDocBySender.get(senderId) ?? 0)) < NEW_THRESHOLD_MS,
    }))

    // For doctors at root level: also include consented patients who haven't shared docs yet
    // and patients with fulfilled document requests
    if (profile?.role === 'doctor' && !folderId) {
      const [consentedPatients, requestPatientIds] = await Promise.all([
        getDoctorConsentRequests(user.id),
        getPatientsWithFulfilledRequests(user.id),
      ])
      const existingIds = new Set(syntheticSharedFolders.map(f => f.id))

      consentedPatients
        .filter(c => c.status === 'accepted' && c.patient?.id)
        .forEach(c => {
          const fid = `shared-${c.patient!.id}`
          if (!existingIds.has(fid)) {
            existingIds.add(fid)
            syntheticSharedFolders.push({
              id: fid,
              name: c.patient!.full_name || c.patient!.email || 'Paciente',
              color: '#33C7BE',
              created_at: new Date().toISOString(),
              avatarUrl: c.patient!.avatar_url ?? null,
              subtitle: null,
              docCount: 0,
              hasNew: false,
            })
          }
        })

      // Add patients who sent docs via document_request but may not have a consent record
      requestPatientIds.forEach(pid => {
        const fid = `shared-${pid}`
        if (!existingIds.has(fid)) {
          existingIds.add(fid)
          syntheticSharedFolders.push({
            id: fid,
            name: 'Paciente',
            color: '#33C7BE',
            created_at: new Date().toISOString(),
            avatarUrl: null,
            subtitle: null,
            docCount: 0,
            hasNew: false,
          })
        }
      })
    }

    // Remove legacy imported shared folders from DB to avoid clutter
    const ownFoldersInitial = await getFolders(user.id, isSharedFolder ? null : folderId)
    const legacyShared = ownFoldersInitial.filter(f => f.name.toLowerCase().startsWith('compartido de '))
    if (legacyShared.length) {
      await Promise.all(legacyShared.map(f => deleteFolder(f.id, user.id)))
      // If current folder was deleted, reset to root
      if (legacyShared.some(f => f.id === folderId)) {
        setCurrentFolder({ id: null, name: 'Mis Documentos' })
        setNavHistory([])
      }
    }
    const ownFolders = legacyShared.length ? await getFolders(user.id, folderId) : ownFoldersInitial
    const filteredOwnFolders = ownFolders.filter(f => !f.name.toLowerCase().startsWith('compartido de '))

    const targetSenderId = isSharedFolder ? folderId?.replace('shared-', '') ?? null : null

    // For shared patient folder: merge patient→doctor AND doctor→patient shares
    let docsForView: Document[]
    if (isSharedFolder && targetSenderId) {
      const patientToDoctorDocs = sharedEntries
        .filter(e => e.senderId === targetSenderId)
        .map(e => e.doc)

      const outbound = await getDocumentsSharedByMeWith(user.id, targetSenderId)
      const doctorToPatientDocs = (outbound as SharedEntry[])
        .map(s => s.document as Document)
        .filter(Boolean)

      // Also include documents uploaded via fulfilled document_requests (WhatsApp / token link)
      const requestDocs = profile?.role === 'doctor'
        ? await getFulfilledRequestDocsByPatient(user.id, targetSenderId)
        : []

      // Merge and deduplicate by doc ID
      const merged = new Map<string, Document>()
      patientToDoctorDocs.forEach(d => merged.set(d.id, d))      // explicitly shared patient→doctor
      doctorToPatientDocs.forEach(d => merged.set(d.id, d))      // doctor→patient shares
      requestDocs.forEach((d: Document) => merged.set(d.id, d))  // fulfilled document_requests
      docsForView = Array.from(merged.values())
    } else {
      docsForView = cleanedOwn
    }

    // Dedup folders by id and hide synthetic shared folders when inside any folder
    const finalFolders = isSharedFolder
      ? []                   // Inside a patient's shared folder: no subfolders
      : folderId
        ? filteredOwnFolders
        : [...filteredOwnFolders, ...syntheticSharedFolders]
    const dedupFolders = finalFolders.filter((f, idx, arr) => arr.findIndex(x => x.id === f.id) === idx)

    setSharedDocs(sharedEntries.map(e => ({ doc: e.doc, senderId: e.senderId })))
    setSharedFolders(syntheticSharedFolders)
    setDocuments(docsForView)
    setFolders(dedupFolders)
    setLoading(false)
  }

  const filterContent = () => {
    let filtDocs = [...documents]
    let filtFlds = [...folders]

    // Filter by search
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      filtDocs = filtDocs.filter(doc =>
        doc.title.toLowerCase().includes(search) ||
        doc.notes?.toLowerCase().includes(search)
      )
      filtFlds = filtFlds.filter(f => f.name.toLowerCase().includes(search))
    }

    // Category filter: inside any folder (not root)
    if (selectedCategory !== 'all' && currentFolder.id) {
      filtDocs = filtDocs.filter(doc => doc.category === selectedCategory)
      if (!searchQuery) filtFlds = []
    }

    // Sort at root level
    if (!currentFolder.id) {
      if (sortBy === 'name') {
        filtFlds = [...filtFlds].sort((a, b) => a.name.localeCompare(b.name, 'es-MX'))
        filtDocs = [...filtDocs].sort((a, b) => a.title.localeCompare(b.title, 'es-MX'))
      } else {
        filtFlds = [...filtFlds].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        filtDocs = [...filtDocs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    }

    setFilteredDocuments(filtDocs)
    setFilteredFolders(filtFlds)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      showToast('No se detecto usuario activo en demo. Recarga la pagina.', 'error')
      return
    }

    if (!uploadForm.file) {
      showToast('Selecciona un archivo para continuar.', 'warning')
      return
    }

    setUploading(true)
    const patientIdForUpload = currentFolder.id?.startsWith('shared-') ? currentFolder.id.replace('shared-', '') : null
    const uploadMeta = {
      title: uploadForm.title || uploadForm.file.name,
      category: uploadForm.category,
      notes: uploadForm.notes,
      folderId: patientIdForUpload ? null : currentFolder.id,
      patientId: patientIdForUpload,
    }
    const result = cryptoPublicKey
      ? await uploadDocumentEncrypted(uploadForm.file, user.id, cryptoPublicKey, uploadMeta)
      : await uploadDocument(uploadForm.file, user.id, uploadMeta)

    if (result.success && result.documentId) {
      setUploadModalOpen(false)

      if (isDemoMode()) {
        showToast('Documento subido correctamente (demo)', 'success')
        setCurrentFolder({ id: null, name: 'Mis Documentos' })
        setNavHistory([])
        setSearchQuery('')
        setSelectedCategory('all')
        setUploadForm({
          file: null,
          title: '',
          category: 'other',
          notes: '',
        })
        await loadContent(null)
        setUploading(false)
        return
      }

      // Auto-share with patient when uploading from their shared folder
      if (currentFolder.id?.startsWith('shared-')) {
        const patientId = currentFolder.id.replace('shared-', '')
        await shareDocumentWithUser(result.documentId, user.id, { userId: patientId }, {
          senderProfile: { full_name: profile?.full_name, email: user.email },
        })
      }
      showToast("Documento subido correctamente", "success")
      setUploadForm({
        file: null,
        title: '',
        category: 'other',
        notes: '',
      })
      loadContent(currentFolder.id)
    } else {
      showToast(result.error || 'Error al subir el documento', 'error')
    }
    setUploading(false)
  }

  const handleDelete = async (documentId: string) => {
    if (!user || !user.id) return
    if (!confirm('¿Estás seguro de eliminar este documento?')) return

    // Save original state for recovery
    const originalDocs = [...documents]

    // Optimistic Update: Remove from local state immediately
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))

    const result = await deleteDocument(documentId, user.id)
    if (result.success) {
      showToast('Documento eliminado correctamente', 'success')
      loadContent(currentFolder.id)
    } else {
      setDocuments(originalDocs)
      showToast(result.error || 'Error al eliminar', 'error')
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newFolderName) return

    const result = await createFolder(newFolderName, user.id, currentFolder.id)
    if (result.success) {
      showToast('Carpeta creada', 'success')
      setFolderModalOpen(false)
      setNewFolderName('')
      loadContent(currentFolder.id)
    } else {
      showToast(result.error || 'Error al crear carpeta', 'error')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!user || !user.id) return
    if (!confirm('¿Estás seguro de eliminar esta carpeta? Se eliminarán también todos los documentos que contiene. Esta acción no se puede deshacer.')) return

    const result = await deleteFolder(folderId, user.id)
    if (result.success) {
      showToast('Carpeta eliminada', 'success')
      loadContent(currentFolder.id)
    } else {
      showToast(result.error || 'Error al eliminar carpeta', 'error')
    }
  }

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    if (!user || !user.id) return
    const newName = prompt('Ingresa el nuevo nombre de la carpeta:', currentName)
    if (!newName || newName === currentName) return

    const result = await updateFolder(folderId, user.id, { name: newName })
    if (result.success) {
      showToast('Carpeta renombrada', 'success')
      loadContent(currentFolder.id)
    } else {
      showToast(result.error || 'Error al renombrar carpeta', 'error')
    }
  }

  const handleMoveDocument = async (docId: string, targetFolderId: string | null) => {
    if (!user) return
    const doc = [...documents, ...sharedDocs.map(s => s.doc)].find(d => d.id === docId)
    if (!doc) {
      showToast('No encontramos el documento a mover', 'error')
      return
    }
    if (doc.owner_id !== user.id) {
      showToast('Solo puedes mover tus documentos', 'error')
      return
    }

    try {
      setMovingDocId(docId)
      const result = await updateDocument(docId, user.id, { folder_id: targetFolderId })
      if (result.success) {
        showToast('Documento movido', 'success')
        await loadContent(currentFolder.id)
      } else {
        showToast(result.error || 'No se pudo mover el documento', 'error')
      }
    } finally {
      setMovingDocId(null)
    }
  }

  const handleFolderClick = (id: string, name: string) => {
    setNavHistory(prev => [...prev, currentFolder])
    setCurrentFolder({ id, name })
    setSelectedCategory('all')
    setSearchQuery('')
    const folderMeta = folders.find(f => f.id === id)
    setCurrentFolderInfo(folderMeta ? { avatarUrl: folderMeta.avatarUrl, subtitle: folderMeta.subtitle } : null)
  }

  const handleBackNavigation = (index: number) => {
    if (index === -1) {
      setCurrentFolder({ id: null, name: 'Mis Documentos' })
      setNavHistory([])
    } else {
      const target = navHistory[index]
      setCurrentFolder(target)
      setNavHistory(navHistory.slice(0, index))
    }
    setCurrentFolderInfo(null)
    setSelectedCategory('all')
    setSearchQuery('')
  }

  const handleRequestPatientAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setAccessReqLoading(true)
    try {
      const patient = await findProfileByEmail(accessReqEmail.trim())
      if (!patient?.id) {
        showToast('No encontramos un paciente con ese correo', 'error')
        return
      }
      if (patient.role !== 'patient') {
        showToast('El correo no corresponde a una cuenta de paciente', 'error')
        return
      }
      const { ok, error } = await requestPatientAccess(user.id, patient.id, accessReqReason.trim() || undefined)
      if (!ok) {
        // If already exists try re-request
        const retry = await reRequestAccess(user.id, patient.id, accessReqReason.trim() || undefined)
        if (!retry.ok) {
          showToast(error || retry.error || 'No se pudo enviar la solicitud', 'error')
          return
        }
      }
      showToast('Solicitud de acceso enviada al paciente', 'success')
      setAccessReqOpen(false)
      setAccessReqEmail('')
      setAccessReqReason('')
    } catch {
      showToast('Error inesperado', 'error')
    } finally {
      setAccessReqLoading(false)
    }
  }

  const handleCreateDocRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setDocReqLoading(true)
    try {
      const { data, error } = await createDocumentRequest(user.id, docReqEmail, docReqType, docReqDesc)
      if (error || !data) {
        showToast(error || 'Error al crear la solicitud', 'error')
        return
      }
      setDocReqLink(`${window.location.origin}/solicitud/${data.token}`)
    } catch {
      showToast('Error inesperado', 'error')
    } finally {
      setDocReqLoading(false)
    }
  }

  const handleCopyDocReqLink = () => {
    if (!docReqLink) return
    navigator.clipboard.writeText(docReqLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetDocReqModal = () => {
    setDocReqOpen(false)
    setDocReqLink(null)
    setDocReqEmail('')
    setDocReqType('')
    setDocReqDesc('')
    setCopied(false)
  }

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    let url = urlForm.url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    setSavingUrl(true)
    const patientIdForUrl = currentFolder.id?.startsWith('shared-') ? currentFolder.id.replace('shared-', '') : null
    const result = await saveExternalUrlDocument(user.id, {
      title: urlForm.title,
      category: urlForm.category,
      external_url: url,
      notes: urlForm.notes,
      folderId: patientIdForUrl ? null : currentFolder.id,
      patientId: patientIdForUrl,
    })
    setSavingUrl(false)
    if (result.success) {
      // Auto-share with patient when saving from their shared folder
      if (result.documentId && currentFolder.id?.startsWith('shared-')) {
        const patientId = currentFolder.id.replace('shared-', '')
        await shareDocumentWithUser(result.documentId, user.id, { userId: patientId }, {
          senderProfile: { full_name: profile?.full_name, email: user.email },
        })
      }
      showToast('Enlace guardado correctamente', 'success')
      setUploadModalOpen(false)
      setUrlMode(false)
      setUrlForm({ url: '', title: '', category: 'radiology', notes: '' })
      loadContent(currentFolder.id)
    } else {
      showToast(result.error || 'Error al guardar el enlace', 'error')
    }
  }

  const handleShareViaWhatsApp = () => {
    if (!docReqLink) return
    const doctorName = profile?.full_name ? `Dr(a). ${profile.full_name}` : 'Tu médico'
    const text = `Hola, ${doctorName} te solicita que subas un documento médico de forma segura.\n\n📎 *Documento:* ${docReqType}\n\n🔗 Haz clic aquí para subirlo:\n${docReqLink}\n\n_El enlace vence en 7 días._`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  // ─── Sharing handlers ─────────────────────────────────────────────────────

  const handleShareDocument = (docId: string, docTitle: string) => {
    setShareTarget({ type: 'document', id: docId, title: docTitle })
  }

  const handleShareFolder = async (folderId: string, folderName: string) => {
    if (!user) return
    const folderDocs = await getUserDocuments(user.id, folderId)
    setShareTarget({
      type: 'folder',
      id: folderId,
      title: folderName,
      documentIds: folderDocs.map(d => d.id),
    })
  }

  const handleShareSubmit = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !shareTarget) return { success: false, error: 'Sin objetivo' }

    const ids = shareTarget.type === 'document'
      ? [shareTarget.id]
      : (shareTarget.documentIds || [])

    if (ids.length === 0) return { success: false, error: 'La carpeta está vacía' }

    const results = await Promise.all(
      ids.map(docId =>
        shareDocumentWithUser(docId, user.id, { email }, {
          senderProfile: { full_name: profile?.full_name, email: user.email },
        })
      )
    )

    const lastError = [...results].reverse().find(r => !r.success)?.error

    if (!lastError) {
      showToast(
        shareTarget.type === 'folder'
          ? `Carpeta compartida con ${email}`
          : `Documento compartido con ${email}`,
        'success'
      )
      return { success: true }
    }
    return { success: false, error: lastError }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size before accepting
      const validationError = validateFile(file, 'document')
      if (validationError) {
        showToast(validationError, 'error')
        e.target.value = '' // Reset input
        return
      }
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      }))
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-4">

        {/* Header */}
        {profile?.role === 'patient' && !currentFolder.id ? (
          /* ── Patient root: clean Stitch-style header ── */
          <div>
            <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                  Documentos
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {profile?.full_name?.split(' ')[0]
                    ? `Hola, ${profile.full_name.split(' ')[0]} — aquí están tus archivos médicos`
                    : 'Tus archivos médicos y los de tus médicos'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
                >
                  <Upload size={14} />
                  Subir
                </button>
                <button
                  onClick={() => setAccessPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 transition-all"
                >
                  <Users size={14} />
                  Accesos
                </button>
                <button
                  onClick={() => setFolderModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 transition-all"
                >
                  <Plus size={14} />
                  Carpeta
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-primary/10 rounded-2xl px-4 py-2.5 text-center border border-primary/10">
                <p className="text-2xl font-black text-gray-900">{documents.length}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Archivos</p>
              </div>
              <div className="bg-primary/10 rounded-2xl px-4 py-2.5 text-center border border-primary/10">
                <p className="text-2xl font-black text-gray-900">{folders.filter(f => f.id.startsWith('shared-')).length}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Médicos</p>
              </div>
            </div>
          </div>

        ) : profile?.role === 'patient' && currentFolder.id?.startsWith('shared-') ? (
          /* ── Patient inside a doctor's folder: profile card header ── */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary to-teal-400" />
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Back + avatar + info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => handleBackNavigation(-1)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-700 shrink-0"
                  aria-label="Volver"
                >
                  <ChevronLeft size={20} />
                </button>
                {currentFolderInfo?.avatarUrl ? (
                  <img
                    src={currentFolderInfo.avatarUrl}
                    alt={currentFolder.name}
                    className="w-14 h-14 rounded-full object-cover ring-4 ring-primary/20 shadow-md shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center ring-4 ring-primary/20 shadow-md shrink-0">
                    <UserCircle size={30} className="text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-lg font-black text-gray-900 leading-tight truncate">{currentFolder.name}</h1>
                  {currentFolderInfo?.subtitle && (
                    <span className="inline-block mt-1 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
                      {currentFolderInfo.subtitle}
                    </span>
                  )}
                </div>
              </div>
              {/* Stats + upload */}
              <div className="flex items-center gap-2 sm:shrink-0">
                <div className="bg-gray-50 rounded-xl px-4 py-2 text-center border border-gray-100">
                  <p className="text-xl font-black text-gray-900">{documents.length}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Archivos</p>
                </div>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-sm font-black rounded-xl hover:bg-primary/90 transition-all shadow-md"
                >
                  <Upload size={15} />
                  Subir
                </button>
              </div>
            </div>
          </div>

        ) : (
          /* ── Doctor header OR patient inside own folder ── */
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-teal-600 p-6 md:p-7 text-white shadow-lg">
            <div className="absolute top-0 right-0 bottom-0 w-72 opacity-10 pointer-events-none"
              style={{ background: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                  {currentFolder.id ? currentFolder.name : 'Mis Documentos'}
                </h1>
                <p className="text-sm text-white/75 mt-1">
                  {currentFolder.id?.startsWith('shared-')
                    ? 'Documentos compartidos entre ustedes'
                    : currentFolder.id
                      ? 'Carpeta de documentos'
                      : 'Administra y organiza tus archivos médicos'}
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center min-w-[60px]">
                  <p className="text-xl font-bold">{documents.length}</p>
                  <p className="text-[10px] text-white/70 font-medium">Archivos</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center min-w-[60px]">
                  <p className="text-xl font-bold">{new Set(documents.map(d => d.category)).size}</p>
                  <p className="text-[10px] text-white/70 font-medium">Categorías</p>
                </div>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-2 mt-5 flex-wrap">
              {profile?.role === 'doctor' && !currentFolder.id && (
                <button
                  onClick={() => setAccessReqOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all backdrop-blur-sm"
                >
                  <UserPlus size={15} />
                  Solicitar acceso a paciente
                </button>
              )}
              {profile?.role === 'doctor' && currentFolder.id?.startsWith('shared-') && (
                <button
                  onClick={() => {
                    const senderId = currentFolder.id!.replace('shared-', '')
                    setDocReqEmail(senderEmailMap.get(senderId) || '')
                    setDocReqOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all backdrop-blur-sm"
                >
                  <FileUp size={15} />
                  Solicitar documento
                </button>
              )}
              {!currentFolder.id?.startsWith('shared-') && (
                <button
                  onClick={() => setFolderModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all backdrop-blur-sm"
                >
                  <Plus size={15} />
                  Nueva Carpeta
                </button>
              )}
              {profile?.role === 'patient' && (
                <button
                  onClick={() => setAccessPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all backdrop-blur-sm"
                >
                  <Users size={15} />
                  Accesos
                </button>
              )}
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-primary text-sm font-bold rounded-xl hover:bg-white/90 transition-all shadow-sm"
              >
                <Upload size={15} />
                Subir Documento
              </button>
            </div>
          </div>
        )}

        {/* Search + Filter row */}
        <div className="space-y-2.5">
          {/* Row 1: Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={
                !currentFolder.id
                  ? (profile?.role === 'patient' ? 'Buscar médicos o documentos…' : 'Buscar pacientes o carpetas…')
                  : currentFolder.id.startsWith('shared-')
                    ? (profile?.role === 'patient' ? 'Buscar documentos de tu médico…' : 'Buscar documentos del paciente…')
                    : 'Buscar documentos y carpetas…'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary text-sm transition-all shadow-sm"
            />
          </div>
          {/* Row 2: Filters + ViewToggle */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
              {/* Root: sort pills */}
              {!currentFolder.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSortBy('date')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${sortBy === 'date' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Más reciente
                  </button>
                  <button
                    onClick={() => setSortBy('name')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${sortBy === 'name' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Nombre A–Z
                  </button>
                </div>
              )}
              {/* Inside any folder: category filters */}
              {currentFolder.id && (
                <div className="flex items-center gap-2 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat.value
                          ? 'bg-primary text-white shadow-sm shadow-primary/20'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {getCategoryIcon(cat.value)}
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-sm text-gray-400 overflow-x-auto py-0.5 no-scrollbar">
          <button
            onClick={() => handleBackNavigation(-1)}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation()
              const payload = e.dataTransfer.getData('application/healthpal-doc') || e.dataTransfer.getData('text/plain')
              try {
                const parsed = JSON.parse(payload)
                if (parsed?.docId) handleMoveDocument(parsed.docId, null)
              } catch {
                if (payload) handleMoveDocument(payload, null)
              }
            }}
            className={`hover:text-primary transition-colors whitespace-nowrap ${!currentFolder.id ? 'font-semibold text-gray-700' : ''}`}
          >
            Mis Documentos
          </button>
          {navHistory.map((folder, index) => (
            index > 0 && (
              <React.Fragment key={folder.id}>
                <span className="text-gray-200">/</span>
                <button
                  onClick={() => handleBackNavigation(index)}
                  className="hover:text-primary transition-colors whitespace-nowrap"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            )
          ))}
          {currentFolder.id && (
            <>
              <span className="text-gray-200">/</span>
              <span className="font-semibold text-gray-700 whitespace-nowrap">{currentFolder.name}</span>
            </>
          )}
        </div>

        {/* Documents List/Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-400">Cargando documentos…</p>
          </div>
        ) : filteredDocuments.length === 0 && filteredFolders.length === 0 ? (
          (() => {
            const isPatient = profile?.role === 'patient'
            const isInsideSharedFolder = !!currentFolder.id?.startsWith('shared-')
            const hasResults = documents.length > 0 || folders.length > 0

            let icon = <FileText size={28} className="text-primary/40" />
            let title = 'Sin resultados'
            let desc = 'Intenta ajustar los filtros de búsqueda'
            let action: React.ReactNode = null

            if (hasResults) {
              // Filtered but no match
              title = 'Sin resultados'
              desc = 'Intenta ajustar los filtros de búsqueda'
            } else if (isInsideSharedFolder) {
              icon = <FileText size={28} className="text-primary/40" />
              title = isPatient
                ? 'Este médico aún no ha compartido documentos'
                : 'Este paciente aún no ha compartido documentos'
              desc = isPatient
                ? 'Cuando tu médico comparta estudios o recetas contigo aparecerán aquí.'
                : 'Cuando el paciente suba documentos y los comparta contigo aparecerán aquí.'
            } else if (isPatient) {
              icon = <Users size={28} className="text-primary/40" />
              title = 'Tus médicos aún no han compartido nada'
              desc = 'Aquí verás las carpetas de cada médico que comparta documentos contigo. También puedes subir tus propios archivos.'
              action = (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold text-sm shadow-sm"
                  >
                    <Upload size={16} />
                    Subir documento
                  </button>
                  <button
                    onClick={() => setAccessPanelOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary/30 text-primary rounded-xl hover:bg-primary/5 transition-colors font-semibold text-sm"
                  >
                    <Users size={16} />
                    Ver accesos
                  </button>
                </div>
              )
            } else {
              title = 'Sin documentos aún'
              desc = 'Sube tu primer documento médico para comenzar'
              action = (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold text-sm shadow-sm"
                >
                  <Upload size={16} />
                  Subir Documento
                </button>
              )
            }

            return (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-teal-400/10 flex items-center justify-center">
                  {icon}
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
                <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">{desc}</p>
                {action}
              </div>
            )
          })()
        ) : view === 'list' ? (
          <DocumentsTable
            documents={filteredDocuments}
            folders={filteredFolders}
            onDelete={handleDelete}
            onFolderClick={handleFolderClick}
            onMoveDocument={handleMoveDocument}
            movingDocId={movingDocId}
            onShareDocument={handleShareDocument}
          />
        ) : (
          <DocumentGrid
            documents={filteredDocuments}
            folders={filteredFolders}
            onDeleteDocument={handleDelete}
            onDeleteFolder={handleDeleteFolder}
            onFolderClick={handleFolderClick}
            onRenameFolder={handleRenameFolder}
            onMoveDocument={handleMoveDocument}
            movingDocId={movingDocId}
            onShareDocument={handleShareDocument}
            onShareFolder={profile?.role === 'patient' ? handleShareFolder : undefined}
          />
        )}
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onShare={handleShareDocument}
      />

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => !uploading && setUploadModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {urlMode ? <Link2 size={18} className="text-primary" /> : <Upload size={18} className="text-primary" />}
                <h2 className="text-base font-bold text-gray-900">{urlMode ? 'Guardar Enlace' : 'Subir Documento'}</h2>
              </div>
              <button
                onClick={() => { if (!uploading && !savingUrl) { setUploadModalOpen(false); setUrlMode(false) } }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Banner: saving from patient's shared folder */}
            {currentFolder.id?.startsWith('shared-') && (
              <div className="mx-5 mt-4 flex items-start gap-2 bg-primary/10 text-primary rounded-xl px-3.5 py-2.5 text-xs">
                <Share2 size={14} className="shrink-0 mt-0.5" />
                <span>Este documento se guardará en tu biblioteca y se compartirá automáticamente con <strong>{currentFolder.name}</strong>.</span>
              </div>
            )}

            {/* Toggle: Archivo / Enlace externo */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setUrlMode(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${!urlMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Upload size={14} />
                  Archivo
                </button>
                <button
                  type="button"
                  onClick={() => setUrlMode(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${urlMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Link2 size={14} />
                  Enlace externo
                </button>
              </div>
            </div>

            {urlMode ? (
              <form onSubmit={handleSaveUrl} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">URL del estudio *</label>
                  <input
                    type="url"
                    value={urlForm.url}
                    onChange={e => setUrlForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://radiologia.com/estudio/12345"
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1">Liga de radiología, portal de laboratorio u otro enlace médico.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Título *</label>
                  <input
                    type="text"
                    value={urlForm.title}
                    onChange={e => setUrlForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: TAC de oídos — Abril 2026"
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría *</label>
                  <select
                    value={urlForm.category}
                    onChange={e => setUrlForm(prev => ({ ...prev, category: e.target.value as DocCategory }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-sm transition-all"
                    required
                  >
                    {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <textarea
                    value={urlForm.notes}
                    onChange={e => setUrlForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ej: Resultados normales, sin hallazgos relevantes"
                    rows={2}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setUploadModalOpen(false); setUrlMode(false) }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingUrl}
                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    {savingUrl ? <><Loader2 size={16} className="animate-spin" />Guardando…</> : <><Link2 size={16} />Guardar Enlace</>}
                  </button>
                </div>
              </form>
            ) : (
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              {/* Drop zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Archivo *
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    dragOver
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : uploadForm.file
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                  }`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    const file = e.dataTransfer.files[0]
                    if (file) {
                      const err = validateFile(file, 'document')
                      if (err) { showToast(err, 'error'); return }
                      setUploadForm(prev => ({ ...prev, file, title: prev.title || file.name.replace(/\.[^/.]+$/, '') }))
                    }
                  }}
                >
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.tiff,.heic,.heif,.bmp,.mp4,.mov,.avi,.webm,.mp3,.wav,.m4a,.ogg,.txt,.csv,.dcm"
                    className="hidden"
                    id="file-upload"
                    required
                  />
                  {uploadForm.file ? (
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText size={20} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{uploadForm.file.name}</p>
                        <p className="text-xs text-gray-500">{(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB · Clic para cambiar</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Upload size={22} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Arrastra un archivo o haz clic para seleccionar</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, MP4, MP3 y más · Máx. 50 MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="doc-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Título *
                </label>
                <input
                  id="doc-title"
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                  placeholder="Ej: Radiografía de tórax"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="doc-category" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Categoría *
                </label>
                <select
                  id="doc-category"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value as DocCategory }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-sm transition-all"
                  required
                >
                  {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="doc-notes" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notas <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="doc-notes"
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none text-sm transition-all"
                  placeholder="Agrega notas o observaciones..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.file}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Subiendo…
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Subir Documento
                    </>
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
      {/* Request Patient Access Modal (doctor only) */}
      {accessReqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-primary" />
                <h2 className="text-base font-bold text-gray-900">Solicitar acceso a paciente</h2>
              </div>
              <button onClick={() => { setAccessReqOpen(false); setAccessReqEmail(''); setAccessReqReason('') }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleRequestPatientAccess} className="p-5 space-y-4">
              <p className="text-sm text-gray-500">El paciente recibirá una notificación y podrá aceptar o rechazar tu solicitud desde su configuración.</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo del paciente *</label>
                <input
                  type="email"
                  value={accessReqEmail}
                  onChange={e => setAccessReqEmail(e.target.value)}
                  placeholder="paciente@correo.com"
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Motivo de la solicitud <span className="text-gray-400 font-normal">(opcional)</span></label>
                <textarea
                  value={accessReqReason}
                  onChange={e => setAccessReqReason(e.target.value)}
                  placeholder="Ej: Paciente referido para revisión de estudios previos"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={accessReqLoading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {accessReqLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                Enviar solicitud
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Document Request Modal */}
      {docReqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileUp size={18} className="text-primary" />
                <h2 className="text-base font-bold text-gray-900">Solicitar documento al paciente</h2>
              </div>
              <button onClick={resetDocReqModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {docReqLink ? (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Comparte este enlace con tu paciente. Al abrirlo, se le pedirá crear una cuenta (si no tiene) y subir el documento.
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-gray-700 truncate flex-1 font-mono">{docReqLink}</span>
                  <button
                    onClick={handleCopyDocReqLink}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">El enlace expira en 7 días.</p>
                <button
                  onClick={handleShareViaWhatsApp}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#20bc5a] rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} />
                  Enviar por WhatsApp
                </button>
                <button
                  onClick={resetDocReqModal}
                  className="w-full py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Listo
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateDocRequest} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Correo del paciente</label>
                  <input
                    type="email"
                    value={docReqEmail}
                    onChange={e => setDocReqEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-gray-400 mt-1">No necesita tener cuenta — se le pedirá crearla al abrir el enlace.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">¿Qué documento necesitas?</label>
                  <input
                    type="text"
                    list="doc-type-options-docs"
                    value={docReqType}
                    onChange={e => setDocReqType(e.target.value)}
                    placeholder="Selecciona o escribe el tipo de documento…"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <datalist id="doc-type-options-docs">
                    <option value="Análisis de sangre completo" />
                    <option value="Radiografía" />
                    <option value="Resonancia magnética" />
                    <option value="Tomografía" />
                    <option value="Ultrasonido" />
                    <option value="Receta médica" />
                    <option value="Historial médico" />
                    <option value="Resultados de laboratorio" />
                    <option value="Póliza de seguro médico" />
                    <option value="Electrocardiograma" />
                    <option value="Densitometría ósea" />
                    <option value="Expediente de vacunación" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Instrucción adicional (opcional)</label>
                  <textarea
                    value={docReqDesc}
                    onChange={e => setDocReqDesc(e.target.value)}
                    placeholder="Ej. Análisis de sangre completo del 15 de abril"
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={docReqLoading}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {docReqLoading ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
                  Generar enlace
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* New Folder Modal */}
      {folderModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setFolderModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-primary" />
                <h2 className="text-base font-bold text-gray-900">Nueva Carpeta</h2>
              </div>
              <button
                onClick={() => setFolderModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <div>
                <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre de la carpeta
                </label>
                <input
                  id="folder-name"
                  type="text"
                  autoFocus
                  placeholder="Ej: Análisis de sangre 2024"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFolderModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold text-sm shadow-sm cursor-pointer"
                >
                  Crear Carpeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Share Modal — patient selective sharing */}
      {shareTarget && (
        <ShareModal
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
          title={shareTarget.title}
          ownerId={user?.id || ''}
          documentId={shareTarget.type === 'document' ? shareTarget.id : undefined}
          isFolder={shareTarget.type === 'folder'}
          folderDocCount={shareTarget.documentIds?.length}
          onShare={handleShareSubmit}
          knownDoctors={knownDoctors}
          onRevoked={() => loadContent(currentFolder.id)}
        />
      )}

      {/* Access Panel — patient sees who has access to what */}
      {user && (
        <AccessPanel
          isOpen={accessPanelOpen}
          onClose={() => setAccessPanelOpen(false)}
          ownerId={user.id}
        />
      )}
    </DashboardLayout>
  )
}
