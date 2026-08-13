import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  FileText,
  Clock,
  Plus,
  StickyNote,
  Phone,
  Mail,
  Activity,
  Scale,
  Ruler,
  Download,
  ChevronRight,
  Loader2,
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  Send,
  Lock,
  FileUp,
  X,
  Copy,
  Check,
  AlertTriangle,
  Heart,
  Stethoscope,
  RefreshCw,
  CalendarDays,
  ClipboardList,
  Printer,
  Pencil,
  Scissors,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import {
  getPatientFullProfile,
  getPatientNotes,
  getPatientContactInfo,
} from '@/features/doctor/services/patients'
import { getClinicalHistory } from '@/shared/lib/queries/clinicalHistory'
import { getPatientProfile } from '@/shared/lib/queries/profile'
import {
  getUserDocuments,
  uploadDocumentForPatient,
  getDoctorDocumentsForPatient,
  getDocumentsSharedByPatientWithDoctor,
} from '@/shared/lib/queries/documents'
import { createDocumentRequest } from '@/shared/lib/queries/documentRequests'
import {
  getConsentForPatient,
  requestPatientAccess,
  ConsentScopes,
} from '@/shared/lib/queries/consent'
import { getPatientInsurancesForDoctor, insuranceDisplayName } from '@/shared/lib/queries/insurance'
import type { PatientInsurance } from '@/shared/types/database'
import { useAuth } from '@/app/providers/AuthContext'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { mapDashboardPath } from '@/context/DemoContext'
import { validateFile } from '@/shared/lib/errors'
import type { DocCategory } from '@/shared/types/database'
import AgendarCitaModal from '@/shared/components/appointments/AgendarCitaModal'
import ClinicalHistoryTab from '@/features/doctor/components/ClinicalHistoryTab'
import GrowthCurvesTab from '@/features/doctor/components/GrowthCurvesTab'
import MedicalReportTab from '@/features/doctor/components/MedicalReportTab'
import { DocumentCard } from '@/shared/components/documents/DocumentCard'
import { DocumentPreviewModal } from '@/shared/components/documents/DocumentPreviewModal'
import { generatePatientSummary } from '@/shared/lib/openai'
import type { ProxyResult } from '@/shared/lib/openai'
import {
  getAppointmentNotesByPatient,
  createAppointmentNote,
  deleteAppointmentNote,
} from '@/shared/lib/queries/appointmentNotes'
import type { AppointmentNote } from '@/shared/lib/queries/appointmentNotes'
import { getNotasEvolucionByPatient } from '@/shared/lib/queries/notasEvolucion'
import type { NotaEvolucion } from '@/shared/lib/queries/notasEvolucion'
import NotaEvolucionForm from '@/features/doctor/components/NotaEvolucionForm'
import { getPrescriptionsByPatient } from '@/shared/lib/queries/prescriptions'
import type { Prescription } from '@/shared/lib/queries/prescriptions'
import RecetaPreview, {
  type DoctorConfig,
  type DesignConfig,
  defaultDoctor,
  defaultDesign,
  printRxElement,
} from '@/features/doctor/components/RecetaPreview'

type TabType =
  | 'summary'
  | 'expediente'
  | 'historia'
  | 'informes'
  | 'consultas'
  | 'recetas'
  | 'curvas'
  | 'cirugias'
