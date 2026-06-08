import React, { useState, useEffect, useRef } from 'react'
import { Upload, Search, FileText, Loader2, Plus, FileUp, X, Activity, Pill, Microscope, ShieldCheck, Users, Link2, Share2, ChevronLeft, UserCircle, UserPlus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '@/app/layout/DashboardLayout'
import ViewToggle from '@/shared/components/ui/ViewToggle'
import DocumentsTable from '@/shared/components/documents/DocumentsTable'
import { DocumentGrid } from '@/shared/components/documents/DocumentGrid'
import { DocumentPreviewModal } from '@/shared/components/documents/DocumentPreviewModal'
import { ShareModal, type KnownDoctor } from '@/shared/components/documents/ShareModal'
import { AccessPanel } from '@/shared/components/documents/AccessPanel'
import { useAuth } from '@/app/providers/AuthContext'
import { getUserDocuments, getDocumentsSharedWithMe, getDocumentsSharedByMeWith, uploadDocument, uploadDocumentEncrypted, deleteDocument, getFolders, createFolder, deleteFolder, updateFolder, updateDocument, shareDocumentWithUser, shareEncryptedDocumentKey, saveExternalUrlDocument, findProfileByEmail } from '@/shared/lib/queries/documents'
import { useCrypto } from '@/context/CryptoContext'
import { getPatientDoctorAccess, getDoctorConsentRequests, requestPatientAccess, reRequestAccess } from '@/shared/lib/queries/consent'
import { createDocumentRequest, getFulfilledRequestDocsByPatient, getPatientsWithFulfilledRequests } from '@/shared/lib/queries/documentRequests'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { validateFile } from '@/shared/lib/errors'
import { isDemoMode } from '@/context/DemoContext'
import type { Database } from '@/shared/types/database'
import { PatientPrescriptionModal } from '@/features/patient/components/PatientPrescriptionModal'
import type { Prescription } from '@/shared/lib/queries/prescriptions'

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
    phone: string | null
    avatar_url: string | null
    role: string | null
    doctor_profile?: { specialty: string | null } | null
  } | null
}

