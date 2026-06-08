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
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { getPatientFullProfile, getPatientNotes, addPatientNote, getPatientContactInfo } from '@/features/doctor/services/patients'
import { getClinicalHistory } from '@/shared/lib/queries/clinicalHistory'
import { getPatientProfile } from '@/shared/lib/queries/profile'
import { getUserDocuments, getDocumentDownloadUrl, uploadDocumentForPatient, getDoctorDocumentsForPatient, getDocumentsSharedByPatientWithDoctor } from '@/shared/lib/queries/documents'
import { createDocumentRequest } from '@/shared/lib/queries/documentRequests'
import { getConsentForPatient, requestPatientAccess, ConsentScopes } from '@/shared/lib/queries/consent'
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
import MedicalReportTab from '@/features/doctor/components/MedicalReportTab'
import { generatePatientSummary } from '@/shared/lib/openai'
import type { ProxyResult } from '@/shared/lib/openai'
import { getAppointmentNotesByPatient, createAppointmentNote, deleteAppointmentNote } from '@/shared/lib/queries/appointmentNotes'
import type { AppointmentNote } from '@/shared/lib/queries/appointmentNotes'

type TabType = 'summary' | 'notes' | 'expediente' | 'historia' | 'informes' | 'consultas'
type ConsentGate = 'loading' | 'no-consent' | 'requested' | 'rejected' | 'revoked' | 'accepted'

