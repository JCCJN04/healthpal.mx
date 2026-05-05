import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
    ArrowLeft,
    MessageSquare,
    FileText,
    Clock,
    Plus,
    StickyNote,
    Phone,
    Mail,
    Activity,
    Scale,
    Ruler,
    AlertCircle,
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
    TrendingUp,
    Heart,
    Stethoscope,
    RefreshCw,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { getPatientFullProfile, getPatientNotes, addPatientNote, getPatientContactInfo } from '@/features/doctor/services/patients'
import { getPatientProfile } from '@/shared/lib/queries/profile'
import { getUserDocuments, getDocumentDownloadUrl, uploadDocumentForPatient, getDoctorDocumentsForPatient, getDocumentsSharedByPatientWithDoctor } from '@/shared/lib/queries/documents'
import { createDocumentRequest } from '@/shared/lib/queries/documentRequests'
import { getConsentForPatient, requestPatientAccess, ConsentScopes } from '@/shared/lib/queries/consent'
import { useAuth } from '@/app/providers/AuthContext'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { mapDashboardPath } from '@/context/DemoContext'
import { validateFile } from '@/shared/lib/errors'
import type { DocCategory } from '@/shared/types/database'

type TabType = 'summary' | 'notes' | 'expediente'
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
    })
    const [contactInfo, setContactInfo] = useState<{ email?: string; phone?: string } | null>(null)
    const [requestingAccess, setRequestingAccess] = useState(false)
    const [requestReason, setRequestReason] = useState('')

    useEffect(() => {
        if (id && user) {
            checkConsentThenLoad()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user])

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

            // Status === 'accepted' — full access to EMR, all scopes enabled
            const liveScopes: ConsentScopes = {
                share_basic_profile: true,
                share_contact: true,
                share_documents: true,
                share_appointments: true,
                share_medical_notes: true,
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
                promises.push(getDoctorDocumentsForPatient(user!.id, id!).catch(e => { logger.error('PatientDetail.doctorDocs', e); return [] }))
                keys.push('doctorDocs')
                promises.push(getDocumentsSharedByPatientWithDoctor(user!.id, id!).catch(e => { logger.error('PatientDetail.patientSharedDocs', e); return [] }))
                keys.push('patientSharedDocs')
            }

            if (s.share_contact) {
                promises.push(getPatientContactInfo(id!).catch(e => { logger.error('PatientDetail.contact', e); return null }))
                keys.push('contact')
            }

            const results = await Promise.all(promises)
            keys.forEach((key, i) => {
                switch (key) {
                    case 'medProfile': setMedProfile(results[i]); break
                    case 'notes': setNotes(results[i] || []); break
                    case 'documents': setDocuments(results[i] || []); break
                    case 'doctorDocs': setDoctorDocs(results[i] || []); break
                    case 'patientSharedDocs': setPatientSharedDocs(results[i] || []); break
                    case 'contact': setContactInfo(results[i]); break
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

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-5 p-4 md:p-6">
                {/* Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
                >
                    <ArrowLeft size={16} />
                    <span className="font-medium">Volver a pacientes</span>
                </button>

                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-r from-teal-600 via-primary to-cyan-500 relative">
                        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage:'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize:'20px 20px'}} />
                        {/* Vitals inline en el banner — visibles sin scroll */}
                        <div className="absolute bottom-3 right-4 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-white/80 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                                {calculateAge(patient.birthdate)} años
                            </span>
                            <span className="text-[11px] font-bold text-white/80 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                                {patient.sex === 'male' ? '♂ Hombre' : patient.sex === 'female' ? '♀ Mujer' : 'Otro'}
                            </span>
                            {(medProfile?.blood_type || pProfile.blood_type) && (
                                <span className="text-[11px] font-bold text-white/80 bg-red-500/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                                    🩸 {medProfile?.blood_type || pProfile.blood_type}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="px-5 pb-4">
                        <div className="flex flex-col md:flex-row gap-4 -mt-9">
                            {/* Avatar */}
                            <div className="relative z-10 w-[72px] h-[72px] rounded-xl ring-4 ring-white shadow-md flex-shrink-0 overflow-hidden bg-primary/10">
                                {patient.avatar_url ? (
                                    <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary text-2xl font-bold uppercase">
                                        {patient.full_name?.charAt(0) || 'P'}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 pt-1 md:pt-10">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{patient.full_name || 'Paciente'}</h1>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                            {scopes.share_contact && contactInfo?.email && (
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Mail size={11} className="text-gray-400" />{contactInfo.email}
                                                </span>
                                            )}
                                            {scopes.share_contact && contactInfo?.phone && (
                                                <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors">
                                                    <Phone size={11} className="text-gray-400" />{contactInfo.phone}
                                                </a>
                                            )}
                                            {scopes.share_medical_notes && (medProfile?.insurance_provider || pProfile.insurance_provider) && (
                                                <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                                                    🏥 {medProfile?.insurance_provider || pProfile.insurance_provider}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {scopes.share_medical_notes && (
                                            <button
                                                onClick={() => setActiveTab('notes')}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all"
                                            >
                                                <StickyNote size={14} />
                                                Nueva nota
                                            </button>
                                        )}
                                        {scopes.share_contact && (
                                            <button
                                                onClick={() => navigate(mapDashboardPath(`/dashboard/mensajes?with=${patient.id}`))}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 shadow-sm transition-all"
                                            >
                                                <MessageSquare size={14} />
                                                Mensaje
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerta clínica rápida — aparece solo si hay alergias o condiciones */}
                {(() => {
                    const allergies = (medProfile?.allergies ?? pProfile?.allergies ?? '').trim()
                    const conditions = (medProfile?.chronic_conditions ?? pProfile?.chronic_conditions ?? '').trim()
                    const hasAlert = (allergies && !['ninguna','no','n/a'].includes(allergies.toLowerCase())) ||
                                     (conditions && !['ninguna','no','n/a'].includes(conditions.toLowerCase()))
                    if (!hasAlert) return null
                    return (
                        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex flex-wrap gap-4">
                            {allergies && !['ninguna','no','n/a'].includes(allergies.toLowerCase()) && (
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-sm flex-shrink-0">⚠️</span>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-red-600">Alergia</p>
                                        <p className="text-sm font-semibold text-red-900">{allergies}</p>
                                    </div>
                                </div>
                            )}
                            {conditions && !['ninguna','no','n/a'].includes(conditions.toLowerCase()) && (
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-sm flex-shrink-0">🫀</span>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">Condición Crónica</p>
                                        <p className="text-sm font-semibold text-orange-900">{conditions}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })()}

                {/* Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-0">
                        {/* Tabs */}
                        <div className="flex gap-1 bg-gray-100/80 rounded-xl p-1 overflow-x-auto">
                            {[
                                { id: 'summary', label: 'Resumen Médico', icon: Activity, enabled: true },
                                { id: 'expediente', label: 'Expediente', icon: FileText, enabled: scopes.share_documents },
                                { id: 'notes', label: 'Notas Clínicas', icon: StickyNote, enabled: scopes.share_medical_notes },
                            ].filter(t => t.enabled).map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex-1 justify-center ${activeTab === tab.id
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <tab.icon size={15} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[420px] mt-3">
                            {activeTab === 'summary' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Vital stats row */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Edad', value: `${calculateAge(patient.birthdate)} años`, icon: '🎂', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
                                            { label: 'Sexo', value: patient.sex === 'male' ? 'Hombre' : patient.sex === 'female' ? 'Mujer' : 'Otro', icon: patient.sex === 'male' ? '♂' : '♀', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700' },
                                            { label: 'Tipo de Sangre', value: medProfile?.blood_type || pProfile.blood_type || '—', icon: '🩸', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700' },
                                        ].map((s, i) => (
                                            <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-3.5`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className={`text-[10px] uppercase tracking-widest font-bold ${s.text} opacity-70`}>{s.label}</p>
                                                    <span className="text-base">{s.icon}</span>
                                                </div>
                                                <p className={`text-lg font-bold ${s.text}`}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <Scale size={13} className="text-primary" />
                                                Mediciones Biométricas
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                                                    <div className="flex items-center gap-1.5 mb-1.5">
                                                        <Ruler size={13} className="text-gray-400" />
                                                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Altura</span>
                                                    </div>
                                                    <p className="text-xl font-bold text-gray-900">
                                                        {medProfile?.height_cm ?? pProfile.height_cm
                                                            ? `${medProfile?.height_cm ?? pProfile.height_cm}`
                                                            : '—'}
                                                        <span className="text-xs font-medium text-gray-400 ml-1">cm</span>
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                                                    <div className="flex items-center gap-1.5 mb-1.5">
                                                        <Scale size={13} className="text-gray-400" />
                                                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Peso</span>
                                                    </div>
                                                    <p className="text-xl font-bold text-gray-900">
                                                        {medProfile?.weight_kg ?? pProfile.weight_kg
                                                            ? `${medProfile?.weight_kg ?? pProfile.weight_kg}`
                                                            : '—'}
                                                        <span className="text-xs font-medium text-gray-400 ml-1">kg</span>
                                                    </p>
                                                </div>
                                            </div>
                                            {/* IMC Auto-calculado */}
                                            {(() => {
                                                const h = medProfile?.height_cm ?? pProfile?.height_cm
                                                const w = medProfile?.weight_kg ?? pProfile?.weight_kg
                                                if (!h || !w || h <= 0) return null
                                                const bmi = w / Math.pow(h / 100, 2)
                                                const bmiFixed = bmi.toFixed(1)
                                                const cat = bmi < 18.5
                                                    ? { label: 'Bajo peso', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100', bar: 'bg-blue-400', pct: (bmi / 40) * 100 }
                                                    : bmi < 25
                                                    ? { label: 'Peso normal', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500', pct: (bmi / 40) * 100 }
                                                    : bmi < 30
                                                    ? { label: 'Sobrepeso', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', bar: 'bg-yellow-400', pct: (bmi / 40) * 100 }
                                                    : { label: 'Obesidad', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500', pct: Math.min((bmi / 40) * 100, 100) }
                                                return (
                                                    <div className={`${cat.bg} border ${cat.border} rounded-lg p-3`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <TrendingUp size={14} className="text-gray-400" />
                                                                <span className="text-xs text-gray-500 font-medium">IMC (auto-calculado)</span>
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.color} ${cat.bg} border ${cat.border}`}>{cat.label}</span>
                                                        </div>
                                                        <p className={`text-xl font-bold ${cat.color}`}>{bmiFixed} <span className="text-xs font-medium text-gray-400">kg/m²</span></p>
                                                        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                                            <div className={`h-full ${cat.bar} rounded-full transition-all`} style={{ width: `${Math.min(cat.pct, 100)}%` }} />
                                                        </div>
                                                        <div className="flex justify-between text-[9px] text-gray-400 mt-0.5 font-medium">
                                                            <span>Bajo</span><span>Normal</span><span>Sobre</span><span>Obesidad</span>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <AlertCircle size={13} className="text-red-500" />
                                                Datos Clínicos Clave
                                            </h3>
                                            <div className="space-y-2.5">
                                                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                                                    <span className="text-base flex-shrink-0 mt-0.5">🫀</span>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Condiciones Crónicas</p>
                                                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{medProfile?.chronic_conditions || pProfile?.chronic_conditions || 'Ninguna registrada'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                                    <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Alergias</p>
                                                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{medProfile?.allergies || pProfile?.allergies || 'Ninguna conocida'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                    <span className="text-base flex-shrink-0 mt-0.5">💊</span>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Medicación Activa</p>
                                                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{medProfile?.current_medications || pProfile?.current_medications || 'Ninguna'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t border-gray-100">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            <FileText size={13} className="text-blue-500" />
                                            Notas del paciente al médico
                                        </h3>
                                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 p-4 rounded-xl text-sm text-gray-700 leading-relaxed italic">
                                            "{medProfile?.notes_for_doctor || pProfile?.notes_for_doctor || 'El paciente no ha dejado notas adicionales.'}"
                                        </div>
                                    </div>

                                    {/* ── Señales Clínicas Auto-generadas ────────────────── */}
                                    {(() => {
                                        const allergies = (medProfile?.allergies ?? pProfile?.allergies ?? '').trim()
                                        const conditions = (medProfile?.chronic_conditions ?? pProfile?.chronic_conditions ?? '').trim()
                                        const meds = (medProfile?.current_medications ?? pProfile?.current_medications ?? '').trim()
                                        const lastNote = notes[0]

                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const alerts: { type: 'danger' | 'warning' | 'info' | 'neutral'; icon: any; label: string; value: string; action?: string }[] = []

                                        if (allergies && allergies.toLowerCase() !== 'ninguna' && allergies.toLowerCase() !== 'no') {
                                            alerts.push({ type: 'danger', icon: AlertTriangle, label: '⚠ Alergia conocida', value: allergies, action: 'Verificar antes de prescribir' })
                                        }
                                        if (conditions && conditions.toLowerCase() !== 'ninguna' && conditions.toLowerCase() !== 'no') {
                                            alerts.push({ type: 'warning', icon: Heart, label: 'Condición crónica activa', value: conditions, action: 'Monitoreo continuo recomendado' })
                                        }
                                        if (meds && meds.toLowerCase() !== 'ninguno' && meds.toLowerCase() !== 'no') {
                                            alerts.push({ type: 'info', icon: Stethoscope, label: 'Medicación en curso', value: meds, action: 'Revisar posibles interacciones' })
                                        }
                                        if (scopes.share_medical_notes && lastNote) {
                                            const daysSince = Math.floor((Date.now() - new Date(lastNote.created_at).getTime()) / 86400000)
                                            if (daysSince > 60) {
                                                alerts.push({ type: 'neutral', icon: RefreshCw, label: 'Seguimiento pendiente', value: `Sin notas desde hace ${daysSince} días`, action: 'Considera agregar una nota de evolución' })
                                            }
                                        } else if (scopes.share_medical_notes && notes.length === 0) {
                                            alerts.push({ type: 'neutral', icon: StickyNote, label: 'Sin historial de evolución', value: 'No hay notas clínicas registradas aún', action: 'Agrega la primera nota para iniciar el expediente' })
                                        }

                                        if (alerts.length === 0) return (
                                            <div className="pt-4 border-t border-gray-100">
                                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                                                    <ShieldCheck size={16} className="text-green-600 flex-shrink-0" />
                                                    <span className="font-semibold">Sin señales clínicas de alerta registradas</span>
                                                </div>
                                            </div>
                                        )

                                        const colorMap = {
                                            danger: { card: 'bg-red-50 border-red-200', title: 'text-red-700', sub: 'text-red-600', badge: 'bg-red-100 text-red-700' },
                                            warning: { card: 'bg-orange-50 border-orange-200', title: 'text-orange-700', sub: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
                                            info: { card: 'bg-blue-50 border-blue-200', title: 'text-blue-700', sub: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
                                            neutral: { card: 'bg-gray-50 border-gray-200', title: 'text-gray-700', sub: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' },
                                        }

                                        return (
                                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                    <AlertTriangle size={16} className="text-orange-500" />
                                                    Señales Clínicas
                                                    <span className="ml-1 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {alerts.map((a, i) => {
                                                        const c = colorMap[a.type]
                                                        const Icon = a.icon
                                                        return (
                                                            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${c.card}`}>
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.badge}`}>
                                                                    <Icon size={15} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${c.sub}`}>{a.label}</p>
                                                                    <p className={`text-sm font-semibold ${c.title} truncate`}>{a.value}</p>
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
                                    doctorId={user!.id}
                                    patientEmail={contactInfo?.email}
                                    onUpload={() => loadPatientData()}
                                />
                            )}

                            {activeTab === 'notes' && scopes.share_medical_notes && (
                                <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                                    {/* Create Note Form */}
                                    <form onSubmit={handleCreateNote} className="border border-primary/20 bg-primary/5 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-primary">
                                            <StickyNote size={16} />
                                            <span className="text-sm font-bold">Nueva Nota Clínica</span>
                                        </div>
                                        <input
                                            placeholder="Título (ej: Seguimiento post-consulta)"
                                            className="w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none"
                                            value={newNote.title}
                                            onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                                        />
                                        <textarea
                                            placeholder="Evolución clínica, hallazgos, indicaciones, plan de tratamiento..."
                                            rows={4}
                                            className="w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none resize-none"
                                            value={newNote.body}
                                            onChange={e => setNewNote({ ...newNote, body: e.target.value })}
                                            required
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Lock size={10} /> Cifrada con AES-256
                                            </p>
                                            <button
                                                type="submit"
                                                disabled={savingNote || !newNote.body.trim()}
                                                className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                                            >
                                                {savingNote ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                                Guardar Nota
                                            </button>
                                        </div>
                                    </form>

                                    {/* Timeline */}
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                            Historial de Evolución — {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
                                        </p>
                                        {notes.length === 0 ? (
                                            <div className="text-center py-12 text-gray-400">
                                                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                    <StickyNote size={24} className="opacity-40" />
                                                </div>
                                                <p className="text-sm font-semibold text-gray-500">Sin notas clínicas aún</p>
                                                <p className="text-xs text-gray-400 mt-1">Las notas que agregues aparecerán aquí</p>
                                            </div>
                                        ) : (
                                            <div className="relative space-y-0 overflow-hidden">
                                                {/* Timeline line */}
                                                <div className="absolute left-[18px] top-5 bottom-5 w-0.5 bg-gray-100" />
                                                {notes.map((note, idx) => (
                                                    <div key={note.id} className="relative flex gap-4 pb-5 last:pb-0">
                                                        {/* Dot */}
                                                        <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                                                            <StickyNote size={14} />
                                                        </div>
                                                        {/* Card */}
                                                        <div className={`flex-1 rounded-2xl border p-4 ${idx === 0 ? 'bg-white border-primary/20 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <h4 className="font-bold text-gray-900 text-sm leading-tight">{note.title || 'Nota Clínica'}</h4>
                                                                <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-full">
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
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        {/* Combined stats + actions panel */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Stats grid */}
                            <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                                {[
                                    { icon: StickyNote, label: 'Notas', value: notes.length, color: 'text-primary', bg: 'bg-primary/10', enabled: scopes.share_medical_notes, onClick: () => setActiveTab('notes') },
                                    { icon: FileText, label: 'Docs', value: documents.length + doctorDocs.length + patientSharedDocs.length, color: 'text-blue-600', bg: 'bg-blue-50', enabled: scopes.share_documents, onClick: () => setActiveTab('expediente') },
                                ].map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={s.onClick ?? undefined}
                                        disabled={!s.onClick || !s.enabled}
                                        className={`flex flex-col items-center gap-1.5 py-4 transition-all ${s.enabled ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
                                            <s.icon size={16} />
                                        </div>
                                        <span className={`text-2xl font-black ${s.enabled ? 'text-gray-900' : 'text-gray-300'}`}>{s.enabled ? s.value : '—'}</span>
                                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                            {/* Last note timestamp */}
                            {scopes.share_medical_notes && notes.length > 0 && (
                                <div className="px-4 py-2 flex items-center gap-1.5 text-[11px] text-gray-400 border-b border-gray-50 bg-gray-50/50">
                                    <Clock size={11} />
                                    Última nota: {new Date(notes[0].created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            )}
                            {/* Action buttons */}
                            <div className="p-3 space-y-1.5">
                                {scopes.share_contact && (
                                    <button
                                        onClick={() => navigate(mapDashboardPath(`/dashboard/mensajes?with=${patient.id}`))}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-xl transition-all group border border-transparent hover:border-primary/20"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                            <MessageSquare size={15} />
                                        </div>
                                        Enviar Mensaje
                                        <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-primary/50" />
                                    </button>
                                )}
                                {scopes.share_medical_notes && (
                                    <button
                                        onClick={() => setActiveTab('notes')}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-xl transition-all group border border-transparent hover:border-primary/20"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                            <StickyNote size={15} />
                                        </div>
                                        Nueva Nota Clínica
                                        <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-primary/50" />
                                    </button>
                                )}
                                {scopes.share_documents && (
                                    <button
                                        onClick={() => setActiveTab('expediente')}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-xl transition-all group border border-transparent hover:border-primary/20"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                            <FileText size={15} />
                                        </div>
                                        Ver Expediente
                                        <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-primary/50" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Insurance */}
                        {scopes.share_medical_notes && (medProfile?.insurance_provider || pProfile.insurance_provider) && (
                            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-5 text-white">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-100 mb-1">Seguro Médico</p>
                                <p className="text-base font-bold mt-1">{medProfile?.insurance_provider || pProfile.insurance_provider}</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-xs text-teal-100">Cobertura activa</span>
                                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">ACTIVO</span>
                                </div>
                            </div>
                        )}

                        {/* Privacy badge */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl">
                            <Lock size={13} className="text-gray-400 flex-shrink-0" />
                            <p className="text-[11px] text-gray-400 leading-snug">Datos cifrados con AES-256. Solo tú puedes ver este expediente.</p>
                        </div>
                    </div>
                </div>
            </div>
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
    doctorId,
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
    doctorId: string
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
            const { data, error } = await (createDocumentRequest as any)(doctorId, docReqEmail, docReqType, docReqDesc)
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
            doctorId,
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