const CATEGORIES = [
  { value: 'all',          label: 'Todos' },
  { value: 'radiology',    label: 'Radiología' },
  { value: 'lab',          label: 'Laboratorio' },
  { value: 'prescription', label: 'Recetas' },
  { value: 'consultation', label: 'Consulta' },
  { value: 'surgery',      label: 'Cirugía' },
  { value: 'vaccine',      label: 'Vacunas' },
  { value: 'referral',     label: 'Referencia' },
  { value: 'history',      label: 'Historial' },
  { value: 'insurance',    label: 'Seguros' },
  { value: 'other',        label: 'Otros' },
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
  const { publicKey: cryptoPublicKey, privateKey } = useCrypto()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFolderApplied = useRef(false)
  const [view, setView] = useState<'list' | 'grid'>('grid')
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [filteredFolders, setFilteredFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const initialFolderParam = searchParams.get('folder')
  const [currentFolder, setCurrentFolder] = useState<{ id: string | null; name: string }>(
    initialFolderParam ? { id: initialFolderParam, name: '…' } : { id: null, name: 'Mis Documentos' }
  )
  const [navHistory, setNavHistory] = useState<{ id: string | null; name: string }[]>(
    initialFolderParam ? [{ id: null, name: 'Mis Documentos' }] : []
  )
  const [currentFolderInfo, setCurrentFolderInfo] = useState<{ avatarUrl?: string | null; subtitle?: string | null } | null>(null)
  const [sharedDocs, setSharedDocs] = useState<Array<{ doc: Document; senderId: string }>>([])
  const [, setSharedFolders] = useState<Folder[]>([])
  const [movingDocId, setMovingDocId] = useState<string | null>(null)
  const [senderEmailMap, setSenderEmailMap] = useState<Map<string, string>>(new Map())
  const [senderPhoneMap, setSenderPhoneMap] = useState<Map<string, string>>(new Map())

  // Request patient access modal (doctor only)
  const [accessReqOpen, setAccessReqOpen] = useState(false)
  const [accessReqEmail, setAccessReqEmail] = useState('')
  const [accessReqReason, setAccessReqReason] = useState('')
  const [accessReqLoading, setAccessReqLoading] = useState(false)

  // Document request modal (doctor only)
  const [docReqOpen, setDocReqOpen] = useState(false)
  const [docReqId, setDocReqId] = useState<string | null>(null)
  const [docReqEmail, setDocReqEmail] = useState('')
  const [docReqPhone, setDocReqPhone] = useState('')
  const [docReqType, setDocReqType] = useState('')
  const [docReqWaLoading, setDocReqWaLoading] = useState(false)
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

  // Patient prescriptions tab
  const [mainTab, setMainTab] = useState<'docs' | 'recetas'>('docs')
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false)
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null)

  const [uploadForm, setUploadForm] = useState<{
    files: File[]
    title: string
    category: DocCategory
    notes: string
    document_date: string
  }>({
    files: [],
    title: '',
    category: 'other',
    notes: '',
    document_date: '',
  })
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

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

  // Debounce search input — filter runs 200ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    filterContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, folders, debouncedSearch, selectedCategory, currentFolder.id, sortBy])

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

  // Load patient prescriptions when tab is selected
  useEffect(() => {
    if (profile?.role !== 'patient' || mainTab !== 'recetas' || prescriptions.length > 0) return
    setPrescriptionsLoading(true)
    supabase
      .from('prescriptions')
      .select('*')
      .eq('is_template', false)
      .order('issued_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setPrescriptions((data ?? []) as Prescription[])
        setPrescriptionsLoading(false)
      })
  }, [profile?.role, mainTab, prescriptions.length])

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

    const rawEntries = (shared as SharedEntry[])
      .map((s) => ({
        doc: s.document as Document,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        senderId: s.sender?.id || (s as any).shared_by || 'shared',
        senderName: s.sender?.full_name || s.sender?.email || '',
        senderEmail: s.sender?.email || '',
        senderPhone: s.sender?.phone || '',
        senderAvatarUrl: s.sender?.avatar_url || null,
        senderRole: s.sender?.role || null,
        senderSpecialty: s.sender?.doctor_profile?.specialty || null,
      }))
      .filter(entry => !!entry.doc)

    // Fallback: if sender join was blocked by RLS, fetch profiles directly by ID
    const missingProfileIds = [...new Set(
      rawEntries.filter(e => !e.senderName && e.senderId !== 'shared').map(e => e.senderId)
    )]
    const fallbackProfileMap = new Map<string, { full_name: string | null; email: string | null; avatar_url: string | null; role: string | null }>()
    if (missingProfileIds.length > 0) {
      const { data: fallbackProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .in('id', missingProfileIds)
      ;(fallbackProfiles || []).forEach((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; role: string | null }) => fallbackProfileMap.set(p.id, p))
    }

    const sharedEntries = rawEntries.map(entry => {
      if (!entry.senderName && fallbackProfileMap.has(entry.senderId)) {
        const fp = fallbackProfileMap.get(entry.senderId)!
        return {
          ...entry,
          senderName: fp.full_name || fp.email || 'Compartido',
          senderEmail: entry.senderEmail || fp.email || '',
          senderAvatarUrl: entry.senderAvatarUrl ?? fp.avatar_url,
          senderRole: entry.senderRole || fp.role,
        }
      }
      return { ...entry, senderName: entry.senderName || 'Compartido' }
    })

    // Build email/phone maps for doc request pre-fill
    const emailMap = new Map<string, string>()
    const phoneMap = new Map<string, string>()
    sharedEntries.forEach(entry => {
      if (entry.senderEmail) emailMap.set(entry.senderId, entry.senderEmail)
      if (entry.senderPhone) phoneMap.set(entry.senderId, entry.senderPhone)
    })
    setSenderEmailMap(emailMap)
    setSenderPhoneMap(phoneMap)

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

    // For doctors at root level: also include consented patients, care-linked patients,
    // and patients with fulfilled document requests
    if (profile?.role === 'doctor' && !folderId) {
      const [consentedPatients, requestPatientIds, careLinksRes] = await Promise.all([
        getDoctorConsentRequests(user.id),
        getPatientsWithFulfilledRequests(),
        supabase
          .from('care_links')
          .select('patient_id, patient:profiles!care_links_patient_id_fkey(id, full_name, avatar_url, email)')
          .eq('doctor_id', user.id)
          .eq('status', 'active'),
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

      // Add care-linked patients (auto-linked when patient shares a document)
      const careLinkedPatients = (careLinksRes.data || []) as Array<{
        patient_id: string
        patient: { id: string; full_name: string | null; avatar_url: string | null; email: string | null } | null
      }>
      careLinkedPatients.forEach(link => {
        const pid = link.patient_id
        const fid = `shared-${pid}`
        if (!existingIds.has(fid)) {
          existingIds.add(fid)
          syntheticSharedFolders.push({
            id: fid,
            name: link.patient?.full_name || link.patient?.email || 'Paciente',
            color: '#33C7BE',
            created_at: new Date().toISOString(),
            avatarUrl: link.patient?.avatar_url ?? null,
            subtitle: null,
            docCount: docCountBySender.get(pid) ?? 0,
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
        ? await getFulfilledRequestDocsByPatient(targetSenderId)
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

    // Update folder name once data is loaded (was set to '…' during init from URL param)
    if (!initialFolderApplied.current && folderId) {
      const paramFolder = searchParams.get('folder')
      if (paramFolder && folderId === paramFolder) {
        initialFolderApplied.current = true
        const match = syntheticSharedFolders.find(f => f.id === paramFolder)
        if (match) {
          setCurrentFolder({ id: match.id, name: match.name })
        }
        setSearchParams({}, { replace: true })
      }
    }
  }

  const filterContent = () => {
    let filtDocs = [...documents]
    let filtFlds = [...folders]

    // Filter by search
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase()
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
        filtDocs = [...filtDocs].sort((a, b) => {
          const dateA = a.document_date || a.created_at
          const dateB = b.document_date || b.created_at
          return new Date(dateB).getTime() - new Date(dateA).getTime()
        })
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

    if (!uploadForm.files.length) {
      showToast('Selecciona al menos un archivo para continuar.', 'warning')
      return
    }

    setUploading(true)
    const total = uploadForm.files.length
    setUploadProgress({ current: 0, total })

    const patientIdForUpload = currentFolder.id?.startsWith('shared-') ? currentFolder.id.replace('shared-', '') : null
    let successCount = 0

    for (let i = 0; i < total; i++) {
      const file = uploadForm.files[i]
      setUploadProgress({ current: i + 1, total })

      const title = total === 1
        ? (uploadForm.title || file.name.replace(/\.[^/.]+$/, ''))
        : file.name.replace(/\.[^/.]+$/, '')

      const uploadMeta = {
        title,
        category: uploadForm.category,
        notes: uploadForm.notes,
        folderId: patientIdForUpload ? null : currentFolder.id,
        patientId: patientIdForUpload,
        documentDate: uploadForm.document_date || null,
      }

      const result = cryptoPublicKey
        ? await uploadDocumentEncrypted(file, user.id, cryptoPublicKey, uploadMeta)
        : await uploadDocument(file, user.id, uploadMeta)

      if (result.success && result.documentId) {
        successCount++

        if (isDemoMode()) continue

        if (currentFolder.id?.startsWith('shared-')) {
          const patientId = currentFolder.id.replace('shared-', '')
          const shareResult = await shareDocumentWithUser(result.documentId, user.id, { userId: patientId }, {
            senderProfile: { full_name: profile?.full_name, email: user.email },
          })
          // If doc was encrypted, re-wrap the DEK with the patient's public key so they can decrypt it
          const recipientId = shareResult?.sharedWithUserId ?? patientId
          if (cryptoPublicKey && privateKey && recipientId) {
            await shareEncryptedDocumentKey(result.documentId, privateKey, recipientId).catch(() => {})
          }
        }
      } else {
        showToast(`${file.name}: ${result.error || 'Error al subir'}`, 'error')
      }
    }

    setUploadProgress(null)

    if (successCount > 0) {
      if (isDemoMode()) {
        showToast(
          successCount === 1 ? 'Documento subido correctamente (demo)' : `${successCount} documentos subidos (demo)`,
          'success'
        )
        setCurrentFolder({ id: null, name: 'Mis Documentos' })
        setNavHistory([])
        setSearchQuery(''); setDebouncedSearch('')
        setSelectedCategory('all')
      } else {
        showToast(
          successCount === total
            ? (total === 1 ? 'Documento subido correctamente' : `${total} documentos subidos correctamente`)
            : `${successCount} de ${total} documentos subidos`,
          successCount === total ? 'success' : 'warning'
        )
      }
      setUploadModalOpen(false)
      setUploadForm({ files: [], title: '', category: 'other', notes: '', document_date: '' })
      loadContent(isDemoMode() ? null : currentFolder.id)
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
    setSearchQuery(''); setDebouncedSearch('')
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
    setSearchQuery(''); setDebouncedSearch('')
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

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/[\s\-().+]/g, '')
    if (digits.startsWith('52') && digits.length === 12) return digits
    if (digits.startsWith('1') && digits.length === 11) return digits
    if (digits.length === 10) return `52${digits}`
    return digits
  }

  const isPhoneValid = (raw: string): boolean => {
    const digits = raw.replace(/[\s\-().+]/g, '')
    return (
      (digits.startsWith('52') && digits.length === 12) ||
      (digits.startsWith('1') && digits.length === 11) ||
      digits.length === 10
    )
  }

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    setDocReqWaLoading(true)
    try {
      const phone = normalizePhone(docReqPhone)
      let requestId = docReqId
      if (!requestId) {
        const { data, error } = await createDocumentRequest(docReqEmail, docReqType, '', phone)
        if (error || !data) {
          showToast(error || 'Error al crear la solicitud', 'error', 3000)
          return
        }
        requestId = data.id
        setDocReqId(requestId)
      }

      const { error: fnErr } = await supabase.functions.invoke('send-document-request-whatsapp', {
        body: {
          document_request_id: requestId,
          patient_phone: phone,
          doctor_name: profile.full_name ?? 'Doctor',
          document_type: docReqType,
          doctor_id: user.id,
        },
      })

      if (fnErr) {
        let detail = 'Error al enviar WhatsApp'
        try {
          const fnErrWithContext = fnErr as { context?: { json?: () => Promise<unknown> } }
          const body = await fnErrWithContext.context?.json?.()
          const bodyData = body as { detail?: string; error?: string } | null
          detail = bodyData?.detail ?? bodyData?.error ?? detail
        } catch { /* ignore */ }
        showToast(`❌ ${detail}`, 'error', 6000)
      } else {
        showToast('✅ Solicitud enviada por WhatsApp al paciente', 'success', 4000)
        resetDocReqModal()
      }
    } catch (err) {
      showToast('❌ Error inesperado al enviar WhatsApp', 'error', 4000)
    } finally {
      setDocReqWaLoading(false)
    }
  }

  const resetDocReqModal = () => {
    setDocReqOpen(false)
    setDocReqId(null)
    setDocReqEmail('')
    setDocReqPhone('')
    setDocReqType('')
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
      // For encrypted documents, also share the decryption key with the recipient
      const recipientId = results.find(r => r.sharedWithUserId)?.sharedWithUserId
      if (privateKey && recipientId) {
        await Promise.allSettled(
          ids.map(docId => shareEncryptedDocumentKey(docId, privateKey, recipientId))
        )
      }
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
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (!selected.length) return

    const validFiles: File[] = []
    for (const file of selected) {
      const err = validateFile(file, 'document')
      if (err) { showToast(`${file.name}: ${err}`, 'error'); continue }
      validFiles.push(file)
    }

    if (validFiles.length) {
      setUploadForm(prev => ({
        ...prev,
        files: [...prev.files, ...validFiles],
        title: prev.files.length === 0 && validFiles.length === 1
          ? (prev.title || validFiles[0].name.replace(/\.[^/.]+$/, ''))
          : prev.title,
      }))
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadForm(prev => {
      const newFiles = prev.files.filter((_, i) => i !== index)
      return {
        ...prev,
        files: newFiles,
        title: newFiles.length === 1 && !prev.title
          ? newFiles[0].name.replace(/\.[^/.]+$/, '')
          : prev.title,
      }
    })
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
              <div className="bg-primary/10 rounded-2xl px-4 py-2.5 text-center border border-primary/10">
                <p className="text-2xl font-black text-gray-900">{prescriptions.length || '—'}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Recetas</p>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-gray-100 rounded-xl p-1 w-fit">
              <button
                onClick={() => setMainTab('docs')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${mainTab === 'docs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Documentos
              </button>
              <button
                onClick={() => setMainTab('recetas')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${mainTab === 'recetas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mis Recetas
              </button>
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
                    setDocReqPhone(senderPhoneMap.get(senderId) || '')
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

        {/* ── Patient: Recetas tab content ── */}
        {profile?.role === 'patient' && !currentFolder.id && mainTab === 'recetas' && (
          <div>
            {prescriptionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <Pill size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aún no tienes recetas</p>
                <p className="text-gray-400 text-sm mt-1">Cuando tu médico te genere una receta aparecerá aquí</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {prescriptions.map(rx => (
                  <button
                    key={rx.id}
                    onClick={() => setViewingPrescription(rx)}
                    className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-primary/40 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Pill size={16} className="text-primary" />
                      </div>
                      {rx.folio && <span className="text-[10px] font-mono text-gray-400">#{rx.folio}</span>}
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                      {rx.medications.length} medicamento{rx.medications.length !== 1 ? 's' : ''}
                    </p>
                    {rx.diagnosis && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{rx.diagnosis}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(rx.issued_at + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search + Filter row — hidden when showing recetas tab */}
        {!(profile?.role === 'patient' && !currentFolder.id && mainTab === 'recetas') && <div className="space-y-2.5">
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
        </div>}

        {/* Breadcrumbs + Documents — hidden when showing recetas tab */}
        {!(profile?.role === 'patient' && !currentFolder.id && mainTab === 'recetas') && <>
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
        ) : (() => {
          // Group documents by year (document_date takes priority over created_at)
          const docsByYear = filteredDocuments.reduce<Record<string, Document[]>>((acc, doc) => {
            const dateStr = doc.document_date || doc.created_at
            const year = new Date(dateStr).getFullYear().toString()
            if (!acc[year]) acc[year] = []
            acc[year].push(doc)
            return acc
          }, {})
          const years = Object.keys(docsByYear).sort((a, b) => Number(b) - Number(a))
          const showYearGroups = years.length > 1 || (years.length === 1 && filteredFolders.length > 0)

          if (view === 'list') {
            return (
              <div className="space-y-6">
                {/* Folders always at top (ungrouped) */}
                {filteredFolders.length > 0 && (
                  <DocumentsTable
                    documents={[]}
                    folders={filteredFolders}
                    onDelete={handleDelete}
                    onFolderClick={handleFolderClick}
                    onMoveDocument={handleMoveDocument}
                    movingDocId={movingDocId}
                    onShareDocument={handleShareDocument}
                  />
                )}
                {years.map(year => (
                  <div key={year}>
                    {showYearGroups && (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{year}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400">{docsByYear[year].length} doc{docsByYear[year].length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <DocumentsTable
                      documents={docsByYear[year]}
                      folders={[]}
                      onDelete={handleDelete}
                      onFolderClick={handleFolderClick}
                      onMoveDocument={handleMoveDocument}
                      movingDocId={movingDocId}
                      onShareDocument={handleShareDocument}
                    />
                  </div>
                ))}
              </div>
            )
          }

          return (
            <div className="space-y-6">
              {/* Folders always at top (ungrouped) */}
              {filteredFolders.length > 0 && (
                <DocumentGrid
                  documents={[]}
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
              {years.map((year, idx) => (
                <div key={year}>
                  {showYearGroups && (
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{year}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400">{docsByYear[year].length} doc{docsByYear[year].length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <DocumentGrid
                    documents={docsByYear[year]}
                    folders={[]}
                    onDeleteDocument={handleDelete}
                    onDeleteFolder={handleDeleteFolder}
                    onFolderClick={handleFolderClick}
                    onRenameFolder={handleRenameFolder}
                    onMoveDocument={handleMoveDocument}
                    movingDocId={movingDocId}
                    onShareDocument={handleShareDocument}
                    onShareFolder={profile?.role === 'patient' ? handleShareFolder : undefined}
                    showSecurityFooter={idx === years.length - 1}
                  />
                </div>
              ))}
            </div>
          )
        })()}
        </>}
      </div>

      {/* Prescription viewer modal */}
      {viewingPrescription && (
        <PatientPrescriptionModal
          prescription={viewingPrescription}
          onClose={() => setViewingPrescription(null)}
        />
      )}

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
                      : uploadForm.files.length > 0
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                  }`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    const dropped = Array.from(e.dataTransfer.files)
                    const validFiles: File[] = []
                    for (const file of dropped) {
                      const err = validateFile(file, 'document')
                      if (err) { showToast(`${file.name}: ${err}`, 'error'); continue }
                      validFiles.push(file)
                    }
                    if (validFiles.length) {
                      setUploadForm(prev => ({
                        ...prev,
                        files: [...prev.files, ...validFiles],
                        title: prev.files.length === 0 && validFiles.length === 1
                          ? (prev.title || validFiles[0].name.replace(/\.[^/.]+$/, ''))
                          : prev.title,
                      }))
                    }
                  }}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.tiff,.heic,.heif,.bmp,.mp4,.mov,.avi,.webm,.mp3,.wav,.m4a,.ogg,.txt,.csv,.dcm"
                    className="hidden"
                    id="file-upload"
                  />
                  {uploadForm.files.length > 0 ? (
                    uploadForm.files.length === 1 ? (
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText size={20} className="text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{uploadForm.files[0].name}</p>
                          <p className="text-xs text-gray-500">{(uploadForm.files[0].size / 1024 / 1024).toFixed(2)} MB · Clic para agregar más</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveFile(0) }}
                          className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-left w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-700">{uploadForm.files.length} archivos seleccionados</p>
                          <button
                            type="button"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            className="text-xs text-primary font-semibold hover:underline"
                          >
                            + Agregar más
                          </button>
                        </div>
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {uploadForm.files.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                              <FileText size={13} className="text-primary shrink-0" />
                              <span className="text-xs text-gray-700 truncate flex-1">{f.name}</span>
                              <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(i)}
                                className="text-gray-400 hover:text-red-500 shrink-0"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Upload size={22} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Arrastra archivos o haz clic para seleccionar</p>
                      <p className="text-xs text-gray-400 mt-1">Puedes seleccionar varios a la vez · PDF, JPG, PNG, MP4 y más · Máx. 10 MB c/u</p>
                    </>
                  )}
                </div>
              </div>

              {/* Title — only for single file */}
              {uploadForm.files.length <= 1 && (
                <div>
                  <label htmlFor="doc-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Título {uploadForm.files.length === 1 ? '*' : ''}
                  </label>
                  <input
                    id="doc-title"
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                    placeholder="Ej: Radiografía de tórax"
                    required={uploadForm.files.length === 1}
                  />
                </div>
              )}

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

              {/* Document Date */}
              <div>
                <label htmlFor="doc-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha del documento <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="doc-date"
                  type="date"
                  value={uploadForm.document_date}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, document_date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">La fecha real del documento, no la de subida (ej. fecha del análisis o receta)</p>
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
                  disabled={uploading || !uploadForm.files.length}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {uploadProgress && uploadProgress.total > 1
                        ? `Subiendo ${uploadProgress.current} de ${uploadProgress.total}…`
                        : 'Subiendo…'}
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {uploadForm.files.length > 1 ? `Subir ${uploadForm.files.length} archivos` : 'Subir Documento'}
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
      {docReqOpen && (() => {
        const WaIcon = ({ size = 16 }: { size?: number }) => (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        )
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                    <WaIcon size={16} />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">Solicitar documento</h2>
                </div>
                <button onClick={resetDocReqModal} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSendWhatsApp} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">WhatsApp del paciente</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <WaIcon size={14} />
                    </span>
                    <input
                      type="tel"
                      value={docReqPhone}
                      onChange={e => setDocReqPhone(e.target.value)}
                      placeholder="52 81 XXXX XXXX"
                      required
                      readOnly={!!senderPhoneMap.get(currentFolder.id?.replace('shared-', '') ?? '')}
                      className={`w-full pl-9 pr-3 py-2.5 text-base sm:text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] ${
                        senderPhoneMap.get(currentFolder.id?.replace('shared-', '') ?? '')
                          ? 'bg-gray-50 border-gray-200 text-gray-500'
                          : 'border-gray-200'
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Correo (opcional)</label>
                  <input
                    type="email"
                    value={docReqEmail}
                    onChange={e => setDocReqEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Documento solicitado</label>
                  <input
                    type="text"
                    list="doc-type-options-docs"
                    value={docReqType}
                    onChange={e => setDocReqType(e.target.value)}
                    placeholder="Ej. Análisis de sangre, Radiografía…"
                    required
                    className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                <button
                  type="submit"
                  disabled={docReqWaLoading || !isPhoneValid(docReqPhone)}
                  className={`w-full py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-1 ${
                    isPhoneValid(docReqPhone) && !docReqWaLoading
                      ? 'bg-[#25D366] hover:bg-[#1db954] text-white active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {docReqWaLoading ? <Loader2 size={15} className="animate-spin" /> : <WaIcon size={16} />}
                  Enviar por WhatsApp
                </button>
              </form>
            </div>
          </div>
        )
      })()}
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