export default function PatientDetail() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<TabType>('summary')
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
    const [newNote, setNewNote] = useState({ title: '', body: '' })
    const [savingNote, setSavingNote] = useState(false)

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
    const [newConsultNote, setNewConsultNote] = useState<Record<string, { title: string; body: string }>>({})
    const [savingConsultNote, setSavingConsultNote] = useState<string | null>(null)
    const [deletingConsultNote, setDeletingConsultNote] = useState<string | null>(null)
    const [loadingConsultNotes, setLoadingConsultNotes] = useState(false)

    const tabScrollRef = useRef<HTMLDivElement>(null)
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
            } catch { /* legacy */ }
            return ch.allergies
        })()
        const medsFromCH = ph?.medications?.details || null
        const psychiatricDiagnoses = psych?.applicable
            ? [...(psych.diagnoses || []), psych.diagnoses_other].filter(Boolean).join(', ')
            : null
        const psychiatricMeds = psych?.applicable && psych.current_psychiatric_meds?.present
            ? psych.current_psychiatric_meds.details
            : null
        const developmentalNotes = dev?.applicable
            ? [
                dev.birth_type ? `Parto ${dev.birth_type}` : null,
                dev.motor_milestones && dev.motor_milestones !== 'normal' ? `Motor: ${dev.motor_milestones.replace(/_/g, ' ')}` : null,
                dev.language_milestones && dev.language_milestones !== 'normal' ? `Lenguaje: ${dev.language_milestones.replace(/_/g, ' ')}` : null,
                dev.cognitive_development && dev.cognitive_development !== 'normal' ? `Cognitivo: ${dev.cognitive_development.replace(/_/g, ' ')}` : null,
            ].filter(Boolean).join('; ')
            : null

        // Non-pathological
        const smokingMap: Record<string, string> = { never: 'No fumador', ex: 'Ex-fumador', occasional: 'Ocasional', moderate: 'Moderado', heavy: 'Fuerte' }
        const smokingStatus = nph?.smoking?.present
            ? `Fumador${nph.smoking.frequency ? ` (${smokingMap[nph.smoking.frequency] ?? nph.smoking.frequency})` : ''}${nph.smoking.details ? `: ${nph.smoking.details}` : ''}`
            : (nph?.smoking ? 'No fumador' : null)
        const alcoholUse = nph?.alcohol?.present
            ? `Consume alcohol${nph.alcohol.frequency_per_week ? ` (${nph.alcohol.frequency_per_week} veces/semana)` : ''}${nph.alcohol.cups_per_day ? `, ${nph.alcohol.cups_per_day} copas/día` : ''}`
            : null

        // Family history
        const familyDiseases = fh
            ? Object.entries(fh as Record<string, { present: boolean; relative?: string }>)
                .filter(([, v]) => (v as { present?: boolean })?.present)
                .map(([k, v]) => `${k.replace(/_/g, ' ')}${(v as { relative?: string }).relative ? ` (${(v as { relative?: string }).relative})` : ''}`)
            : []
        const familyHistory = familyDiseases.length ? familyDiseases.join(', ') : null

        // Surgeries / hospitalizations
        const surgeries = ph?.surgeries?.present ? (ph.surgeries.details || 'Sí (sin detalle)') : null
        const hospitalizations = ph?.hospitalizations?.present ? (ph.hospitalizations.details || 'Sí (sin detalle)') : null

        // Recent notes content (last 3)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentNotesSummary = (notes as any[]).slice(0, 3)
            .filter((n) => n.title || n.body)
            .map((n) => `[${n.created_at ? new Date(n.created_at).toLocaleDateString('es-MX') : ''}] ${n.title || ''}: ${String(n.body || '').slice(0, 200)}`)
            .join(' | ') || null

        // BMI
        const heightM = pProf?.height_cm ? pProf.height_cm / 100 : null
        const bmi = heightM && pProf?.weight_kg ? Math.round((pProf.weight_kg / (heightM * heightM)) * 10) / 10 : null

        // Last appointment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastAppt = (pastAppointments as any[])[0]
        const lastAppointmentDate = lastAppt?.scheduled_at
            ? new Date(lastAppt.scheduled_at).toLocaleDateString('es-MX')
            : null

        return {
            name: patient.full_name,
            age: patient.birthdate ? Math.floor((Date.now() - new Date(patient.birthdate).getTime()) / 31557600000) : null,
            sex: patient.sex,
            bloodType: pProf?.blood_type,
            height: pProf?.height_cm,
            weight: pProf?.weight_kg,
            bmi,
            chronicConditions: cdDiseases.length ? cdDiseases.join(', ') : (pProf?.chronic_conditions || null),
            allergies: allergiesFromCH || pProf?.allergies || null,
            medications: medsFromCH || pProf?.current_medications || null,
            documentCount: documents.length,
            noteCount: notes.length,
            lastNoteDate: notes[0]?.created_at ? new Date(notes[0].created_at).toLocaleDateString('es-MX') : null,
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
        generatePatientSummary(buildSummaryInput()).then(applyAiSummaryResult).finally(() => {
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
            promises.push(getPatientProfile(id!).catch(e => { logger.error('PatientDetail.medProfile', e); return null }))
            keys.push('medProfile')

            if (s.share_medical_notes) {
                promises.push(getPatientNotes(id!, user!.id).catch(e => { logger.error('PatientDetail.notes', e); return [] }))
                keys.push('notes')
            }

            if (s.share_documents) {
                promises.push(getUserDocuments(id!, null, true).catch(e => { logger.error('PatientDetail.docs', e); return [] }))
                keys.push('documents')
                promises.push(getDoctorDocumentsForPatient(id!).catch(e => { logger.error('PatientDetail.doctorDocs', e); return [] }))
                keys.push('doctorDocs')
                promises.push(getDocumentsSharedByPatientWithDoctor(user!.id, id!).catch(e => { logger.error('PatientDetail.patientSharedDocs', e); return [] }))
                keys.push('patientSharedDocs')
            }

            if (s.share_contact) {
                promises.push(getPatientContactInfo(id!).catch(e => { logger.error('PatientDetail.contact', e); return null }))
                keys.push('contact')
            }

            if (s.share_insurance) {
                promises.push(getPatientInsurancesForDoctor(id!).catch(e => { logger.error('PatientDetail.insurances', e); return [] }))
                keys.push('insurances')
            }

            if (s.share_medical_notes) {
                promises.push(
                    Promise.resolve(
                        supabase.from('patient_biometric_history')
                            .select('*').eq('patient_id', id!)
                            .order('recorded_at', { ascending: false }).limit(5)
                            .then(({ data }) => data ?? [])
                    ).catch(() => [])
                )
                keys.push('biometrics')
            }

            // Always fetch upcoming appointments for this patient+doctor
            promises.push(
                Promise.resolve(
                    supabase.from('appointments')
                        .select('*').eq('doctor_id', user!.id).eq('patient_id', id!)
                        .neq('status', 'cancelled')
                        .gte('scheduled_at', new Date().toISOString())
                        .order('scheduled_at', { ascending: true }).limit(5)
                        .then(({ data }) => data ?? [])
                ).catch(() => [])
            )
            keys.push('upcoming')

            // Past appointments for consultation notes
            promises.push(
                Promise.resolve(
                    supabase.from('appointments')
                        .select('*').eq('doctor_id', user!.id).eq('patient_id', id!)
                        .neq('status', 'cancelled')
                        .lt('scheduled_at', new Date().toISOString())
                        .order('scheduled_at', { ascending: false }).limit(50)
                        .then(({ data }) => data ?? [])
                ).catch(() => [])
            )
            keys.push('pastAppointments')

            // Clinical history for AI summary
            promises.push(getClinicalHistory(id!).catch(() => null))
            keys.push('clinicalHistory')

            const results = await Promise.all(promises)
            keys.forEach((key, i) => {
                switch (key) {
                    case 'medProfile': setMedProfile(results[i]); break
                    case 'notes': setNotes(results[i] || []); break
                    case 'documents': setDocuments(results[i] || []); break
                    case 'doctorDocs': setDoctorDocs(results[i] || []); break
                    case 'patientSharedDocs': setPatientSharedDocs(results[i] || []); break
                    case 'contact': setContactInfo(results[i]); break
                    case 'insurances': setPatientInsurances(results[i] || []); break
                    case 'biometrics': setBiometricHistory(results[i] || []); break
                    case 'upcoming': setUpcomingAppointments(results[i] || []); break
                    case 'pastAppointments': setPastAppointments(results[i] || []); break
                    case 'clinicalHistory': setClinicalHistorySummary(results[i]); break
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
            showToast('Solicitud enviada. El paciente decidirá qué información compartir.', 'success', 4000)
            setConsentGate('requested')
        } else {
            showToast(error || 'Error al solicitar acceso', 'error', 3000)
        }
        setRequestingAccess(false)
    }

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newNote.body.trim()) return

        setSavingNote(true)
        try {
            const note = await addPatientNote(id!, user!.id, newNote.title || 'Nota Clínica', newNote.body)
            setNotes([note, ...notes])
            setNewNote({ title: '', body: '' })
            showToast('Nota guardada correctamente', 'success')
        } catch (err) {
            showToast('Error al guardar la nota', 'error')
        } finally {
            setSavingNote(false)
        }
    }

    const loadConsultationNotes = async () => {
        if (!id) return
        setLoadingConsultNotes(true)
        try {
            const data = await getAppointmentNotesByPatient(id)
            setConsultationNotes(data)
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
            setConsultationNotes(prev => [note, ...prev])
            setNewConsultNote(prev => ({ ...prev, [appointmentId]: { title: '', body: '' } }))
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
            setConsultationNotes(prev => prev.filter(n => n.id !== noteId))
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
                    <button onClick={() => navigate(mapDashboardPath('/dashboard'))} className="mt-4 text-primary hover:underline">Volver al dashboard</button>
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
    const pProfile = (Array.isArray(patientProfilesRaw) ? patientProfilesRaw[0] : patientProfilesRaw) || {}

    const totalDocs = documents.length + doctorDocs.length + patientSharedDocs.length

    const allergies = (medProfile?.allergies ?? pProfile?.allergies ?? '').trim()
    const conditions = (medProfile?.chronic_conditions ?? pProfile?.chronic_conditions ?? '').trim()
    const meds = (medProfile?.current_medications ?? pProfile?.current_medications ?? '').trim()
    const hasAllergy = !!(allergies && !['ninguna','no','n/a'].includes(allergies.toLowerCase()))
    const hasCondition = !!(conditions && !['ninguna','no','n/a'].includes(conditions.toLowerCase()))

    const initials = (patient.full_name ?? 'P').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

    return (
        <DashboardLayout>
            <div className="-m-4 md:-m-6 lg:-m-8 min-h-screen bg-gray-50/60 flex flex-col">

                {/* ── Top bar ──────────────────────────────────────── */}
                <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
                    >
                        <ArrowLeft size={17} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expediente clínico</p>
                        <h1 className="text-base font-black text-gray-900 leading-tight truncate">{patient.full_name || 'Paciente'}</h1>
                    </div>
                    <button
                        onClick={() => setShowAgendarModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#33C7BE] text-white font-bold text-xs rounded-xl hover:bg-teal-600 transition-colors shadow-sm flex-shrink-0"
                    >
                        <CalendarDays size={14} />
                        <span className="hidden sm:inline">Agendar cita</span>
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
                    <aside className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">

                        {/* Avatar + name block */}
                        <div className="p-6 flex flex-col items-center text-center border-b border-gray-100">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-[#33C7BE]/20 to-cyan-100 flex items-center justify-center shadow-sm mb-4 flex-shrink-0">
                                {patient.avatar_url ? (
                                    <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-[#33C7BE]">{initials}</span>
                                )}
                            </div>
                            <h2 className="text-base font-black text-gray-900 leading-tight mb-1">{patient.full_name || 'Paciente'}</h2>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                                <ShieldCheck size={9} /> Acceso autorizado
                            </span>
                        </div>

                        {/* Vitals */}
                        <div className="p-4 border-b border-gray-100 grid grid-cols-3 gap-2">
                            {[
                                { label: 'Edad', value: `${calculateAge(patient.birthdate)}`, unit: 'años', color: 'text-blue-700', bg: 'bg-blue-50' },
                                { label: 'Sexo', value: patient.sex === 'male' ? '♂' : patient.sex === 'female' ? '♀' : '—', unit: patient.sex === 'male' ? 'Hombre' : patient.sex === 'female' ? 'Mujer' : '', color: 'text-violet-700', bg: 'bg-violet-50' },
                                { label: 'Sangre', value: medProfile?.blood_type || pProfile.blood_type || '—', unit: '', color: 'text-red-700', bg: 'bg-red-50' },
                            ].map((v, i) => (
                                <div key={i} className={`${v.bg} rounded-xl p-2.5 text-center`}>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{v.label}</p>
                                    <p className={`text-lg font-black ${v.color} leading-tight`}>{v.value}</p>
                                    {v.unit && <p className={`text-[9px] font-medium ${v.color} opacity-70`}>{v.unit}</p>}
                                </div>
                            ))}
                        </div>

                        {/* Biometrics */}
                        <div className="p-4 border-b border-gray-100 space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mediciones</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Ruler size={11} className="text-gray-300" />
                                        <span className="text-[9px] text-gray-400 font-bold uppercase">Altura</span>
                                    </div>
                                    <p className="text-xl font-black text-gray-900">{medProfile?.height_cm ?? pProfile.height_cm ?? '—'}</p>
                                    <p className="text-[9px] text-gray-400">cm</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Scale size={11} className="text-gray-300" />
                                        <span className="text-[9px] text-gray-400 font-bold uppercase">Peso</span>
                                    </div>
                                    <p className="text-xl font-black text-gray-900">{medProfile?.weight_kg ?? pProfile.weight_kg ?? '—'}</p>
                                    <p className="text-[9px] text-gray-400">kg</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        {scopes.share_contact && (contactInfo?.email || contactInfo?.phone) && (
                            <div className="p-4 border-b border-gray-100 space-y-2.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contacto</p>
                                {contactInfo?.email && (
                                    <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#33C7BE] transition-colors group">
                                        <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-teal-50 flex items-center justify-center flex-shrink-0 transition-colors">
                                            <Mail size={12} className="text-gray-400 group-hover:text-[#33C7BE]" />
                                        </div>
                                        <span className="truncate text-xs">{contactInfo.email}</span>
                                    </a>
                                )}
                                {contactInfo?.phone && (
                                    <div className="flex items-center gap-2">
                                        <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#33C7BE] transition-colors group flex-1">
                                            <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-teal-50 flex items-center justify-center flex-shrink-0 transition-colors">
                                                <Phone size={12} className="text-gray-400 group-hover:text-[#33C7BE]" />
                                            </div>
                                            <span className="text-xs">{contactInfo.phone}</span>
                                        </a>
                                        <a
                                            href={`https://wa.me/${contactInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${patient.full_name?.split(' ')[0] ?? ''}, le contacto de parte de su médico.`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="WhatsApp"
                                            className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center flex-shrink-0 transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-green-600" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stats */}
                        <div className="p-4 border-b border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Expediente</p>
                            <div className="space-y-2">
                                <button
                                    onClick={scopes.share_medical_notes ? () => setActiveTab('notes') : undefined}
                                    disabled={!scopes.share_medical_notes}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${scopes.share_medical_notes ? 'hover:bg-[#33C7BE]/5 cursor-pointer' : 'opacity-40 cursor-default'}`}
                                >
                                    <div className="w-9 h-9 rounded-xl bg-[#33C7BE]/10 flex items-center justify-center flex-shrink-0">
                                        <StickyNote size={16} className="text-[#33C7BE]" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-gray-900 leading-none">{scopes.share_medical_notes ? notes.length : '—'}</p>
                                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Notas clínicas</p>
                                    </div>
                                    {scopes.share_medical_notes && <ChevronRight size={13} className="ml-auto text-gray-300" />}
                                </button>

                                <button
                                    onClick={scopes.share_documents ? () => setActiveTab('expediente') : undefined}
                                    disabled={!scopes.share_documents}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${scopes.share_documents ? 'hover:bg-blue-50 cursor-pointer' : 'opacity-40 cursor-default'}`}
                                >
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                        <FileText size={16} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-gray-900 leading-none">{scopes.share_documents ? totalDocs : '—'}</p>
                                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Documentos</p>
                                    </div>
                                    {scopes.share_documents && <ChevronRight size={13} className="ml-auto text-gray-300" />}
                                </button>
                            </div>
                        </div>

                        {/* Insurance */}
                        {scopes.share_insurance && patientInsurances.length > 0 && (
                            <div className="p-4 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Seguro médico</p>
                                {patientInsurances.map((ins) => (
                                    <div key={ins.id} className="mb-2 last:mb-0">
                                        <p className="text-sm font-bold text-gray-900">{insuranceDisplayName(ins)}</p>
                                        {ins.policy_number && <p className="text-[11px] text-gray-500">Póliza: {ins.policy_number}</p>}
                                        {ins.member_id && <p className="text-[11px] text-gray-500">ID: {ins.member_id}</p>}
                                        {ins.valid_until && <p className="text-[11px] text-gray-500">Vigente hasta: {ins.valid_until}</p>}
                                        {ins.phone_emergency && (
                                            <a href={`tel:${ins.phone_emergency}`} className="text-[11px] text-teal-600 hover:underline">
                                                Urgencias: {ins.phone_emergency}
                                            </a>
                                        )}
                                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                            <ShieldCheck size={9} /> Activo
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Fallback: show simple insurance_provider if share_insurance not granted but share_medical_notes is */}
                        {!scopes.share_insurance && scopes.share_medical_notes && (medProfile?.insurance_provider || pProfile?.insurance_provider) && (
                            <div className="p-4 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Seguro médico</p>
                                <p className="text-sm font-bold text-gray-900">{medProfile?.insurance_provider || pProfile?.insurance_provider}</p>
                                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                    <ShieldCheck size={9} /> Activo
                                </span>
                            </div>
                        )}

                        {/* Emergency contact */}
                        {scopes.share_contact && (medProfile?.emergency_contact_name || medProfile?.emergency_contact_phone) && (
                            <div className="p-4 border-b border-gray-100 space-y-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contacto de emergencia</p>
                                {medProfile?.emergency_contact_name && (
                                    <p className="text-xs font-semibold text-gray-700">{medProfile.emergency_contact_name}</p>
                                )}
                                {medProfile?.emergency_contact_phone && (
                                    <div className="flex items-center gap-2">
                                        <a href={`tel:${medProfile.emergency_contact_phone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary transition-colors flex-1">
                                            <Phone size={11} className="text-gray-400" />
                                            {medProfile.emergency_contact_phone}
                                        </a>
                                        <a
                                            href={`https://wa.me/${medProfile.emergency_contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, le contactamos por el paciente ${patient.full_name ?? ''}.`)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="w-6 h-6 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-green-600">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Biometric history */}
                        {scopes.share_medical_notes && biometricHistory.length > 0 && (
                            <div className="p-4 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Historial biométrico</p>
                                <div className="space-y-2">
                                    {biometricHistory.slice(0, 3).map((b, i) => (
                                        <div key={b.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${i === 0 ? 'bg-teal-50 border border-teal-100' : 'bg-gray-50'}`}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-gray-400">{new Date(b.recorded_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                <div className="flex gap-3 mt-0.5">
                                                    {b.weight_kg && <span className="text-xs font-bold text-gray-700">{b.weight_kg} kg</span>}
                                                    {b.height_cm && <span className="text-xs font-bold text-gray-700">{b.height_cm} cm</span>}
                                                </div>
                                            </div>
                                            {i === 0 && <span className="text-[9px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full">Reciente</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming appointments */}
                        {upcomingAppointments.length > 0 && (
                            <div className="p-4 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Próximas citas</p>
                                <div className="space-y-2">
                                    {upcomingAppointments.slice(0, 3).map((appt) => (
                                        <div key={appt.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                                            <CalendarDays size={12} className="text-primary flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-700">
                                                    {new Date(appt.scheduled_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                    {' · '}
                                                    {new Date(appt.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' })}
                                                </p>
                                                <p className="text-[10px] text-gray-400 capitalize">{appt.mode === 'in_person' ? 'Presencial' : appt.mode === 'video' ? 'Video' : 'Llamada'}</p>
                                            </div>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${appt.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {appt.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Privacy */}
                        <div className="mt-auto p-4 flex items-center gap-2">
                            <Lock size={11} className="text-gray-300 flex-shrink-0" />
                            <p className="text-[10px] text-gray-400">Cifrado AES-256 · Privado</p>
                        </div>
                    </aside>

                    {/* ── MAIN CONTENT ─────────────────────────────── */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

                        {/* Mobile: compact patient card */}
                        <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#33C7BE]/10 flex items-center justify-center flex-shrink-0">
                                    {patient.avatar_url
                                        ? <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-xl font-black text-[#33C7BE]">{initials}</span>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{calculateAge(patient.birthdate)} años</span>
                                        <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{patient.sex === 'male' ? '♂' : '♀'}</span>
                                        {(medProfile?.blood_type || pProfile.blood_type) && (
                                            <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">🩸 {medProfile?.blood_type || pProfile.blood_type}</span>
                                        )}
                                    </div>
                                    {scopes.share_contact && contactInfo?.email && (
                                        <p className="text-xs text-gray-400 mt-1 truncate">{contactInfo.email}</p>
                                    )}
                                </div>
                            </div>
                            {/* Mobile quick stats */}
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={scopes.share_medical_notes ? () => setActiveTab('notes') : undefined} className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2">
                                    <StickyNote size={14} className="text-[#33C7BE]" />
                                    <span className="text-sm font-black text-gray-900">{scopes.share_medical_notes ? notes.length : '—'}</span>
                                    <span className="text-xs text-gray-400">notas</span>
                                </button>
                                <button onClick={scopes.share_documents ? () => setActiveTab('expediente') : undefined} className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2">
                                    <FileText size={14} className="text-blue-400" />
                                    <span className="text-sm font-black text-gray-900">{scopes.share_documents ? totalDocs : '—'}</span>
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
                                    { id: 'historia', label: 'Historial Clínico', icon: ClipboardList, enabled: true },
                                    { id: 'consultas', label: 'Consultas', icon: CalendarDays, enabled: true },
                                    { id: 'informes', label: 'Informes', icon: FileText, enabled: true },
                                    { id: 'expediente', label: 'Expediente', icon: FileText, enabled: scopes.share_documents, navigateTo: `/dashboard/documentos?folder=shared-${id}` },
                                    { id: 'notes', label: 'Notas', icon: StickyNote, enabled: scopes.share_medical_notes },
                                ].filter(t => t.enabled).map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => (tab as { navigateTo?: string }).navigateTo ? navigate((tab as { navigateTo?: string }).navigateTo!) : handleTabChange(tab.id as TabType)}
                                        className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all flex-shrink-0 ${
                                            activeTab === tab.id
                                                ? 'border-[#33C7BE] text-[#33C7BE]'
                                                : 'border-transparent text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        <tab.icon size={14} />
                                        {tab.label}
                                        {tab.id === 'notes' && scopes.share_medical_notes && notes.length > 0 && (
                                            <span className="bg-[#33C7BE]/15 text-[#33C7BE] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notes.length}</span>
                                        )}
                                        {tab.id === 'expediente' && scopes.share_documents && totalDocs > 0 && (
                                            <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalDocs}</span>
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
                                <div className="max-w-2xl space-y-6">

                                    {/* AI Clinical Summary */}
                                    <div className="relative overflow-hidden rounded-2xl border border-[#33C7BE]/20 bg-gradient-to-br from-[#33C7BE]/5 to-teal-50/60 p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-[#33C7BE]/15 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs">✦</span>
                                                </div>
                                                <span className="text-xs font-bold text-[#33C7BE] uppercase tracking-widest">Resumen IA</span>
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
                                                        generatePatientSummary(buildSummaryInput()).then(applyAiSummaryResult).finally(() => setAiSummaryLoading(false))
                                                    }}
                                                    className="text-[10px] font-semibold text-[#33C7BE] hover:text-teal-700 flex items-center gap-1 flex-shrink-0"
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Regenerar
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
                                            <p className="text-sm text-amber-600 italic">Servicio de IA no configurado. Contacta al administrador para activar la clave de API.</p>
                                        ) : aiSummaryLlmError === 'LLM_WRONG_ENDPOINT' ? (
                                            <p className="text-sm text-amber-600 italic">Configuración incorrecta: clave de OpenRouter pero endpoint apunta a OpenAI. Configura OPENAI_BASE_URL=https://openrouter.ai/api/v1 en Supabase.</p>
                                        ) : aiSummaryLlmError === 'LLM_AUTH_ERROR' ? (
                                            <p className="text-sm text-amber-600 italic">Clave de API de IA inválida o revocada. Verifica la configuración.</p>
                                        ) : aiSummaryLlmError === 'LLM_QUOTA_ERROR' ? (
                                            <p className="text-sm text-amber-600 italic">Cuota de API de IA agotada. Recarga créditos en platform.openai.com.</p>
                                        ) : aiSummaryAttempted ? (
                                            <p className="text-sm text-amber-600 italic">No se pudo generar el resumen. Intenta de nuevo.</p>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">Generando resumen clínico...</p>
                                        )}
                                    </div>

                                    {/* Clinical data row */}
                                    {(() => {
                                        const ch = clinicalHistorySummary
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const ph = ch?.pathological_history as any

                                        const chConditions = ph?.cd
                                            ? Object.entries(ph.cd as Record<string, { present: boolean }>)
                                                .filter(([, v]) => v?.present)
                                                .map(([k]) => k.replace(/_/g, ' '))
                                                .join(', ')
                                            : null
                                        const chOtherDiseases = ph?.other_diseases?.present ? ph.other_diseases.details : null
                                        const conditionValue = chConditions
                                            ? (chOtherDiseases ? `${chConditions}, ${chOtherDiseases}` : chConditions)
                                            : (chOtherDiseases || medProfile?.chronic_conditions || pProfile?.chronic_conditions || null)

                                        const chAllergies = (() => {
                                            if (!ch?.allergies) return null
                                            try {
                                                const arr = JSON.parse(ch.allergies)
                                                if (Array.isArray(arr) && arr.length > 0) return arr.map((a: { name: string }) => a.name).join(', ')
                                                if (Array.isArray(arr) && arr.length === 0) return null
                                            } catch { /* legacy string */ }
                                            return ch.allergies || null
                                        })()
                                        const allergyValue = chAllergies || medProfile?.allergies || pProfile?.allergies || null

                                        const medsValue = (ph?.medications?.present ? ph.medications.details : null)
                                            || medProfile?.current_medications || pProfile?.current_medications || null

                                        const items = [
                                            { emoji: '🫀', label: 'Condiciones crónicas', value: conditionValue, fallback: 'Ninguna registrada', accent: 'border-l-orange-400' },
                                            { emoji: '⚠️', label: 'Alergias conocidas', value: allergyValue, fallback: 'Ninguna conocida', accent: 'border-l-red-400' },
                                            { emoji: '💊', label: 'Medicación activa', value: medsValue, fallback: 'Ninguna', accent: 'border-l-blue-400' },
                                        ]

                                        return (
                                            <div className="space-y-2.5">
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Datos Clínicos</h3>
                                                {items.map((item, i) => (
                                                    <div key={i} className={`flex items-center gap-3 p-3.5 bg-white border border-gray-100 border-l-4 ${item.accent} rounded-xl shadow-sm`}>
                                                        <span className="text-xl leading-none flex-shrink-0">{item.emoji}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{item.label}</p>
                                                            <p className={`text-sm font-semibold mt-0.5 ${item.value ? 'text-gray-800' : 'text-gray-400'}`}>{item.value || item.fallback}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    })()}

                                    {/* Notes for doctor */}
                                    {(medProfile?.notes_for_doctor || pProfile?.notes_for_doctor) && (
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mensaje del paciente</h3>
                                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-gray-700 leading-relaxed italic">
                                                "{medProfile?.notes_for_doctor || pProfile?.notes_for_doctor}"
                                            </div>
                                        </div>
                                    )}

                                    {/* Clinical signals */}
                                    {(() => {
                                        const lastNote = notes[0]
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const signals: { type: 'danger' | 'warning' | 'info' | 'neutral'; icon: any; label: string; value: string; action?: string }[] = []

                                        if (hasAllergy) signals.push({ type: 'danger', icon: AlertTriangle, label: 'Alergia conocida', value: allergies, action: 'Verificar antes de prescribir' })
                                        if (hasCondition) signals.push({ type: 'warning', icon: Heart, label: 'Condición crónica activa', value: conditions, action: 'Monitoreo continuo recomendado' })
                                        if (meds && !['ninguno','no'].includes(meds.toLowerCase())) {
                                            signals.push({ type: 'info', icon: Stethoscope, label: 'Medicación en curso', value: meds, action: 'Revisar posibles interacciones' })
                                        }
                                        if (scopes.share_medical_notes && lastNote) {
                                            const daysSince = Math.floor((Date.now() - new Date(lastNote.created_at).getTime()) / 86400000)
                                            if (daysSince > 60) signals.push({ type: 'neutral', icon: RefreshCw, label: 'Seguimiento pendiente', value: `Sin notas desde hace ${daysSince} días`, action: 'Considera agregar una nota' })
                                        } else if (scopes.share_medical_notes && notes.length === 0) {
                                            signals.push({ type: 'neutral', icon: StickyNote, label: 'Sin historial de evolución', value: 'No hay notas clínicas aún', action: 'Agrega la primera nota para iniciar el expediente' })
                                        }

                                        if (signals.length === 0) return (
                                            <div className="flex items-center gap-2.5 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                                                <ShieldCheck size={16} className="text-green-500 flex-shrink-0" />
                                                <span className="font-semibold">Sin señales clínicas de alerta</span>
                                            </div>
                                        )

                                        const colorMap = {
                                            danger:  { card: 'bg-red-50 border-red-100',    title: 'text-red-800',    sub: 'text-red-500',    badge: 'bg-red-100 text-red-600' },
                                            warning: { card: 'bg-orange-50 border-orange-100', title: 'text-orange-800', sub: 'text-orange-500', badge: 'bg-orange-100 text-orange-600' },
                                            info:    { card: 'bg-blue-50 border-blue-100',  title: 'text-blue-800',   sub: 'text-blue-500',   badge: 'bg-blue-100 text-blue-600' },
                                            neutral: { card: 'bg-gray-50 border-gray-100',  title: 'text-gray-700',   sub: 'text-gray-400',   badge: 'bg-gray-100 text-gray-500' },
                                        }

                                        return (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    Señales Clínicas
                                                    <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{signals.length}</span>
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    {signals.map((a, i) => {
                                                        const c = colorMap[a.type]
                                                        const Icon = a.icon
                                                        return (
                                                            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${c.card}`}>
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.badge}`}>
                                                                    <Icon size={14} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${c.sub}`}>{a.label}</p>
                                                                    <p className={`text-sm font-bold ${c.title} leading-snug mt-0.5`}>{a.value}</p>
                                                                    {a.action && <p className="text-[10px] text-gray-400 mt-0.5">{a.action}</p>}
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

                            {activeTab === 'historia' && (
                                scopes.share_medical_notes
                                    ? <ClinicalHistoryTab patientId={id!} editorId={user!.id} readOnly={!scopes.edit_clinical_history} />
                                    : (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                                <ClipboardList size={22} className="text-gray-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-gray-700 mb-1">Acceso no autorizado</p>
                                            <p className="text-xs text-gray-400 max-w-xs">El paciente no ha compartido su historial clínico contigo. Solicítale que te otorgue acceso desde su apartado de Permisos.</p>
                                        </div>
                                    )
                            )}

                            {activeTab === 'informes' && (
                                <MedicalReportTab patientId={id!} doctorId={user!.id} patient={patient} medProfile={medProfile} />
                            )}

                            {activeTab === 'consultas' && (() => {
                                const now = new Date()
                                const allAppts = [
                                    ...upcomingAppointments.map(a => ({ ...a, _upcoming: true })),
                                    ...pastAppointments.map(a => ({ ...a, _upcoming: false })),
                                ].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

                                return (
                                    <div className="max-w-2xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Consultas</h3>
                                            {loadingConsultNotes && <Loader2 size={15} className="animate-spin text-[#33C7BE]" />}
                                        </div>

                                        {allAppts.length === 0 && !loadingConsultNotes && (
                                            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                                                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                    <CalendarDays size={24} className="text-gray-300" />
                                                </div>
                                                <p className="text-sm font-semibold text-gray-500">Sin consultas registradas</p>
                                                <p className="text-xs text-gray-400 mt-1">Las citas con este paciente aparecerán aquí</p>
                                            </div>
                                        )}

                                        {allAppts.map((appt) => {
                                            const isPastAppt = !appt._upcoming && new Date(appt.scheduled_at) < now
                                            const apptNotes = consultationNotes.filter(n => n.appointment_id === appt.id)
                                            const isExpanded = expandedAppt === appt.id
                                            const draft = newConsultNote[appt.id] || { title: '', body: '' }
                                            const modeLabel = appt.mode === 'video' ? 'Videoconsulta' : appt.mode === 'phone' ? 'Telefónica' : 'Presencial'
                                            const apptDate = new Date(appt.scheduled_at)
                                            const statusLabel = appt.status === 'completed' ? 'Completada' : appt.status === 'confirmed' ? 'Confirmada' : appt.status === 'pending' ? 'Pendiente' : appt.status
                                            const statusColor = appt.status === 'completed' ? 'bg-gray-100 text-gray-500' : appt.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                            return (
                                                <div key={appt.id} className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
                                                    <button
                                                        onClick={() => setExpandedAppt(isExpanded ? null : appt.id)}
                                                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPastAppt ? 'bg-gray-100' : 'bg-[#33C7BE]/10'}`}>
                                                                <CalendarDays size={16} className={isPastAppt ? 'text-gray-400' : 'text-[#33C7BE]'} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold text-gray-900">
                                                                        {apptDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                    </p>
                                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${statusColor}`}>{statusLabel}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-500">{modeLabel} · {apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {apptNotes.length > 0 && (
                                                                <span className="bg-[#33C7BE]/15 text-[#33C7BE] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                                    {apptNotes.length} {apptNotes.length === 1 ? 'nota' : 'notas'}
                                                                </span>
                                                            )}
                                                            <ChevronRight size={14} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                                                            {appt.reason && (
                                                                <div className="bg-gray-50 rounded-xl p-3">
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Motivo</p>
                                                                    <p className="text-xs text-gray-600">{appt.reason}</p>
                                                                </div>
                                                            )}

                                                            {isPastAppt ? (
                                                                <>
                                                                    {apptNotes.length > 0 && (
                                                                        <div className="space-y-3">
                                                                            {apptNotes.map((note) => (
                                                                                <div key={note.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                                                        <span className="text-xs font-bold text-gray-700">{note.title || 'Nota de consulta'}</span>
                                                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                                                            <span className="text-[10px] text-gray-400">
                                                                                                {new Date(note.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                                                            </span>
                                                                                            <button
                                                                                                onClick={() => handleDeleteConsultNote(note.id)}
                                                                                                disabled={deletingConsultNote === note.id}
                                                                                                className="text-gray-300 hover:text-red-400 transition-colors"
                                                                                            >
                                                                                                {deletingConsultNote === note.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{note.body}</p>
                                                                                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                                                                        <Lock size={9} /> Cifrada AES-256
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    <div className="space-y-2 pt-1">
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Agregar nota</p>
                                                                        <input
                                                                            placeholder="Título (ej: Diagnóstico, Plan de tratamiento)"
                                                                            className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none"
                                                                            value={draft.title}
                                                                            onChange={e => setNewConsultNote(prev => ({ ...prev, [appt.id]: { ...draft, title: e.target.value } }))}
                                                                        />
                                                                        <textarea
                                                                            placeholder="Evolución, hallazgos, indicaciones, plan..."
                                                                            rows={3}
                                                                            className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none resize-none"
                                                                            value={draft.body}
                                                                            onChange={e => setNewConsultNote(prev => ({ ...prev, [appt.id]: { ...draft, body: e.target.value } }))}
                                                                        />
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-[10px] text-gray-400 flex items-center gap-1"><Lock size={9} /> Cifrada AES-256</p>
                                                                            <button
                                                                                onClick={() => handleSaveConsultNote(appt.id)}
                                                                                disabled={savingConsultNote === appt.id || !draft.body.trim()}
                                                                                className="px-4 py-1.5 bg-[#33C7BE] text-white text-xs font-bold rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                                                            >
                                                                                {savingConsultNote === appt.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                                                Guardar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 text-center py-2">Consulta próxima — las notas estarán disponibles después de la cita</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })()}

                            {activeTab === 'notes' && scopes.share_medical_notes && (
                                <div className="max-w-2xl space-y-5">
                                    <form onSubmit={handleCreateNote} className="border border-[#33C7BE]/20 bg-[#33C7BE]/5 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-[#33C7BE]">
                                            <StickyNote size={15} />
                                            <span className="text-sm font-bold">Nueva Nota Clínica</span>
                                        </div>
                                        <input
                                            placeholder="Título (ej: Seguimiento post-consulta)"
                                            className="w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none"
                                            value={newNote.title}
                                            onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                                        />
                                        <textarea
                                            placeholder="Evolución clínica, hallazgos, indicaciones, plan de tratamiento..."
                                            rows={4}
                                            className="w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none resize-none"
                                            value={newNote.body}
                                            onChange={e => setNewNote({ ...newNote, body: e.target.value })}
                                            required
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Lock size={10} /> Cifrada AES-256
                                            </p>
                                            <button
                                                type="submit"
                                                disabled={savingNote || !newNote.body.trim()}
                                                className="px-5 py-2 bg-[#33C7BE] text-white text-sm font-bold rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-all flex items-center gap-2"
                                            >
                                                {savingNote ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                                Guardar
                                            </button>
                                        </div>
                                    </form>

                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Historial · {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
                                    </p>

                                    {notes.length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <StickyNote size={24} className="text-gray-300" />
                                            </div>
                                            <p className="text-sm font-semibold text-gray-500">Sin notas clínicas aún</p>
                                        </div>
                                    ) : (
                                        <div className="relative space-y-0">
                                            <div className="absolute left-[18px] top-5 bottom-5 w-0.5 bg-gray-100" />
                                            {notes.map((note, idx) => (
                                                <div key={note.id} className="relative flex gap-4 pb-4 last:pb-0">
                                                    <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-[#33C7BE] text-white shadow-md' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                                                        <StickyNote size={14} />
                                                    </div>
                                                    <div className={`flex-1 rounded-2xl border p-4 ${idx === 0 ? 'bg-white border-[#33C7BE]/20 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <h4 className="font-bold text-gray-900 text-sm">{note.title || 'Nota Clínica'}</h4>
                                                            <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                                                {new Date(note.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{note.body}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {showAgendarModal && (
                <AgendarCitaModal
                    patientId={id!}
                    patientName={patient?.full_name ?? 'Paciente'}
                    onClose={() => setShowAgendarModal(false)}
                    onSuccess={() => setShowAgendarModal(false)}
                />
            )}
        </DashboardLayout>
    )
}

const CATEGORY_LABELS: Record<string, string> = {
    radiology: 'Radiología',
    prescription: 'Recetas',
    history: 'Historial',
    lab: 'Laboratorio',
    insurance: 'Seguros',
    other: 'Otros',
}


const CATEGORIES: { value: DocCategory; label: string }[] = [
    { value: 'radiology', label: 'Radiología' },
    { value: 'prescription', label: 'Receta' },
    { value: 'history', label: 'Historial' },
    { value: 'lab', label: 'Laboratorio' },
    { value: 'insurance', label: 'Seguro' },
    { value: 'other', label: 'Otro' },
]

function DocCard({
    doc,
    downloadingId,
    onDownload,
    onCategoryChange,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc: any
    downloadingId: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDownload: (doc: any) => void
    onCategoryChange?: (docId: string, category: DocCategory) => Promise<void>
}) {
    const [editingCategory, setEditingCategory] = useState(false)
    const [savingCategory, setSavingCategory] = useState(false)

    async function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
        if (!onCategoryChange) return
        const newCat = e.target.value as DocCategory
        setSavingCategory(true)
        await onCategoryChange(doc.id, newCat)
        setSavingCategory(false)
        setEditingCategory(false)
    }

    return (
        <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0 mt-0.5">
                <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{doc.title || 'Documento'}</p>
                {editingCategory ? (
                    <div className="flex items-center gap-1 mt-1">
                        <select
                            defaultValue={doc.category}
                            onChange={handleCategoryChange}
                            disabled={savingCategory}
                            autoFocus
                            className="text-xs border border-primary/40 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
                        >
                            {CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                        {savingCategory
                            ? <Loader2 size={12} className="animate-spin text-gray-400" />
                            : <button type="button" onClick={() => setEditingCategory(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                        }
                    </div>
                ) : (
                    <p className="text-[10px] text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        {CATEGORY_LABELS[doc.category] || doc.category}
                        {onCategoryChange && (
                            <button
                                type="button"
                                onClick={() => setEditingCategory(true)}
                                className="text-gray-300 hover:text-primary transition-colors p-0.5 rounded"
                                title="Cambiar categoría"
                            >
                                ✎
                            </button>
                        )}
                        {doc.file_size ? ` • ${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
                        {doc.created_at ? ` • ${new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    </p>
                )}
            </div>
            <button
                onClick={() => onDownload(doc)}
                disabled={downloadingId === doc.id}
                className="flex-shrink-0 text-gray-400 hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                title="Descargar"
            >
                {downloadingId === doc.id
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Download size={16} />
                }
            </button>
        </div>
    )
}

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
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [localDocs, setLocalDocs] = useState<any[]>(documents)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [localDoctorDocs, setLocalDoctorDocs] = useState<any[]>(doctorDocs)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [localSharedDocs, setLocalSharedDocs] = useState<any[]>(patientSharedDocs)
    const [showUpload, setShowUpload] = useState(false)

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    useEffect(() => { setLocalDocs(documents) }, [documents])
    useEffect(() => { setLocalDoctorDocs(doctorDocs) }, [doctorDocs])
    useEffect(() => { setLocalSharedDocs(patientSharedDocs) }, [patientSharedDocs])

    async function handleCategoryChange(docId: string, category: DocCategory) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).rpc('update_document_category', {
            doc_id: docId,
            new_category: category,
        })
        if (error) {
            showToast('Error al actualizar la categoría', 'error')
            return
        }
        // Update all three local lists optimistically
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patch = (list: any[]) => list.map(d => d.id === docId ? { ...d, category } : d)
        setLocalDocs(patch)
        setLocalDoctorDocs(patch)
        setLocalSharedDocs(patch)
    }
    const [uploading, setUploading] = useState(false)
    const [uploadForm, setUploadForm] = useState<{ file: File | null; title: string; category: DocCategory; notes: string }>({
        file: null, title: '', category: 'other', notes: '',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDownload = async (doc: any) => {
        setDownloadingId(doc.id)
        try {
            const url = await getDocumentDownloadUrl(doc)
            if (url) {
                const a = document.createElement('a')
                a.href = url
                a.download = doc.title || 'documento'
                a.target = '_blank'
                a.rel = 'noopener noreferrer'
                a.click()
            } else {
                showToast('No se pudo obtener el enlace del documento', 'error')
            }
        } catch {
            showToast('Error al descargar el documento', 'error')
        } finally {
            setDownloadingId(null)
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
        const result = await uploadDocumentForPatient(
            uploadForm.file,
            patientId,
            { title: uploadForm.title || uploadForm.file.name, category: uploadForm.category, notes: uploadForm.notes || undefined }
        )
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped = localDocs.reduce<Record<string, any[]>>((acc, doc) => {
        const cat = doc.category || 'other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(doc)
        return acc
    }, {})

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Upload button / form */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-900">
                    Expediente de {patientName}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => { setDocReqEmail(patientEmail || ''); setDocReqOpen(true) }}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white text-primary border border-primary text-xs font-bold rounded-lg hover:bg-primary/5 transition-colors"
                    >
                        <FileUp size={14} />
                        Solicitar
                    </button>
                    <button
                        onClick={() => setShowUpload(v => !v)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        <Plus size={14} />
                        Nuevo doc
                    </button>
                </div>
            </div>

            {showUpload && (
                <form onSubmit={handleUpload} className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <Plus size={14} className="text-primary" /> Agregar documento al expediente
                    </p>

                    {/* File picker */}
                    <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                        {uploadForm.file ? (
                            <span className="text-sm font-semibold text-gray-800 truncate max-w-full px-2">{uploadForm.file.name}</span>
                        ) : (
                            <>
                                <Download size={22} className="text-gray-300 rotate-180" />
                                <span className="text-xs text-gray-400">Haz clic para seleccionar archivo (PDF, imagen, etc.)</span>
                            </>
                        )}
                        <input
                            type="file"
                            className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                            onChange={e => {
                                const f = e.target.files?.[0] || null
                                setUploadForm(prev => ({ ...prev, file: f, title: prev.title || f?.name.replace(/\.[^/.]+$/, '') || '' }))
                            }}
                        />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            value={uploadForm.title}
                            onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Nombre del documento"
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <select
                            value={uploadForm.category}
                            onChange={e => setUploadForm(prev => ({ ...prev, category: e.target.value as DocCategory }))}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                        >
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>

                    <input
                        value={uploadForm.notes}
                        onChange={e => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Notas (opcional)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { setShowUpload(false); setUploadForm({ file: null, title: '', category: 'other', notes: '' }) }}
                            className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={uploading || !uploadForm.file}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                        >
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} className="rotate-180" />}
                            {uploading ? 'Subiendo…' : 'Subir'}
                        </button>
                    </div>
                </form>
            )}

            {/* Documents uploaded by this doctor */}
            {localDoctorDocs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Plus size={12} /> Subidos por ti
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">{localDoctorDocs.length}</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {localDoctorDocs.map(doc => (
                            <DocCard key={doc.id} doc={doc} downloadingId={downloadingId} onDownload={handleDownload} onCategoryChange={handleCategoryChange} />
                        ))}
                    </div>
                </div>
            )}

            {/* Documents shared by the patient via solicitud link */}
            {localSharedDocs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-600 flex items-center gap-1.5">
                        <Send size={12} /> Enviados por el paciente
                        <span className="bg-teal-50 text-teal-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">{localSharedDocs.length}</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {localSharedDocs.map(doc => (
                            <DocCard key={doc.id} doc={doc} downloadingId={downloadingId} onDownload={handleDownload} onCategoryChange={handleCategoryChange} />
                        ))}
                    </div>
                </div>
            )}

            {/* Patient's own documents grouped by category */}
            {localDocs.length === 0 && localDoctorDocs.length === 0 && localSharedDocs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">El paciente no tiene documentos cargados.</p>
                    <p className="text-xs mt-1">Puedes agregar el primero con el botón de arriba.</p>
                </div>
            ) : localDocs.length > 0 ? (
                <div className="space-y-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Documentos del paciente
                        <span className="ml-2 bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">{localDocs.length}</span>
                    </p>
                    {Object.entries(grouped).map(([category, docs]) => (
                        <div key={category} className="space-y-2">
                            <p className="text-[11px] font-semibold text-gray-400 pl-1">{CATEGORY_LABELS[category] || category}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {docs.map(doc => (
                                    <DocCard key={doc.id} doc={doc} downloadingId={downloadingId} onDownload={handleDownload} onCategoryChange={handleCategoryChange} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Document Request Modal */}
            {docReqOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                                        list="doc-type-options-pd"
                                        value={docReqType}
                                        onChange={e => setDocReqType(e.target.value)}
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
        </div>
    )
}