type ConsentGate = 'loading' | 'no-consent' | 'requested' | 'rejected' | 'revoked' | 'accepted'

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const initialTab = (() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    const valid: TabType[] = [
      'summary',
      'expediente',
      'historia',
      'informes',
      'consultas',
      'recetas',
      'curvas',
      'cirugias',
    ]
    return valid.includes(t as TabType) ? (t as TabType) : 'summary'
  })()
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [patient, setPatient] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [medProfile, setMedProfile] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notes, setNotes] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [documents, setDocuments] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [doctorDocs, setDoctorDocs] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [patientSharedDocs, setPatientSharedDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Consent state
  const [consentGate, setConsentGate] = useState<ConsentGate>('loading')
  const [scopes, setScopes] = useState<ConsentScopes>({
    share_basic_profile: true,
    share_contact: true,
    share_documents: true,
    share_appointments: true,
    share_medical_notes: true,
    share_insurance: false,
    edit_clinical_history: false,
  })
  const [patientInsurances, setPatientInsurances] = useState<PatientInsurance[]>([])
  const [contactInfo, setContactInfo] = useState<{ email?: string; phone?: string } | null>(null)
  const [requestingAccess, setRequestingAccess] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [showAgendarModal, setShowAgendarModal] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [biometricHistory, setBiometricHistory] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiSummaryAttempted, setAiSummaryAttempted] = useState(false)
  const [aiSummaryNoApiKey, setAiSummaryNoApiKey] = useState(false)
  const [aiSummaryLlmError, setAiSummaryLlmError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clinicalHistorySummary, setClinicalHistorySummary] = useState<any>(null)
  // Consultation notes state
  const [consultationNotes, setConsultationNotes] = useState<AppointmentNote[]>([])
  const [pastAppointments, setPastAppointments] = useState<any[]>([]) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [expandedAppt, setExpandedAppt] = useState<string | null>(null)
  const [newConsultNote, setNewConsultNote] = useState<
    Record<string, { title: string; body: string }>
  >({})
  const [savingConsultNote, setSavingConsultNote] = useState<string | null>(null)
  const [deletingConsultNote, setDeletingConsultNote] = useState<string | null>(null)
  const [loadingConsultNotes, setLoadingConsultNotes] = useState(false)
  const [notasEvolucion, setNotasEvolucion] = useState<Record<string, NotaEvolucion>>({})
  // Prescriptions for this patient
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([])
  const [prescriptionsLoaded, setPrescriptionsLoaded] = useState(false)

  const tabScrollRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  const [tabsAtEnd, setTabsAtEnd] = useState(false)
  const handleTabScroll = () => {
    const el = tabScrollRef.current
    if (!el) return
    setTabsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }

  useEffect(() => {
    if (id && user) {
      checkConsentThenLoad()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  const buildSummaryInput = () => {
    const pProf = medProfile
    const ch = clinicalHistorySummary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ph = ch?.pathological_history as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const psych = ch?.psychiatric_history as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dev = ch?.developmental_history as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nph = ch?.non_pathological_history as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fh = ch?.family_history as any

    const cdDiseases = ph?.cd
      ? Object.entries(ph.cd as Record<string, { present: boolean; year?: string }>)
          .filter(([, v]) => v?.present)
          .map(([k]) => k.replace(/_/g, ' '))
      : []
    const allergiesFromCH = (() => {
      if (!ch?.allergies) return null
      try {
        const arr = JSON.parse(ch.allergies)
        if (Array.isArray(arr)) return arr.map((a: { name: string }) => a.name).join(', ')
      } catch {
        /* legacy */
      }
      return ch.allergies
    })()
    const medsFromCH = ph?.medications?.details || null
    const psychiatricDiagnoses = psych?.applicable
      ? [...(psych.diagnoses || []), psych.diagnoses_other].filter(Boolean).join(', ')
      : null
    const psychiatricMeds =
      psych?.applicable && psych.current_psychiatric_meds?.present
        ? psych.current_psychiatric_meds.details
        : null
    const developmentalNotes = dev?.applicable
      ? [
          dev.birth_type ? `Parto ${dev.birth_type}` : null,
          dev.motor_milestones && dev.motor_milestones !== 'normal'
            ? `Motor: ${dev.motor_milestones.replace(/_/g, ' ')}`
            : null,
          dev.language_milestones && dev.language_milestones !== 'normal'
            ? `Lenguaje: ${dev.language_milestones.replace(/_/g, ' ')}`
            : null,
          dev.cognitive_development && dev.cognitive_development !== 'normal'
            ? `Cognitivo: ${dev.cognitive_development.replace(/_/g, ' ')}`
            : null,
        ]
          .filter(Boolean)
          .join('; ')
      : null

    // Non-pathological
    const smokingMap: Record<string, string> = {
      never: 'No fumador',
      ex: 'Ex-fumador',
      occasional: 'Ocasional',
      moderate: 'Moderado',
      heavy: 'Fuerte',
    }
    const smokingStatus = nph?.smoking?.present
      ? `Fumador${nph.smoking.frequency ? ` (${smokingMap[nph.smoking.frequency] ?? nph.smoking.frequency})` : ''}${nph.smoking.details ? `: ${nph.smoking.details}` : ''}`
      : nph?.smoking
        ? 'No fumador'
        : null
    const alcoholUse = nph?.alcohol?.present
      ? `Consume alcohol${nph.alcohol.frequency_per_week ? ` (${nph.alcohol.frequency_per_week} veces/semana)` : ''}${nph.alcohol.cups_per_day ? `, ${nph.alcohol.cups_per_day} copas/día` : ''}`
      : null

    // Family history
    const familyDiseases = fh
      ? Object.entries(fh as Record<string, { present: boolean; relative?: string }>)
          .filter(([, v]) => (v as { present?: boolean })?.present)
          .map(
            ([k, v]) =>
              `${k.replace(/_/g, ' ')}${(v as { relative?: string }).relative ? ` (${(v as { relative?: string }).relative})` : ''}`,
          )
      : []
    const familyHistory = familyDiseases.length ? familyDiseases.join(', ') : null

    // Surgeries / hospitalizations
    const surgeries = ph?.surgeries?.present ? ph.surgeries.details || 'Sí (sin detalle)' : null
    const hospitalizations = ph?.hospitalizations?.present
      ? ph.hospitalizations.details || 'Sí (sin detalle)'
      : null

    // Recent notes content (last 3)
    const recentNotesSummary =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (notes as any[])
        .slice(0, 3)
        .filter((n) => n.title || n.body)
        .map(
          (n) =>
            `[${n.created_at ? new Date(n.created_at).toLocaleDateString('es-MX') : ''}] ${n.title || ''}: ${String(n.body || '').slice(0, 200)}`,
        )
        .join(' | ') || null

    // BMI
    const heightM = pProf?.height_cm ? pProf.height_cm / 100 : null
    const bmi =
      heightM && pProf?.weight_kg
        ? Math.round((pProf.weight_kg / (heightM * heightM)) * 10) / 10
        : null

    // Last appointment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastAppt = (pastAppointments as any[])[0]
    const lastAppointmentDate = lastAppt?.scheduled_at
      ? new Date(lastAppt.scheduled_at).toLocaleDateString('es-MX')
      : null

    return {
      name: patient.full_name,
      age: patient.birthdate
        ? Math.floor((Date.now() - new Date(patient.birthdate).getTime()) / 31557600000)
        : null,
      sex: patient.sex,
      bloodType: pProf?.blood_type,
      height: pProf?.height_cm,
      weight: pProf?.weight_kg,
      bmi,
      chronicConditions: cdDiseases.length
        ? cdDiseases.join(', ')
        : pProf?.chronic_conditions || null,
      allergies: allergiesFromCH || pProf?.allergies || null,
      medications: medsFromCH || pProf?.current_medications || null,
      documentCount: documents.length,
      noteCount: notes.length,
      lastNoteDate: notes[0]?.created_at
        ? new Date(notes[0].created_at).toLocaleDateString('es-MX')
        : null,
      upcomingAppointments: upcomingAppointments.length,
      totalAppointments: pastAppointments.length,
      lastAppointmentDate,
      psychiatricDiagnoses: psychiatricDiagnoses || null,
      psychiatricMeds: psychiatricMeds || null,
      developmentalNotes: developmentalNotes || null,
      smokingStatus,
      alcoholUse,
      familyHistory,
      recentNotesSummary,
      patientObservations: ch?.patient_observations || null,
      surgeries,
      hospitalizations,
    }
  }

  const applyAiSummaryResult = (res: ProxyResult) => {
    setAiSummaryNoApiKey(res.noApiKey === true)
    setAiSummaryLlmError(res.llmError ?? null)
    setAiSummary(res.value)
  }

  useEffect(() => {
    if (!patient || loading) return
    setAiSummary(null)
    setAiSummaryNoApiKey(false)
    setAiSummaryLlmError(null)
    setAiSummaryLoading(true)
    setAiSummaryAttempted(true)
    generatePatientSummary(buildSummaryInput())
      .then(applyAiSummaryResult)
      .finally(() => {
        setAiSummaryLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, loading])

  async function checkConsentThenLoad() {
    setLoading(true)
    try {
      // Step 1: Check consent FIRST — never load patient data without it
      const consent = await getConsentForPatient(user!.id, id!)

      if (!consent) {
        setConsentGate('no-consent')
        setLoading(false)
        return
      }

      if (consent.status === 'requested') {
        setConsentGate('requested')
        setLoading(false)
        return
      }
      if (consent.status === 'rejected') {
        setConsentGate('rejected')
        setLoading(false)
        return
      }
      if (consent.status === 'revoked') {
        setConsentGate('revoked')
        setLoading(false)
        return
      }

      // Status === 'accepted' — read actual scopes from consent row
      const liveScopes: ConsentScopes = {
        share_basic_profile: consent.share_basic_profile ?? true,
        share_contact: consent.share_contact ?? false,
        share_documents: consent.share_documents ?? false,
        share_appointments: consent.share_appointments ?? false,
        share_medical_notes: consent.share_medical_notes ?? false,
        share_insurance: consent.share_insurance ?? false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edit_clinical_history: (consent as any).edit_clinical_history ?? false,
      }
      setConsentGate('accepted')
      setScopes(liveScopes)

      // Pass liveScopes directly — React state (scopes) is still stale here
      await loadPatientData(liveScopes)
    } catch (err) {
      logger.error('PatientDetail.consentCheck', err)
      setConsentGate('no-consent')
      setLoading(false)
    }
  }

  async function loadPatientData(scopesOverride?: ConsentScopes) {
    const s = scopesOverride ?? scopes
    try {
      // 1. Critical: basic profile (RLS will still block if no consent)
      const profile = await getPatientFullProfile(id!)
      if (!profile) {
        setPatient(null)
        setLoading(false)
        return
      }
      setPatient(profile)

      // 2. Load additional data ONLY for granted scopes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promises: Promise<any>[] = []
      const keys: string[] = []

      // Medical profile: always try if basic profile is granted
      promises.push(
        getPatientProfile(id!).catch((e) => {
          logger.error('PatientDetail.medProfile', e)
          return null
        }),
      )
      keys.push('medProfile')

      if (s.share_medical_notes) {
        promises.push(
          getPatientNotes(id!, user!.id).catch((e) => {
            logger.error('PatientDetail.notes', e)
            return []
          }),
        )
        keys.push('notes')
      }

      if (s.share_documents) {
        promises.push(
          getUserDocuments(id!, null, true).catch((e) => {
            logger.error('PatientDetail.docs', e)
            return []
          }),
        )
        keys.push('documents')
        promises.push(
          getDoctorDocumentsForPatient(id!).catch((e) => {
            logger.error('PatientDetail.doctorDocs', e)
            return []
          }),
        )
        keys.push('doctorDocs')
        promises.push(
          getDocumentsSharedByPatientWithDoctor(user!.id, id!).catch((e) => {
            logger.error('PatientDetail.patientSharedDocs', e)
            return []
          }),
        )
        keys.push('patientSharedDocs')
      }

      if (s.share_contact) {
        promises.push(
          getPatientContactInfo(id!).catch((e) => {
            logger.error('PatientDetail.contact', e)
            return null
          }),
        )
        keys.push('contact')
      }

      if (s.share_insurance) {
        promises.push(
          getPatientInsurancesForDoctor(id!).catch((e) => {
            logger.error('PatientDetail.insurances', e)
            return []
          }),
        )
        keys.push('insurances')
      }

      if (s.share_medical_notes) {
        promises.push(
          Promise.resolve(
            supabase
              .from('patient_biometric_history')
              .select('*')
              .eq('patient_id', id!)
              .order('recorded_at', { ascending: false })
              .limit(5)
              .then(({ data }) => data ?? []),
          ).catch(() => []),
        )
        keys.push('biometrics')
      }

      // Always fetch upcoming appointments for this patient+doctor
      promises.push(
        Promise.resolve(
          supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', user!.id)
            .eq('patient_id', id!)
            .neq('status', 'cancelled')
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(5)
            .then(({ data }) => data ?? []),
        ).catch(() => []),
      )
      keys.push('upcoming')

      // Past appointments for consultation notes
      promises.push(
        Promise.resolve(
          supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', user!.id)
            .eq('patient_id', id!)
            .neq('status', 'cancelled')
            .lt('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: false })
            .limit(50)
            .then(({ data }) => data ?? []),
        ).catch(() => []),
      )
      keys.push('pastAppointments')

      // Clinical history for AI summary
      promises.push(getClinicalHistory(id!).catch(() => null))
      keys.push('clinicalHistory')

      const results = await Promise.all(promises)
      if (!mountedRef.current) return
      keys.forEach((key, i) => {
        switch (key) {
          case 'medProfile':
            setMedProfile(results[i])
            break
          case 'notes':
            setNotes(results[i] || [])
            break
          case 'documents':
            setDocuments(results[i] || [])
            break
          case 'doctorDocs':
            setDoctorDocs(results[i] || [])
            break
          case 'patientSharedDocs':
            setPatientSharedDocs(results[i] || [])
            break
          case 'contact':
            setContactInfo(results[i])
            break
          case 'insurances':
            setPatientInsurances(results[i] || [])
            break
          case 'biometrics':
            setBiometricHistory(results[i] || [])
            break
          case 'upcoming':
            setUpcomingAppointments(results[i] || [])
            break
          case 'pastAppointments':
            setPastAppointments(results[i] || [])
            break
          case 'clinicalHistory':
            setClinicalHistorySummary(results[i])
            break
        }
      })
    } catch (err) {
      logger.error('PatientDetail.load', err)
      showToast('Error al cargar el expediente', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAccess = async () => {
    if (!user || !id) return
    setRequestingAccess(true)
    const { ok, error } = await requestPatientAccess(user.id, id, requestReason)
    if (ok) {
      showToast(
        'Solicitud enviada. El paciente decidirá qué información compartir.',
        'success',
        4000,
      )
      setConsentGate('requested')
    } else {
      showToast(error || 'Error al solicitar acceso', 'error', 3000)
    }
    setRequestingAccess(false)
  }

  const loadConsultationNotes = async () => {
    if (!id) return
    setLoadingConsultNotes(true)
    try {
      const [notes, soaps] = await Promise.all([
        getAppointmentNotesByPatient(id),
        getNotasEvolucionByPatient(id).catch(() => [] as NotaEvolucion[]),
      ])
      setConsultationNotes(notes)
      const soapMap: Record<string, NotaEvolucion> = {}
      for (const n of soaps) soapMap[n.appointment_id] = n
      setNotasEvolucion(soapMap)
    } catch (err) {
      logger.error('loadConsultationNotes', err)
    } finally {
      setLoadingConsultNotes(false)
    }
  }

  const handleSaveConsultNote = async (appointmentId: string) => {
    const draft = newConsultNote[appointmentId]
    if (!draft?.body?.trim()) return
    setSavingConsultNote(appointmentId)
    try {
      const note = await createAppointmentNote(appointmentId, draft.body, draft.title || undefined)
      setConsultationNotes((prev) => [note, ...prev])
      setNewConsultNote((prev) => ({ ...prev, [appointmentId]: { title: '', body: '' } }))
      showToast('Nota de consulta guardada', 'success')
    } catch (err) {
      showToast('Error al guardar la nota', 'error')
    } finally {
      setSavingConsultNote(null)
    }
  }

  const handleDeleteConsultNote = async (noteId: string) => {
    setDeletingConsultNote(noteId)
    try {
      await deleteAppointmentNote(noteId)
      setConsultationNotes((prev) => prev.filter((n) => n.id !== noteId))
      showToast('Nota eliminada', 'success')
    } catch (err) {
      showToast('Error al eliminar la nota', 'error')
    } finally {
      setDeletingConsultNote(null)
    }
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'consultas' && consultationNotes.length === 0 && !loadingConsultNotes) {
      void loadConsultationNotes()
    }
    if (tab === 'recetas' && !prescriptionsLoaded && id) {
      setPrescriptionsLoaded(true)
      getPrescriptionsByPatient(id)
        .then(setPatientPrescriptions)
        .catch(() => {})
    }
  }

  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return 'N/A'
    const today = new Date()
    const birthDate = new Date(birthdate)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // ── Consent Gate Screens ──────────────────────────────────────
  if (loading || consentGate === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Verificando permisos...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!patient && consentGate === 'accepted') {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-red-500 font-bold">No se encontró el paciente solicitado.</p>
          <button
            onClick={() => navigate(mapDashboardPath('/dashboard'))}
            className="mt-4 text-primary hover:underline"
          >
            Volver al dashboard
          </button>
        </div>
      </DashboardLayout>
    )
  }

  // ── Consent Denied / Pending Screens ──────────────────────────
  if (consentGate !== 'accepted') {
    const isRequested = consentGate === 'requested'
    const isRejected = consentGate === 'rejected'
    const isRevoked = consentGate === 'revoked'
    const noRelationship = consentGate === 'no-consent'

    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-16">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Volver</span>
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              {isRequested ? (
                <Clock className="w-8 h-8 text-blue-500" />
              ) : isRejected || isRevoked ? (
                <ShieldX className="w-8 h-8 text-orange-500" />
              ) : (
                <ShieldAlert className="w-8 h-8 text-gray-400" />
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isRequested
                ? 'Solicitud pendiente'
                : isRejected
                  ? 'Acceso denegado'
                  : isRevoked
                    ? 'Acceso revocado'
                    : 'Acceso requerido'}
            </h2>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              {isRequested
                ? 'Tu solicitud de acceso está en revisión. El paciente decidirá qué información compartir contigo.'
                : isRejected
                  ? 'El paciente ha rechazado tu solicitud de acceso. Puedes enviar una nueva solicitud.'
                  : isRevoked
                    ? 'El paciente ha revocado tu acceso a su expediente. Puedes solicitar acceso nuevamente.'
                    : 'Para ver el expediente de este paciente, necesitas solicitar su autorización.'}
            </p>

            {isRequested ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-lg">
                <Clock size={16} />
                Esperando respuesta del paciente
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Motivo de la solicitud (opcional)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={handleRequestAccess}
                  disabled={requestingAccess}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-all"
                >
                  {requestingAccess ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  {noRelationship ? 'Solicitar acceso' : 'Re-solicitar acceso'}
                </button>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const patientProfilesRaw = patient.patient_profiles
  const pProfile =
    (Array.isArray(patientProfilesRaw) ? patientProfilesRaw[0] : patientProfilesRaw) || {}

  const totalDocs = new Set([...documents, ...doctorDocs, ...patientSharedDocs].map((d) => d.id))
    .size

  const allergies = (medProfile?.allergies ?? pProfile?.allergies ?? '').trim()
  const conditions = (medProfile?.chronic_conditions ?? pProfile?.chronic_conditions ?? '').trim()
  const meds = (medProfile?.current_medications ?? pProfile?.current_medications ?? '').trim()
  const hasAllergy = !!(allergies && !['ninguna', 'no', 'n/a'].includes(allergies.toLowerCase()))
  const hasCondition = !!(
    conditions && !['ninguna', 'no', 'n/a'].includes(conditions.toLowerCase())
  )

  const initials = (patient.full_name ?? 'P')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <DashboardLayout>
      <div className="-m-4 md:-m-6 lg:-m-8 min-h-screen bg-gray-50/60 flex flex-col">
        {/* ── Top bar ──────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate(-1)}
            title="Volver a pacientes"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Expediente clínico
            </p>
            <h1 className="text-base font-black text-gray-900 leading-tight truncate">
              {patient.full_name || 'Paciente'}
            </h1>
          </div>
          <button
            onClick={() => setShowAgendarModal(true)}
            title="Agendar nueva cita para este paciente"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#33C7BE] text-white font-bold text-xs rounded-xl hover:bg-teal-600 transition-colors shadow-sm flex-shrink-0"
          >
            <CalendarDays size={14} />
            <span>Agendar cita</span>
          </button>
        </div>

        {/* ── Alert strip ──────────────────────────────────── */}
        {(hasAllergy || hasCondition) && (
          <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-2.5 flex flex-wrap gap-4 flex-shrink-0">
            {hasAllergy && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                ⚠️ Alergia: <span className="font-semibold">{allergies}</span>
              </span>
            )}
            {hasCondition && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-orange-700">
                🫀 Condición: <span className="font-semibold">{conditions}</span>
              </span>
            )}
          </div>
        )}

        {/* ── Body: sidebar + main ──────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── LEFT SIDEBAR ─────────────────────────────── */}
          <aside className="hidden lg:flex flex-col w-64 xl:w-68 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
            {/* ── Patient hero ── */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#33C7BE]/20 to-cyan-100 flex items-center justify-center shadow-sm flex-shrink-0">
                  {patient.avatar_url ? (
                    <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-[#33C7BE]">{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-black text-gray-900 leading-tight truncate">
                    {patient.full_name || 'Paciente'}
                  </h2>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={9} /> Acceso autorizado
                  </span>
                </div>
              </div>

              {/* Compact stats row */}
              <div className="flex items-center gap-2 flex-wrap">
                {!!patient.birthdate && (
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    {calculateAge(patient.birthdate)}{' '}
                    <span className="font-normal text-gray-400">años</span>
                  </span>
                )}
                {patient.sex && (
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    {patient.sex === 'male' ? '♂ Hombre' : '♀ Mujer'}
                  </span>
                )}
                {(medProfile?.blood_type || pProfile.blood_type) && (
                  <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                    🩸 {medProfile?.blood_type || pProfile.blood_type}
                  </span>
                )}
              </div>

              {/* Height / Weight */}
              {(medProfile?.height_cm ??
                pProfile.height_cm ??
                medProfile?.weight_kg ??
                pProfile.weight_kg) && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                  {(medProfile?.height_cm ?? pProfile.height_cm) && (
                    <div className="flex items-center gap-1.5">
                      <Ruler size={11} className="text-gray-300" />
                      <span className="text-sm font-black text-gray-800">
                        {medProfile?.height_cm ?? pProfile.height_cm}
                      </span>
                      <span className="text-[10px] text-gray-400">cm</span>
                    </div>
                  )}
                  {(medProfile?.weight_kg ?? pProfile.weight_kg) && (
                    <div className="flex items-center gap-1.5">
                      <Scale size={11} className="text-gray-300" />
                      <span className="text-sm font-black text-gray-800">
                        {medProfile?.weight_kg ?? pProfile.weight_kg}
                      </span>
                      <span className="text-[10px] text-gray-400">kg</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Contact ── */}
            {scopes.share_contact && (contactInfo?.email || contactInfo?.phone) && (
              <div className="px-5 py-3 border-t border-gray-100 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Contacto
                </p>
                {contactInfo?.email && (
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="flex items-center gap-2 text-xs text-gray-600 hover:text-[#33C7BE] transition-colors truncate"
                  >
                    <Mail size={12} className="text-gray-300 flex-shrink-0" />
                    <span className="truncate">{contactInfo.email}</span>
                  </a>
                )}
                {contactInfo?.phone && (
                  <div className="flex items-center justify-between">
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="flex items-center gap-2 text-xs text-gray-600 hover:text-[#33C7BE] transition-colors"
                    >
                      <Phone size={12} className="text-gray-300 flex-shrink-0" />
                      <span>{contactInfo.phone}</span>
                    </a>
                    <a
                      href={`https://wa.me/${contactInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${patient.full_name?.split(' ')[0] ?? ''}, le contacto de parte de su médico.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold rounded-lg transition-colors flex-shrink-0"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WA
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* ── Emergency contact ── */}
            {scopes.share_contact &&
              (medProfile?.emergency_contact_name || medProfile?.emergency_contact_phone) && (
                <div className="px-5 py-3 border-t border-gray-100 space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Emergencia
                  </p>
                  {medProfile?.emergency_contact_name && (
                    <p className="text-xs font-semibold text-gray-700">
                      {medProfile.emergency_contact_name}
                    </p>
                  )}
                  {medProfile?.emergency_contact_phone && (
                    <div className="flex items-center justify-between">
                      <a
                        href={`tel:${medProfile.emergency_contact_phone}`}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#33C7BE] transition-colors"
                      >
                        <Phone size={11} className="text-gray-300" />
                        {medProfile.emergency_contact_phone}
                      </a>
                      <a
                        href={`https://wa.me/${medProfile.emergency_contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, le contactamos por el paciente ${patient.full_name ?? ''}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold rounded-lg transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WA
                      </a>
                    </div>
                  )}
                </div>
              )}

            {/* ── Insurance ── */}
            {scopes.share_insurance && patientInsurances.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Seguro médico
                </p>
                {patientInsurances.map((ins) => (
                  <div
                    key={ins.id}
                    className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 space-y-1"
                  >
                    <p className="text-xs font-bold text-gray-900">{insuranceDisplayName(ins)}</p>
                    {ins.policy_number && (
                      <p className="text-[10px] text-gray-500">Póliza: {ins.policy_number}</p>
                    )}
                    {ins.valid_until && (
                      <p className="text-[10px] text-gray-500">Vigente hasta: {ins.valid_until}</p>
                    )}
                    {ins.phone_emergency && (
                      <a
                        href={`tel:${ins.phone_emergency}`}
                        className="text-[10px] text-teal-600 hover:underline block"
                      >
                        Urgencias: {ins.phone_emergency}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!scopes.share_insurance &&
              scopes.share_medical_notes &&
              (medProfile?.insurance_provider || pProfile?.insurance_provider) && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Seguro médico
                  </p>
                  <p className="text-xs font-semibold text-gray-800">
                    {medProfile?.insurance_provider || pProfile?.insurance_provider}
                  </p>
                </div>
              )}

            {/* ── Biometric history ── */}
            {scopes.share_medical_notes && biometricHistory.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Historial biométrico
                </p>
                <div className="space-y-1.5">
                  {biometricHistory.slice(0, 3).map((b, i) => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${i === 0 ? 'bg-teal-50' : 'bg-gray-50'}`}
                    >
                      <span className="text-gray-400 text-[10px]">
                        {new Date(b.recorded_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                      <div className="flex items-center gap-3">
                        {b.weight_kg && (
                          <span className="font-bold text-gray-700">{b.weight_kg} kg</span>
                        )}
                        {b.height_cm && (
                          <span className="font-bold text-gray-700">{b.height_cm} cm</span>
                        )}
                        {i === 0 && (
                          <span className="text-[9px] font-bold text-teal-600">Rec.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Upcoming appointments ── */}
            {upcomingAppointments.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Próximas citas
                </p>
                <div className="space-y-1.5">
                  {upcomingAppointments.slice(0, 3).map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl"
                    >
                      <CalendarDays size={11} className="text-[#33C7BE] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700">
                          {new Date(appt.scheduled_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' · '}
                          {new Date(appt.scheduled_at).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'America/Mexico_City',
                          })}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {appt.mode === 'in_person'
                            ? 'Presencial'
                            : appt.mode === 'video'
                              ? 'Video'
                              : 'Llamada'}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${appt.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}
                      >
                        {appt.status === 'confirmed' ? 'Confirm.' : 'Pend.'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy footer */}
            <div className="mt-auto px-5 py-3 border-t border-gray-100 flex items-center gap-2">
              <Lock size={10} className="text-gray-300 flex-shrink-0" />
              <p className="text-[10px] text-gray-400">AES-256 · Privado</p>
            </div>
          </aside>

          {/* ── MAIN CONTENT ─────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Mobile: compact patient card */}
            <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#33C7BE]/10 flex items-center justify-center flex-shrink-0">
                  {patient.avatar_url ? (
                    <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-[#33C7BE]">{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      {calculateAge(patient.birthdate)} años
                    </span>
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      {patient.sex === 'male' ? '♂' : '♀'}
                    </span>
                    {(medProfile?.blood_type || pProfile.blood_type) && (
                      <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        🩸 {medProfile?.blood_type || pProfile.blood_type}
                      </span>
                    )}
                  </div>
                  {scopes.share_contact && contactInfo?.email && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{contactInfo.email}</p>
                  )}
                </div>
              </div>
              {/* Mobile quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={scopes.share_documents ? () => setActiveTab('expediente') : undefined}
                  className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2"
                >
                  <FileText size={14} className="text-blue-400" />
                  <span className="text-sm font-black text-gray-900">
                    {scopes.share_documents ? totalDocs : '—'}
                  </span>
                  <span className="text-xs text-gray-400">docs</span>
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="relative flex-shrink-0 border-b border-gray-200 bg-white">
              <div
                ref={tabScrollRef}
                onScroll={handleTabScroll}
                className="flex gap-0 overflow-x-auto px-4 sm:px-6"
                style={{ scrollbarWidth: 'none' }}
              >
                {[
                  { id: 'summary', label: 'Resumen', icon: Activity, enabled: true },
                  {
                    id: 'historia',
                    label: 'Historial Clínico',
                    icon: ClipboardList,
                    enabled: true,
                  },
                  { id: 'consultas', label: 'Consultas', icon: CalendarDays, enabled: true },
                  { id: 'informes', label: 'Informes', icon: FileText, enabled: true },
                  {
                    id: 'expediente',
                    label: 'Expediente',
                    icon: FileText,
                    enabled: scopes.share_documents,
                  },
                  { id: 'recetas', label: 'Recetas', icon: ClipboardList, enabled: true },
                  { id: 'cirugias', label: 'Cirugías', icon: Scissors, enabled: true },
                  {
                    id: 'curvas',
                    label: 'Curvas de crecimiento',
                    icon: Activity,
                    enabled: patient.birthdate
                      ? (Date.now() - new Date(patient.birthdate).getTime()) / 31557600000 < 19
                      : false,
                  },
                ]
                  .filter((t) => t.enabled)
                  .map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() =>
                        (tab as { navigateTo?: string }).navigateTo
                          ? navigate((tab as { navigateTo?: string }).navigateTo!)
                          : handleTabChange(tab.id as TabType)
                      }
                      className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all flex-shrink-0 ${
                        activeTab === tab.id
                          ? 'border-[#33C7BE] text-[#33C7BE]'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                      {tab.id === 'expediente' && scopes.share_documents && totalDocs > 0 && (
                        <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {totalDocs}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
              {/* Scroll hint: right fade + chevron, hidden on lg or when scrolled to end */}
              <div
                className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 flex items-center justify-end pr-1 bg-gradient-to-l from-white via-white/80 to-transparent transition-opacity duration-200 lg:hidden ${tabsAtEnd ? 'opacity-0' : 'opacity-100'}`}
              >
                <ChevronRight size={14} className="text-gray-400" />
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 p-4 sm:p-6">
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* AI Clinical Summary */}
                  <div className="relative overflow-hidden rounded-2xl border border-[#33C7BE]/20 bg-gradient-to-br from-[#33C7BE]/5 to-teal-50/60 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#33C7BE]/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs">✦</span>
                        </div>
                        <span className="text-xs font-bold text-[#33C7BE] uppercase tracking-widest">
                          Resumen IA
                        </span>
                      </div>
                      {!aiSummaryLoading && (
                        <button
                          onClick={() => {
                            if (!patient) return
                            setAiSummary(null)
                            setAiSummaryNoApiKey(false)
                            setAiSummaryLlmError(null)
                            setAiSummaryLoading(true)
                            setAiSummaryAttempted(true)
                            generatePatientSummary(buildSummaryInput())
                              .then(applyAiSummaryResult)
                              .finally(() => setAiSummaryLoading(false))
                          }}
                          title="Volver a generar el resumen clínico con IA"
                          className="text-[10px] font-semibold text-[#33C7BE] hover:text-teal-700 flex items-center gap-1 flex-shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" /> Regenerar resumen
                        </button>
                      )}
                    </div>
                    {aiSummaryLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-4 h-4 text-[#33C7BE] animate-spin flex-shrink-0" />
                        <span className="text-sm text-gray-400">Generando resumen clínico...</span>
                      </div>
                    ) : aiSummary ? (
                      <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
                    ) : aiSummaryNoApiKey ? (
                      <p className="text-sm text-amber-600 italic">
                        Servicio de IA no configurado. Contacta al administrador para activar la
                        clave de API.
                      </p>
                    ) : aiSummaryLlmError === 'LLM_WRONG_ENDPOINT' ? (
                      <p className="text-sm text-amber-600 italic">
                        Configuración incorrecta: clave de OpenRouter pero endpoint apunta a OpenAI.
                        Configura OPENAI_BASE_URL=https://openrouter.ai/api/v1 en Supabase.
                      </p>
                    ) : aiSummaryLlmError === 'LLM_AUTH_ERROR' ? (
                      <p className="text-sm text-amber-600 italic">
                        Clave de API de IA inválida o revocada. Verifica la configuración.
                      </p>
                    ) : aiSummaryLlmError === 'LLM_QUOTA_ERROR' ? (
                      <p className="text-sm text-amber-600 italic">
                        Cuota de API de IA agotada. Recarga créditos en platform.openai.com.
                      </p>
                    ) : aiSummaryAttempted ? (
                      <p className="text-sm text-amber-600 italic">
                        No se pudo generar el resumen. Intenta de nuevo.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Generando resumen clínico...</p>
                    )}
                  </div>

                  {/* Clinical signals */}
                  {(() => {
                    const lastNote = notes[0]
                    const signals: {
                      type: 'danger' | 'warning' | 'info' | 'neutral'
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      icon: any
                      label: string
                      value: string
                      action?: string
                    }[] = []

                    if (hasAllergy)
                      signals.push({
                        type: 'danger',
                        icon: AlertTriangle,
                        label: 'Alergia conocida',
                        value: allergies,
                        action: 'Verificar antes de prescribir',
                      })
                    if (hasCondition)
                      signals.push({
                        type: 'warning',
                        icon: Heart,
                        label: 'Condición crónica activa',
                        value: conditions,
                        action: 'Monitoreo continuo recomendado',
                      })
                    if (meds && !['ninguno', 'no'].includes(meds.toLowerCase())) {
                      signals.push({
                        type: 'info',
                        icon: Stethoscope,
                        label: 'Medicación en curso',
                        value: meds,
                        action: 'Revisar posibles interacciones',
                      })
                    }
                    if (scopes.share_medical_notes && lastNote) {
                      const daysSince = Math.floor(
                        (Date.now() - new Date(lastNote.created_at).getTime()) / 86400000,
                      )
                      if (daysSince > 60)
                        signals.push({
                          type: 'neutral',
                          icon: RefreshCw,
                          label: 'Seguimiento pendiente',
                          value: `Sin notas desde hace ${daysSince} días`,
                          action: 'Considera agregar una nota',
                        })
                    } else if (scopes.share_medical_notes && notes.length === 0) {
                      signals.push({
                        type: 'neutral',
                        icon: StickyNote,
                        label: 'Sin historial de evolución',
                        value: 'No hay notas clínicas aún',
                        action: 'Agrega la primera nota para iniciar el expediente',
                      })
                    }

                    if (signals.length === 0)
                      return (
                        <div className="flex items-center gap-2.5 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                          <ShieldCheck size={16} className="text-green-500 flex-shrink-0" />
                          <span className="font-semibold">Sin señales clínicas de alerta</span>
                        </div>
                      )

                    const colorMap = {
                      danger: {
                        card: 'bg-red-50 border-red-100',
                        title: 'text-red-800',
                        sub: 'text-red-500',
                        badge: 'bg-red-100 text-red-600',
                      },
                      warning: {
                        card: 'bg-orange-50 border-orange-100',
                        title: 'text-orange-800',
                        sub: 'text-orange-500',
                        badge: 'bg-orange-100 text-orange-600',
                      },
                      info: {
                        card: 'bg-blue-50 border-blue-100',
                        title: 'text-blue-800',
                        sub: 'text-blue-500',
                        badge: 'bg-blue-100 text-blue-600',
                      },
                      neutral: {
                        card: 'bg-gray-50 border-gray-100',
                        title: 'text-gray-700',
                        sub: 'text-gray-400',
                        badge: 'bg-gray-100 text-gray-500',
                      },
                    }

                    return (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          Señales Clínicas
                          <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {signals.length}
                          </span>
                        </h3>
                        <div
                          className={`grid gap-2.5 ${signals.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}
                        >
                          {signals.map((a, i) => {
                            const c = colorMap[a.type]
                            const Icon = a.icon
                            const isOrphan =
                              signals.length % 2 !== 0 &&
                              i === signals.length - 1 &&
                              signals.length < 3
                            return (
                              <div
                                key={i}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border ${c.card} ${isOrphan ? 'sm:col-span-2' : ''}`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.badge}`}
                                >
                                  <Icon size={14} />
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className={`text-[10px] font-bold uppercase tracking-wider ${c.sub}`}
                                  >
                                    {a.label}
                                  </p>
                                  <p className={`text-sm font-bold ${c.title} leading-snug mt-0.5`}>
                                    {a.value}
                                  </p>
                                  {a.action && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">{a.action}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {activeTab === 'expediente' && scopes.share_documents && (
                <ExpedienteDigital
                  documents={documents}
                  doctorDocs={doctorDocs}
                  patientSharedDocs={patientSharedDocs}
                  patientName={patient.full_name}
                  patientId={patient.id}
                  patientEmail={contactInfo?.email}
                  onUpload={() => loadPatientData()}
                />
              )}

              {activeTab === 'recetas' && (
                <RecetasTabPanel
                  patientId={id!}
                  patientName={patient?.full_name ?? ''}
                  prescriptions={patientPrescriptions}
                  onNavigate={() => navigate(`/dashboard/recetas?patientId=${id}&newRx=1`)}
                />
              )}

              {activeTab === 'historia' &&
                (scopes.share_medical_notes ? (
                  <ClinicalHistoryTab
                    patientId={id!}
                    editorId={user!.id}
                    readOnly={!scopes.edit_clinical_history}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <ClipboardList size={22} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Acceso no autorizado</p>
                    <p className="text-xs text-gray-400 max-w-xs">
                      El paciente no ha compartido su historial clínico contigo. Solicítale que te
                      otorgue acceso desde su apartado de Permisos.
                    </p>
                  </div>
                ))}

              {activeTab === 'curvas' && (
                <GrowthCurvesTab
                  patientId={id!}
                  patientSex={
                    patient.sex === 'male' || patient.sex === 'female' ? patient.sex : null
                  }
                  patientBirthDate={patient.birthdate ?? null}
                />
              )}

              {activeTab === 'informes' && (
                <MedicalReportTab
                  patientId={id!}
                  doctorId={user!.id}
                  patient={patient}
                  medProfile={medProfile}
                  patientInsurances={patientInsurances}
                />
              )}

              {activeTab === 'cirugias' && (
                <CirugiasTab patientId={id!} patientName={patient.full_name ?? 'Paciente'} />
              )}

              {activeTab === 'consultas' &&
                (() => {
                  const now = new Date()
                  const allAppts = [
                    ...upcomingAppointments.map((a) => ({ ...a, _upcoming: true })),
                    ...pastAppointments.map((a) => ({ ...a, _upcoming: false })),
                  ].sort(
                    (a, b) =>
                      new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
                  )

                  return (
                    <div className="max-w-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
                          Consultas
                        </h3>
                        {loadingConsultNotes && (
                          <Loader2 size={15} className="animate-spin text-[#33C7BE]" />
                        )}
                      </div>

                      {allAppts.length === 0 && !loadingConsultNotes && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <CalendarDays size={24} className="text-gray-300" />
                          </div>
                          <p className="text-sm font-semibold text-gray-500">
                            Sin consultas registradas
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Las citas con este paciente aparecerán aquí
                          </p>
                        </div>
                      )}

                      {allAppts.map((appt) => {
                        const isPastAppt = !appt._upcoming && new Date(appt.scheduled_at) < now
                        const apptNotes = consultationNotes.filter(
                          (n) => n.appointment_id === appt.id,
                        )
                        const isExpanded = expandedAppt === appt.id
                        const draft = newConsultNote[appt.id] || { title: '', body: '' }
                        const modeLabel =
                          appt.mode === 'video'
                            ? 'Videoconsulta'
                            : appt.mode === 'phone'
                              ? 'Telefónica'
                              : 'Presencial'
                        const apptDate = new Date(appt.scheduled_at)
                        const statusLabel =
                          appt.status === 'completed'
                            ? 'Completada'
                            : appt.status === 'confirmed'
                              ? 'Confirmada'
                              : appt.status === 'pending'
                                ? 'Pendiente'
                                : appt.status
                        const statusColor =
                          appt.status === 'completed'
                            ? 'bg-gray-100 text-gray-500'
                            : appt.status === 'confirmed'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-amber-50 text-amber-600'
                        return (
                          <div
                            key={appt.id}
                            className="border border-gray-200 rounded-2xl bg-white overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedAppt(isExpanded ? null : appt.id)}
                              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPastAppt ? 'bg-gray-100' : 'bg-[#33C7BE]/10'}`}
                                >
                                  <CalendarDays
                                    size={16}
                                    className={isPastAppt ? 'text-gray-400' : 'text-[#33C7BE]'}
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-gray-900">
                                      {apptDate.toLocaleDateString('es-MX', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                      })}
                                    </p>
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${statusColor}`}
                                    >
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {modeLabel} ·{' '}
                                    {apptDate.toLocaleTimeString('es-MX', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {apptNotes.length > 0 && (
                                  <span className="bg-[#33C7BE]/15 text-[#33C7BE] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {apptNotes.length} {apptNotes.length === 1 ? 'nota' : 'notas'}
                                  </span>
                                )}
                                <ChevronRight
                                  size={14}
                                  className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                                {appt.reason && (
                                  <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                      Motivo
                                    </p>
                                    <p className="text-xs text-gray-600">{appt.reason}</p>
                                  </div>
                                )}

                                {isPastAppt ? (
                                  <>
                                    {/* Nota de Evolución NOM-004 */}
                                    <NotaEvolucionForm
                                      appointmentId={appt.id}
                                      patientId={id!}
                                      existing={notasEvolucion[appt.id] ?? null}
                                      onSaved={(nota) =>
                                        setNotasEvolucion((prev) => ({ ...prev, [appt.id]: nota }))
                                      }
                                    />

                                    {apptNotes.length > 0 && (
                                      <div className="space-y-3">
                                        {apptNotes.map((note) => (
                                          <div
                                            key={note.id}
                                            className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                                          >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                              <span className="text-xs font-bold text-gray-700">
                                                {note.title || 'Nota de consulta'}
                                              </span>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-[10px] text-gray-400">
                                                  {new Date(note.created_at).toLocaleDateString(
                                                    'es-MX',
                                                    { day: 'numeric', month: 'short' },
                                                  )}
                                                </span>
                                                <button
                                                  onClick={() => handleDeleteConsultNote(note.id)}
                                                  disabled={deletingConsultNote === note.id}
                                                  title="Eliminar esta nota"
                                                  className="text-gray-300 hover:text-red-400 transition-colors"
                                                >
                                                  {deletingConsultNote === note.id ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                  ) : (
                                                    <X size={12} />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                                              {note.body}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                              <Lock size={9} /> Cifrada AES-256
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="space-y-2 pt-1">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Agregar nota
                                      </p>
                                      <input
                                        placeholder="Título (ej: Diagnóstico, Plan de tratamiento)"
                                        className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none"
                                        value={draft.title}
                                        onChange={(e) =>
                                          setNewConsultNote((prev) => ({
                                            ...prev,
                                            [appt.id]: { ...draft, title: e.target.value },
                                          }))
                                        }
                                      />
                                      <textarea
                                        placeholder="Evolución, hallazgos, indicaciones, plan..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none resize-none"
                                        value={draft.body}
                                        onChange={(e) =>
                                          setNewConsultNote((prev) => ({
                                            ...prev,
                                            [appt.id]: { ...draft, body: e.target.value },
                                          }))
                                        }
                                      />
                                      <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                          <Lock size={9} /> Cifrada AES-256
                                        </p>
                                        <button
                                          onClick={() => handleSaveConsultNote(appt.id)}
                                          disabled={
                                            savingConsultNote === appt.id || !draft.body.trim()
                                          }
                                          className="px-4 py-1.5 bg-[#33C7BE] text-white text-xs font-bold rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                        >
                                          {savingConsultNote === appt.id ? (
                                            <Loader2 size={12} className="animate-spin" />
                                          ) : (
                                            <Plus size={12} />
                                          )}
                                          Guardar nota
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-xs text-gray-400 text-center py-2">
                                    Consulta próxima — las notas estarán disponibles después de la
                                    cita
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
            </div>
          </div>
        </div>
      </div>

      {showAgendarModal && (
        <AgendarCitaModal
          patientId={id!}
          patientName={patient?.full_name ?? 'Paciente'}
          patientEmail={contactInfo?.email}
          onClose={() => setShowAgendarModal(false)}
          onSuccess={() => setShowAgendarModal(false)}
        />
      )}
    </DashboardLayout>
  )
}

// ── RecetasTabPanel ──────────────────────────────────────────────────────────

function RecetasTabPanel({
  patientId,
  patientName,
  prescriptions,
  onNavigate,
}: {
  patientId: string
  patientName: string
  prescriptions: Prescription[]
  onNavigate: () => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [printingRx, setPrintingRx] = useState<Prescription | null>(null)
  const [rxDoctor, setRxDoctor] = useState<DoctorConfig>(defaultDoctor())
  const [rxDesign, setRxDesign] = useState<DesignConfig>(defaultDesign())

  useEffect(() => {
    if (!printingRx) return
    const t = setTimeout(() => {
      printRxElement(rxDesign)
      setPrintingRx(null)
    }, 150)
    return () => clearTimeout(t)
  }, [printingRx, rxDesign])

  function handlePrintRx(rx: Prescription) {
    const docRaw = localStorage.getItem(`healthpal_rx_doctor_${user?.id}`)
    const designRaw = localStorage.getItem(`healthpal_rx_design_${user?.id}`)
    setRxDoctor(docRaw ? JSON.parse(docRaw) : defaultDoctor())
    setRxDesign(designRaw ? JSON.parse(designRaw) : defaultDesign())
    setPrintingRx(rx)
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Recetas emitidas</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Prescripciones generadas para {patientName || 'este paciente'}
          </p>
        </div>
        <button
          onClick={onNavigate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors shadow-sm"
        >
          <Plus size={15} />
          Nueva receta
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-3">
            <ClipboardList className="w-7 h-7 text-[#33C7BE]" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Sin recetas aún</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Haz clic en "Nueva receta" para crear la primera prescripción para este paciente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => {
            const meds = Array.isArray(rx.medications) ? rx.medications : []
            const date = rx.issued_at
              ? new Date(rx.issued_at).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'
            return (
              <div
                key={rx.id}
                className="border border-gray-100 rounded-xl p-4 hover:border-teal-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#33C7BE] uppercase tracking-wide">
                        {date}
                      </span>
                      {rx.folio && (
                        <span className="text-[10px] text-gray-400 font-mono">#{rx.folio}</span>
                      )}
                    </div>
                    {rx.diagnosis && (
                      <p className="text-sm font-semibold text-gray-800 mt-1 truncate">
                        {rx.diagnosis}
                      </p>
                    )}
                    <div className="mt-2 space-y-0.5">
                      {meds.slice(0, 3).map((m, i) => (
                        <p key={i} className="text-xs text-gray-600">
                          <span className="font-semibold">{m.name}</span>
                          {m.concentration ? ` ${m.concentration}` : ''}
                          {m.form ? ` — ${m.form}` : ''}
                        </p>
                      ))}
                      {meds.length > 3 && (
                        <p className="text-xs text-gray-400">+{meds.length - 3} más…</p>
                      )}
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                    {meds.length} med{meds.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() =>
                      navigate(`/dashboard/recetas?patientId=${patientId}&editRx=${rx.id}`)
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    onClick={() => handlePrintRx(rx)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold bg-[#33C7BE] text-white rounded-xl hover:bg-teal-600 transition-colors"
                  >
                    <Printer size={11} /> Imprimir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Hidden print area — renders off-screen when printingRx is set */}
      {printingRx && (
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: 800,
            visibility: 'hidden',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <RecetaPreview
            draft={{
              patient_id: printingRx.patient_id,
              patient_name: printingRx.patient_name ?? patientName,
              patient_age: printingRx.patient_age ?? '',
              patient_sex: printingRx.patient_sex ?? '',
              patient_weight: printingRx.patient_weight ?? '',
              issued_at: printingRx.issued_at,
              folio: printingRx.folio ?? '',
              diagnosis: printingRx.diagnosis ?? '',
              allergies: printingRx.allergies ?? [],
              medications: printingRx.medications,
              vitals: {
                bp_systolic: '',
                bp_diastolic: '',
                glucose: '',
                glucose_fasting: false,
                temperature: '',
                temp_unit: 'C',
                heart_rate: '',
                o2_sat: '',
              },
              indications: printingRx.indications ?? '',
            }}
            doctor={rxDoctor}
            design={rxDesign}
          />
        </div>
      )}
    </div>
  )
}

const CATEGORIES: { value: DocCategory; label: string }[] = [
  { value: 'radiology', label: 'Radiología' },
  { value: 'prescription', label: 'Receta' },
  { value: 'history', label: 'Historial' },
  { value: 'lab', label: 'Laboratorio' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'other', label: 'Otro' },
]

function ExpedienteDigital({
  documents,
  doctorDocs,
  patientSharedDocs,
  patientName,
  patientId,
  patientEmail,
  onUpload,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  documents: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doctorDocs: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patientSharedDocs: any[]
  patientName: string
  patientId: string
  patientEmail?: string
  onUpload: () => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localDocs, setLocalDocs] = useState<any[]>(documents)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localDoctorDocs, setLocalDoctorDocs] = useState<any[]>(doctorDocs)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localSharedDocs, setLocalSharedDocs] = useState<any[]>(patientSharedDocs)
  const [showUpload, setShowUpload] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewDoc, setPreviewDoc] = useState<any | null>(null)

  // Document request modal
  const [docReqOpen, setDocReqOpen] = useState(false)
  const [docReqEmail, setDocReqEmail] = useState(patientEmail || '')
  const [docReqType, setDocReqType] = useState('')
  const [docReqDesc, setDocReqDesc] = useState('')
  const [docReqLoading, setDocReqLoading] = useState(false)
  const [docReqLink, setDocReqLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateDocRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setDocReqLoading(true)
    try {

      const { data, error } = await createDocumentRequest(docReqEmail, docReqType, docReqDesc)
      if (error || !data) {
        showToast(error || 'Error al crear la solicitud', 'error', 3000)
        return
      }
      setDocReqLink(`${window.location.origin}/solicitud/${data.token}`)
    } catch (err) {
      showToast('Error inesperado', 'error', 3000)
    } finally {
      setDocReqLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!docReqLink) return
    navigator.clipboard.writeText(docReqLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetDocReqModal = () => {
    setDocReqOpen(false)
    setDocReqLink(null)
    setDocReqEmail(patientEmail || '')
    setDocReqType('')
    setDocReqDesc('')
    setCopied(false)
  }

  // Sync local state when props change
  useEffect(() => {
    setLocalDocs(documents)
  }, [documents])
  useEffect(() => {
    setLocalDoctorDocs(doctorDocs)
  }, [doctorDocs])
  useEffect(() => {
    setLocalSharedDocs(patientSharedDocs)
  }, [patientSharedDocs])

  // Deduplicate within each section by ID, then remove cross-section duplicates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dedupeById = (arr: any[]) =>
    arr.filter((d, i, a) => a.findIndex((x) => x.id === d.id) === i)
  const dedupedDoctorDocs = dedupeById(localDoctorDocs)
  const dedupedSharedDocs = dedupeById(localSharedDocs)
  const sharedAndDoctorIds = new Set([...dedupedSharedDocs, ...dedupedDoctorDocs].map((d) => d.id))
  const uniqueLocalDocs = dedupeById(localDocs).filter((d) => !sharedAndDoctorIds.has(d.id))

  const [uploading, setUploading] = useState(false)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleView = (doc: any) => setPreviewDoc(doc)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.file) {
      showToast('Selecciona un archivo', 'warning')
      return
    }
    const validationError = validateFile(uploadForm.file, 'document')
    if (validationError) {
      showToast(validationError, 'error')
      return
    }
    setUploading(true)
    const result = await uploadDocumentForPatient(uploadForm.file, patientId, {
      title: uploadForm.title || uploadForm.file.name,
      category: uploadForm.category,
      notes: uploadForm.notes || undefined,
    })
    setUploading(false)
    if (result.success) {
      showToast('Documento subido correctamente', 'success')
      setShowUpload(false)
      setUploadForm({ file: null, title: '', category: 'other', notes: '' })
      onUpload()
    } else {
      showToast(result.error || 'Error al subir el documento', 'error')
    }
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      {/* Upload button / form */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-900">Expediente de {patientName}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setDocReqEmail(patientEmail || '')
              setDocReqOpen(true)
            }}
            title="Generar enlace para que el paciente suba un documento"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white text-primary border border-primary text-xs font-bold rounded-lg hover:bg-primary/5 transition-colors"
          >
            <FileUp size={14} />
            Solicitar documento
          </button>
          <button
            onClick={() => setShowUpload((v) => !v)}
            title="Subir un archivo al expediente del paciente"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors"
          >
            <Plus size={14} />
            Subir documento
          </button>
        </div>
      </div>

      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3"
        >
          <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Plus size={14} className="text-primary" /> Agregar documento al expediente
          </p>

          {/* File picker */}
          <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
            {uploadForm.file ? (
              <span className="text-sm font-semibold text-gray-800 truncate max-w-full px-2">
                {uploadForm.file.name}
              </span>
            ) : (
              <>
                <Download size={22} className="text-gray-300 rotate-180" />
                <span className="text-xs text-gray-400">
                  Haz clic para seleccionar archivo (PDF, imagen, etc.)
                </span>
              </>
            )}
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setUploadForm((prev) => ({
                  ...prev,
                  file: f,
                  title: prev.title || f?.name.replace(/\.[^/.]+$/, '') || '',
                }))
              }}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={uploadForm.title}
              onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Nombre del documento"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <select
              value={uploadForm.category}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, category: e.target.value as DocCategory }))
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <input
            value={uploadForm.notes}
            onChange={(e) => setUploadForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas (opcional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowUpload(false)
                setUploadForm({ file: null, title: '', category: 'other', notes: '' })
              }}
              className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !uploadForm.file}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} className="rotate-180" />
              )}
              {uploading ? 'Subiendo…' : 'Subir'}
            </button>
          </div>
        </form>
      )}

      {/* ── Document grids (thumbnail cards like Documentos page) ─── */}
      {dedupedDoctorDocs.length === 0 &&
      dedupedSharedDocs.length === 0 &&
      uniqueLocalDocs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">El paciente no tiene documentos cargados.</p>
          <p className="text-xs mt-1">Puedes agregar el primero con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dedupedDoctorDocs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Plus size={12} /> Subidos por ti
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">
                  {dedupedDoctorDocs.length}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dedupedDoctorDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={() => {
                      /* doctor docs deletion can be added later */
                    }}
                    onPreview={handleView}
                  />
                ))}
              </div>
            </div>
          )}

          {dedupedSharedDocs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-600 flex items-center gap-1.5">
                <Send size={12} /> Enviados por el paciente
                <span className="bg-teal-50 text-teal-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">
                  {dedupedSharedDocs.length}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dedupedSharedDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={() => {
                      /* read-only */
                    }}
                    onPreview={handleView}
                  />
                ))}
              </div>
            </div>
          )}

          {uniqueLocalDocs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Documentos del paciente
                <span className="ml-2 bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">
                  {uniqueLocalDocs.length}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueLocalDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={() => {
                      /* read-only */
                    }}
                    onPreview={handleView}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document preview modal */}
      <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Document Request Modal */}
      {docReqOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileUp size={18} className="text-primary" />
                <h2 className="text-base font-bold text-gray-900">
                  Solicitar documento al paciente
                </h2>
              </div>
              <button onClick={resetDocReqModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {docReqLink ? (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Comparte este enlace con tu paciente. Al abrirlo, se le pedirá crear una cuenta
                  (si no tiene) y subir el documento.
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-gray-700 truncate flex-1 font-mono">
                    {docReqLink}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">El enlace expira en 7 días.</p>
                <button
                  onClick={resetDocReqModal}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Listo
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateDocRequest} className="p-5 space-y-4">
                <div>
                  <label
                    htmlFor="doc-req-email"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Correo del paciente
                  </label>
                  <input
                    id="doc-req-email"
                    type="email"
                    value={docReqEmail}
                    onChange={(e) => setDocReqEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    No necesita tener cuenta — se le pedirá crearla al abrir el enlace.
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="doc-req-type"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    ¿Qué documento necesitas?
                  </label>
                  <input
                    id="doc-req-type"
                    type="text"
                    list="doc-type-options-pd"
                    value={docReqType}
                    onChange={(e) => setDocReqType(e.target.value)}
                    placeholder="Selecciona o escribe el tipo de documento…"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <datalist id="doc-type-options-pd">
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
                  <label
                    htmlFor="doc-req-desc"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Instrucción adicional (opcional)
                  </label>
                  <textarea
                    id="doc-req-desc"
                    value={docReqDesc}
                    onChange={(e) => setDocReqDesc(e.target.value)}
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
                  {docReqLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileUp size={15} />
                  )}
                  Generar enlace
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Cirugías Tab ──────────────────────────────────────────────────────────────

type SurgeryNoteType = 'preoperatoria' | 'postoperatoria' | 'seguimiento'

interface SurgeryNote {
  id: string
  tipo_nota: SurgeryNoteType
  fecha_cirugia: string | null
  diagnostico_preoperatorio: string | null
  operacion_planeada: string | null
  tipo_anestesia: string | null
  riesgo_quirurgico: string | null
  plan_terapeutico: string | null
  operacion_realizada: string | null
  diagnostico_postoperatorio: string | null
  tecnica_quirurgica: string | null
  hallazgos: string | null
  gasas_compresas: string | null
  incidentes_accidentes: string | null
  sangrado_ml: number | null
  estado_postquirurgico: string | null
  piezas_biopsias: string | null
  evolucion: string | null
  resultados_estudios: string | null
  pronostico: string | null
  observaciones: string | null
  created_at: string
}

type BlankNote = Omit<SurgeryNote, 'id' | 'created_at'>

const BLANK_NOTE: BlankNote = {
  tipo_nota: 'postoperatoria',
  fecha_cirugia: new Date().toISOString().slice(0, 10),
  diagnostico_preoperatorio: '',
  operacion_planeada: '',
  tipo_anestesia: '',
  riesgo_quirurgico: '',
  plan_terapeutico: '',
  operacion_realizada: '',
  diagnostico_postoperatorio: '',
  tecnica_quirurgica: '',
  hallazgos: '',
  gasas_compresas: '',
  incidentes_accidentes: '',
  sangrado_ml: null,
  estado_postquirurgico: '',
  piezas_biopsias: '',
  evolucion: '',
  resultados_estudios: '',
  pronostico: '',
  observaciones: '',
}

const TIPO_LABEL: Record<SurgeryNoteType, string> = {
  preoperatoria: 'Preoperatoria',
  postoperatoria: 'Postoperatoria',
  seguimiento: 'Seguimiento',
}

const TIPO_COLOR: Record<SurgeryNoteType, string> = {
  preoperatoria: 'bg-blue-50 text-blue-700 border-blue-100',
  postoperatoria: 'bg-orange-50 text-orange-700 border-orange-100',
  seguimiento: 'bg-teal-50 text-teal-700 border-teal-100',
}

function SurgeryNoteCard({
  note,
  onExpand,
}: {
  note: SurgeryNote
  onExpand: (n: SurgeryNote) => void
}) {
  const fecha = note.fecha_cirugia
    ? new Date(note.fecha_cirugia + 'T12:00:00').toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date(note.created_at).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

  const titulo =
    note.tipo_nota === 'preoperatoria'
      ? note.operacion_planeada || note.diagnostico_preoperatorio || 'Nota preoperatoria'
      : note.tipo_nota === 'postoperatoria'
        ? note.operacion_realizada || note.diagnostico_postoperatorio || 'Nota postoperatoria'
        : note.evolucion?.slice(0, 60) || 'Nota de seguimiento'

  return (
    <div
      className="border border-gray-100 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow cursor-pointer space-y-2"
      onClick={() => onExpand(note)}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TIPO_COLOR[note.tipo_nota]}`}
        >
          NOM-004 §
          {note.tipo_nota === 'preoperatoria'
            ? '8.6'
            : note.tipo_nota === 'postoperatoria'
              ? '8.8'
              : '8.13'}{' '}
          · {TIPO_LABEL[note.tipo_nota]}
        </span>
        <span className="text-[10px] text-gray-400 flex-shrink-0">{fecha}</span>
      </div>
      <p className="text-sm font-semibold text-gray-800 line-clamp-2">{titulo}</p>
      {note.observaciones && (
        <p className="text-xs text-gray-500 line-clamp-2">{note.observaciones}</p>
      )}
    </div>
  )
}

function SurgeryNoteModal({ note, onClose }: { note: SurgeryNote; onClose: () => void }) {
  const fecha = note.fecha_cirugia
    ? new Date(note.fecha_cirugia + 'T12:00:00').toLocaleDateString('es-MX', { dateStyle: 'long' })
    : null

  const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) =>
    value ? (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
          {label}
        </p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{value}</p>
      </div>
    ) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Scissors size={16} className="text-primary" />
            <div>
              <p className="text-sm font-bold text-gray-900">
                Nota {TIPO_LABEL[note.tipo_nota]}
                {fecha && <span className="font-normal text-gray-500 ml-1">— {fecha}</span>}
              </p>
              <p className="text-[10px] text-gray-400">
                NOM-004-SSA3-2012 §
                {note.tipo_nota === 'preoperatoria'
                  ? '8.6'
                  : note.tipo_nota === 'postoperatoria'
                    ? '8.8'
                    : '8.13'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Preoperatoria §8.6 */}
          {(note.tipo_nota === 'preoperatoria' || note.tipo_nota === 'postoperatoria') && (
            <>
              <Field label="Diagnóstico preoperatorio" value={note.diagnostico_preoperatorio} />
              <Field label="Operación planeada" value={note.operacion_planeada} />
              <Field label="Tipo de anestesia propuesta" value={note.tipo_anestesia} />
              <Field label="Riesgo quirúrgico" value={note.riesgo_quirurgico} />
              {note.tipo_nota === 'preoperatoria' && (
                <Field label="Plan terapéutico / cuidados" value={note.plan_terapeutico} />
              )}
            </>
          )}
          {/* Postoperatoria §8.8 */}
          {note.tipo_nota === 'postoperatoria' && (
            <>
              <Field label="Operación realizada" value={note.operacion_realizada} />
              <Field label="Diagnóstico postoperatorio" value={note.diagnostico_postoperatorio} />
              <Field label="Descripción de técnica quirúrgica" value={note.tecnica_quirurgica} />
              <Field label="Hallazgos transoperatorios" value={note.hallazgos} />
              <Field label="Reporte de gasas y compresas" value={note.gasas_compresas} />
              <Field label="Incidentes y accidentes" value={note.incidentes_accidentes} />
              {note.sangrado_ml !== null && (
                <Field label="Cuantificación de sangrado (mL)" value={note.sangrado_ml} />
              )}
              <Field label="Estado postquirúrgico inmediato" value={note.estado_postquirurgico} />
              <Field label="Plan de manejo postoperatorio" value={note.plan_terapeutico} />
              <Field label="Piezas / biopsias enviadas" value={note.piezas_biopsias} />
            </>
          )}
          {/* Seguimiento §8.13 */}
          {note.tipo_nota === 'seguimiento' && (
            <>
              <Field label="Evolución y actualización del cuadro clínico" value={note.evolucion} />
              <Field label="Resultados de estudios" value={note.resultados_estudios} />
              <Field
                label="Diagnósticos / problemas clínicos"
                value={note.diagnostico_postoperatorio}
              />
              <Field label="Plan de estudio o tratamiento" value={note.plan_terapeutico} />
            </>
          )}
          {/* Shared */}
          <Field label="Pronóstico" value={note.pronostico} />
          <Field label="Observaciones" value={note.observaciones} />
        </div>
      </div>
    </div>
  )
}

function CirugiasTab({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [notes, setNotes] = useState<SurgeryNote[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [activeForm, setActiveForm] = useState<'none' | 'note' | 'file'>('none')
  const [savingNote, setSavingNote] = useState(false)
  const [uploading, setUploading] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewDoc, setPreviewDoc] = useState<any | null>(null)
  const [expandedNote, setExpandedNote] = useState<SurgeryNote | null>(null)

  const [noteForm, setNoteForm] = useState<BlankNote>({ ...BLANK_NOTE })
  const [uploadForm, setUploadForm] = useState<{ file: File | null; title: string; notes: string }>(
    {
      file: null,
      title: '',
      notes: '',
    },
  )

  const loadAll = async () => {
    setLoading(true)
    const [notesRes, docsRes] = await Promise.all([
      supabase
        .from('surgery_notes')
        .select('*')
        .eq('patient_id', patientId)
        .order('fecha_cirugia', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('documents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('category', 'surgery')
        .order('created_at', { ascending: false }),
    ])
    if (!notesRes.error) setNotes((notesRes.data as SurgeryNote[]) || [])
    else logger.error('CirugiasTab.notes', notesRes.error)
    if (!docsRes.error) setDocs(docsRes.data || [])
    else logger.error('CirugiasTab.docs', docsRes.error)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return
    setSavingNote(true)
    const payload = {
      patient_id: patientId,
      doctor_id: session.user.id,
      ...noteForm,
      // normalise empty strings to null for cleanliness
      ...Object.fromEntries(Object.entries(noteForm).map(([k, v]) => [k, v === '' ? null : v])),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('surgery_notes') as any).insert(payload)
    setSavingNote(false)
    if (error) {
      logger.error('CirugiasTab.saveNote', error)
      showToast('Error al guardar la nota', 'error')
    } else {
      showToast('Nota guardada', 'success')
      setActiveForm('none')
      setNoteForm({ ...BLANK_NOTE })
      loadAll()
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.file) {
      showToast('Selecciona un archivo', 'warning')
      return
    }
    const validationError = validateFile(uploadForm.file, 'document')
    if (validationError) {
      showToast(validationError, 'error')
      return
    }
    setUploading(true)
    const result = await uploadDocumentForPatient(uploadForm.file, patientId, {
      title: uploadForm.title || uploadForm.file.name,
      category: 'surgery',
      notes: uploadForm.notes || undefined,
    })
    setUploading(false)
    if (result.success) {
      showToast('Archivo subido', 'success')
      setActiveForm('none')
      setUploadForm({ file: null, title: '', notes: '' })
      loadAll()
    } else {
      showToast(result.error || 'Error al subir', 'error')
    }
  }

  const Field = ({
    label,
    value,
    onChange,
    required = false,
    type = 'textarea',
    rows = 2,
    hint,
    placeholder,
    options,
  }: {
    label: string
    value: string | number | null
    onChange: (v: string) => void
    required?: boolean
    type?: 'input' | 'textarea' | 'number' | 'select'
    rows?: number
    hint?: string
    placeholder?: string
    options?: { value: string; label: string }[]
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-1">({hint})</span>}
      </label>
      {type === 'select' && options ? (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{placeholder ?? 'Selecciona…'}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      ) : type === 'number' ? (
        <input
          type="number"
          min={0}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      )}
    </div>
  )

  const set = (key: keyof BlankNote) => (v: string) =>
    setNoteForm((prev) => ({ ...prev, [key]: v === '' ? null : v }))

  const isEmpty = notes.length === 0 && docs.length === 0

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Cirugías — {patientName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Notas clínicas y archivos de procedimientos quirúrgicos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveForm((v) => (v === 'note' ? 'none' : 'note'))}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white border border-primary text-primary text-xs font-bold rounded-lg hover:bg-primary/5 transition-colors"
          >
            <StickyNote size={13} />
            Nueva nota
          </button>
          <button
            onClick={() => setActiveForm((v) => (v === 'file' ? 'none' : 'file'))}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors"
          >
            <Plus size={13} />
            Subir archivo
          </button>
        </div>
      </div>

      {/* ── Nota NOM-004 form ─────────────────────────────────────────────── */}
      {activeForm === 'note' && (
        <form
          onSubmit={handleSaveNote}
          className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Scissors size={13} className="text-primary" /> Nueva nota quirúrgica
              (NOM-004-SSA3-2012)
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveForm('none')
                setNoteForm({ ...BLANK_NOTE })
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>

          {/* Tipo + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tipo de nota <span className="text-red-400">*</span>
              </label>
              <select
                value={noteForm.tipo_nota}
                onChange={(e) =>
                  setNoteForm((p) => ({ ...p, tipo_nota: e.target.value as SurgeryNoteType }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
              >
                <option value="preoperatoria">Preoperatoria</option>
                <option value="postoperatoria">Postoperatoria</option>
                <option value="seguimiento">Seguimiento</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Fecha de {noteForm.tipo_nota === 'preoperatoria' ? 'cirugía programada' : 'cirugía'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={noteForm.fecha_cirugia ?? ''}
                onChange={(e) =>
                  setNoteForm((p) => ({ ...p, fecha_cirugia: e.target.value || null }))
                }
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* ── Preoperatoria §8.6 ── */}
          {(noteForm.tipo_nota === 'preoperatoria' || noteForm.tipo_nota === 'postoperatoria') && (
            <>
              <Field
                label="Diagnóstico preoperatorio"
                value={noteForm.diagnostico_preoperatorio}
                onChange={set('diagnostico_preoperatorio')}
                required
                rows={2}
                placeholder="Ej. Colelitiasis sintomática — litiasis vesicular múltiple confirmada por ultrasonido"
              />
              <Field
                label="Operación planeada / plan quirúrgico"
                value={noteForm.operacion_planeada}
                onChange={set('operacion_planeada')}
                required
                rows={2}
                placeholder="Ej. Colecistectomía laparoscópica electiva bajo anestesia general"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Tipo de anestesia propuesta"
                  value={noteForm.tipo_anestesia}
                  onChange={set('tipo_anestesia')}
                  type="select"
                  required
                  placeholder="Selecciona tipo…"
                  options={[
                    { value: 'General balanceada con IOT', label: 'General balanceada (IOT)' },
                    {
                      value: 'General con mascarilla laríngea',
                      label: 'General con mascarilla laríngea',
                    },
                    { value: 'Regional epidural', label: 'Regional — epidural' },
                    {
                      value: 'Regional espinal (raquídea)',
                      label: 'Regional — espinal (raquídea)',
                    },
                    {
                      value: 'Bloqueo de nervio periférico',
                      label: 'Bloqueo de nervio periférico',
                    },
                    { value: 'Local con sedación IV', label: 'Local con sedación IV' },
                    { value: 'Local sin sedación', label: 'Local sin sedación' },
                    { value: 'Tópica', label: 'Tópica' },
                  ]}
                />
                <Field
                  label="Riesgo quirúrgico (ASA)"
                  value={noteForm.riesgo_quirurgico}
                  onChange={set('riesgo_quirurgico')}
                  type="select"
                  required
                  placeholder="Selecciona clasificación…"
                  options={[
                    { value: 'ASA I — paciente sano', label: 'ASA I — Paciente sano' },
                    {
                      value: 'ASA II — enfermedad sistémica leve',
                      label: 'ASA II — Enfermedad sistémica leve',
                    },
                    {
                      value: 'ASA III — enfermedad sistémica grave',
                      label: 'ASA III — Enfermedad sistémica grave',
                    },
                    {
                      value: 'ASA IV — riesgo vital constante',
                      label: 'ASA IV — Riesgo vital constante',
                    },
                    {
                      value: 'ASA V — moribundo, cirugía de urgencia',
                      label: 'ASA V — Moribundo / urgencia',
                    },
                    {
                      value: 'ASA VI — muerte cerebral / donación',
                      label: 'ASA VI — Muerte cerebral',
                    },
                  ]}
                />
              </div>
            </>
          )}

          {/* ── Postoperatoria §8.8 ── */}
          {noteForm.tipo_nota === 'postoperatoria' && (
            <>
              <Field
                label="Operación realizada"
                value={noteForm.operacion_realizada}
                onChange={set('operacion_realizada')}
                required
                rows={2}
                placeholder="Ej. Colecistectomía laparoscópica con conversión a técnica abierta"
              />
              <Field
                label="Diagnóstico postoperatorio"
                value={noteForm.diagnostico_postoperatorio}
                onChange={set('diagnostico_postoperatorio')}
                required
                rows={2}
                placeholder="Ej. Colelitiasis complicada con proceso adhesivo moderado en lecho hepático"
              />
              <Field
                label="Descripción de la técnica quirúrgica"
                value={noteForm.tecnica_quirurgica}
                onChange={set('tecnica_quirurgica')}
                required
                rows={4}
                placeholder="Ej. Paciente en decúbito supino bajo anestesia general. Se realizó neumoperitoneo con aguja de Veress en región umbilical a 15 mmHg. Colocación de 4 trocares. Disección del triángulo de Calot con identificación de conducto cístico y arteria cística. Clipaje y sección. Extracción de vesícula en bolsa Endobag. Revisión de hemostasia. Cierre por planos."
              />
              <Field
                label="Hallazgos transoperatorios"
                value={noteForm.hallazgos}
                onChange={set('hallazgos')}
                rows={2}
                placeholder="Ej. Vesícula distendida con pared engrosada, múltiples litos. Adherencias laxas a epiplón mayor. Sin lesión de vía biliar."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Reporte de gasas y compresas"
                  value={noteForm.gasas_compresas}
                  onChange={set('gasas_compresas')}
                  type="input"
                  placeholder="Ej. 10/10 gasas completas, 4/4 compresas"
                />
                <Field
                  label="Cuantificación de sangrado (mL)"
                  value={noteForm.sangrado_ml}
                  onChange={(v) =>
                    setNoteForm((p) => ({ ...p, sangrado_ml: v === '' ? null : Number(v) }))
                  }
                  type="number"
                  required
                  placeholder="Ej. 80"
                />
              </div>
              <Field
                label="Incidentes y accidentes"
                value={noteForm.incidentes_accidentes}
                onChange={set('incidentes_accidentes')}
                rows={2}
                hint="Ninguno si no aplica"
                placeholder="Ej. Ninguno. / Ej. Laceración menor en arteria cística resuelta con clipaje adicional sin consecuencias."
              />
              <Field
                label="Estado postquirúrgico inmediato"
                value={noteForm.estado_postquirurgico}
                onChange={set('estado_postquirurgico')}
                required
                rows={2}
                placeholder="Ej. Paciente estable, extubado en quirófano, tolerando ventilación espontánea. TA 120/80, FC 78, SpO₂ 98%."
              />
              <Field
                label="Plan de manejo postoperatorio"
                value={noteForm.plan_terapeutico}
                onChange={set('plan_terapeutico')}
                required
                rows={3}
                placeholder="Ej. Ketorolaco 30 mg IV c/8h × 24h, metoclopramida 10 mg c/8h. Dieta líquida en 6h. Deambulación temprana. Alta en 24h si evolución favorable. Control en consulta externa en 7 días."
              />
              <Field
                label="Piezas / biopsias enviadas"
                value={noteForm.piezas_biopsias}
                onChange={set('piezas_biopsias')}
                type="input"
                placeholder="Ej. Vesícula biliar enviada a patología para estudio histológico. / Ninguna."
              />
            </>
          )}

          {/* ── Seguimiento §8.13 ── */}
          {noteForm.tipo_nota === 'seguimiento' && (
            <>
              <Field
                label="Evolución y actualización del cuadro clínico"
                value={noteForm.evolucion}
                onChange={set('evolucion')}
                required
                rows={4}
                placeholder="Ej. Paciente a 7 días de colecistectomía laparoscópica. Heridas quirúrgicas sin signos de infección, afebril. Refiere dolor leve EVA 2/10 controlado con analgesia oral. Tolerando dieta blanda sin náuseas. Abdomen blando depresible, peristalsis presente."
              />
              <Field
                label="Resultados de estudios"
                value={noteForm.resultados_estudios}
                onChange={set('resultados_estudios')}
                rows={2}
                placeholder="Ej. BH: Hb 13.2, Leu 8,500. QS: glucosa 98, creatinina 0.9. Ultrasonido de control: sin líquido libre, sitio quirúrgico sin alteraciones."
              />
              <Field
                label="Diagnósticos / problemas clínicos"
                value={noteForm.diagnostico_postoperatorio}
                onChange={set('diagnostico_postoperatorio')}
                rows={2}
                placeholder="Ej. Postoperatorio de colecistectomía laparoscópica en evolución satisfactoria."
              />
              <Field
                label="Plan de estudio o tratamiento"
                value={noteForm.plan_terapeutico}
                onChange={set('plan_terapeutico')}
                required
                rows={3}
                placeholder="Ej. Continuar ibuprofeno 400 mg c/8h × 3 días. Dieta normal progresiva. Retiro de puntos en 5 días. Próxima consulta en 30 días o antes si aparece fiebre, ictericia o dolor intenso."
              />
            </>
          )}

          {/* Pronóstico + Observaciones — todos los tipos §8.6/§8.8/§8.13 */}
          <Field
            label="Pronóstico"
            value={noteForm.pronostico}
            onChange={set('pronostico')}
            required={noteForm.tipo_nota !== 'seguimiento'}
            type="select"
            placeholder="Selecciona pronóstico…"
            options={[
              { value: 'Favorable', label: 'Favorable' },
              { value: 'Favorable a corto plazo', label: 'Favorable a corto plazo' },
              { value: 'Favorable a largo plazo', label: 'Favorable a largo plazo' },
              { value: 'Reservado', label: 'Reservado' },
              { value: 'Reservado a corto plazo', label: 'Reservado a corto plazo' },
              { value: 'Grave', label: 'Grave' },
              { value: 'Malo', label: 'Malo' },
              { value: 'Por determinar', label: 'Por determinar' },
            ]}
          />
          <Field
            label="Observaciones adicionales"
            value={noteForm.observaciones}
            onChange={set('observaciones')}
            rows={2}
            placeholder="Ej. Paciente y familiar informados del procedimiento, riesgos y cuidados postoperatorios. Consentimiento informado firmado."
          />

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setActiveForm('none')
                setNoteForm({ ...BLANK_NOTE })
              }}
              className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingNote}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
            >
              {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {savingNote ? 'Guardando…' : 'Guardar nota'}
            </button>
          </div>
        </form>
      )}

      {/* ── Subir archivo ─────────────────────────────────────────────────── */}
      {activeForm === 'file' && (
        <form
          onSubmit={handleUpload}
          className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <FileText size={13} className="text-primary" /> Subir archivo de cirugía
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveForm('none')
                setUploadForm({ file: null, title: '', notes: '' })
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>
          <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
            {uploadForm.file ? (
              <span className="text-sm font-semibold text-gray-800 truncate max-w-full px-2">
                {uploadForm.file.name}
              </span>
            ) : (
              <>
                <Download size={22} className="text-gray-300 rotate-180" />
                <span className="text-xs text-gray-400">PDF, imagen, DOCX — máx. 10 MB</span>
              </>
            )}
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setUploadForm((prev) => ({
                  ...prev,
                  file: f,
                  title: prev.title || f?.name.replace(/\.[^/.]+$/, '') || '',
                }))
              }}
            />
          </label>
          <input
            value={uploadForm.title}
            onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Nombre del archivo"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <textarea
            value={uploadForm.notes}
            onChange={(e) => setUploadForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Descripción u observaciones (opcional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveForm('none')
                setUploadForm({ file: null, title: '', notes: '' })
              }}
              className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !uploadForm.file}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} className="rotate-180" />
              )}
              {uploading ? 'Subiendo…' : 'Subir'}
            </button>
          </div>
        </form>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : isEmpty ? (
        <div className="text-center py-14 text-gray-400">
          <Scissors size={44} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Sin registros de cirugía.</p>
          <p className="text-xs mt-1">
            Agrega una nota clínica o sube un archivo con los botones de arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Notes */}
          {notes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <StickyNote size={12} /> Notas clínicas
                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">
                  {notes.length}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {notes.map((n) => (
                  <SurgeryNoteCard key={n.id} note={n} onExpand={setExpandedNote} />
                ))}
              </div>
            </div>
          )}
          {/* Files */}
          {docs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FileText size={12} /> Archivos
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">
                  {docs.length}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={() => {}}
                    onPreview={setPreviewDoc}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
      {expandedNote && (
        <SurgeryNoteModal note={expandedNote} onClose={() => setExpandedNote(null)} />
      )}
    </div>
  )
}
