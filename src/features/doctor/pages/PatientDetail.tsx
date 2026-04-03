import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
    ArrowLeft,
    Calendar,
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
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { getPatientFullProfile, getPatientNotes, addPatientNote, getPatientContactInfo } from '@/features/doctor/services/patients'
import { getPatientProfile } from '@/shared/lib/queries/profile'
import { listUpcomingAppointments, listPastAppointments } from '@/shared/lib/queries/appointments'
import { getUserDocuments, getDocumentDownloadUrl, uploadDocumentForPatient, getDoctorDocumentsForPatient } from '@/shared/lib/queries/documents'
import { getConsentForPatient, requestPatientAccess, ConsentScopes } from '@/shared/lib/queries/consent'
import { useAuth } from '@/app/providers/AuthContext'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { mapDashboardPath } from '@/context/DemoContext'
import { validateFile } from '@/shared/lib/errors'
import type { DocCategory } from '@/shared/types/database'

type TabType = 'summary' | 'notes' | 'activity' | 'expediente'
type ConsentGate = 'loading' | 'no-consent' | 'requested' | 'rejected' | 'revoked' | 'accepted'

export default function PatientDetail() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<TabType>('summary')
    const [patient, setPatient] = useState<any>(null)
    const [medProfile, setMedProfile] = useState<any>(null)
    const [notes, setNotes] = useState<any[]>([])
    const [appointments, setAppointments] = useState<any[]>([])
    const [documents, setDocuments] = useState<any[]>([])
    const [doctorDocs, setDoctorDocs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newNote, setNewNote] = useState({ title: '', body: '' })
    const [savingNote, setSavingNote] = useState(false)

    // Consent state
    const [consentGate, setConsentGate] = useState<ConsentGate>('loading')
    const [scopes, setScopes] = useState<ConsentScopes>({
        share_basic_profile: false,
        share_contact: false,
        share_documents: false,
        share_appointments: false,
        share_medical_notes: false,
    })
    const [contactInfo, setContactInfo] = useState<{ email?: string; phone?: string } | null>(null)
    const [requestingAccess, setRequestingAccess] = useState(false)
    const [requestReason, setRequestReason] = useState('')

    useEffect(() => {
        if (id && user) {
            checkConsentThenLoad()
        }
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

            // Status === 'accepted' — save scopes and load data
            const liveScopes: ConsentScopes = {
                share_basic_profile: consent.share_basic_profile,
                share_contact: consent.share_contact,
                share_documents: consent.share_documents,
                share_appointments: consent.share_appointments,
                share_medical_notes: consent.share_medical_notes,
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
            const promises: Promise<any>[] = []
            const keys: string[] = []

            // Medical profile: always try if basic profile is granted
            promises.push(getPatientProfile(id!).catch(e => { logger.error('PatientDetail.medProfile', e); return null }))
            keys.push('medProfile')

            if (s.share_medical_notes) {
                promises.push(getPatientNotes(id!, user!.id).catch(e => { logger.error('PatientDetail.notes', e); return [] }))
                keys.push('notes')
            }

            if (s.share_appointments) {
                promises.push(
                    Promise.all([
                        listUpcomingAppointments({ userId: id!, role: 'patient' }).catch(e => { logger.error('PatientDetail.appts.upcoming', e); return [] }),
                        listPastAppointments({ userId: id!, role: 'patient' }).catch(e => { logger.error('PatientDetail.appts.past', e); return [] }),
                    ]).then(([upcoming, past]) =>
                        [...upcoming, ...past].sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
                    )
                )
                keys.push('appointments')
            }

            if (s.share_documents) {
                promises.push(getUserDocuments(id!, null, true).catch(e => { logger.error('PatientDetail.docs', e); return [] }))
                keys.push('documents')
                promises.push(getDoctorDocumentsForPatient(user!.id, id!).catch(e => { logger.error('PatientDetail.doctorDocs', e); return [] }))
                keys.push('doctorDocs')
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
                    case 'appointments': setAppointments(results[i] || []); break
                    case 'documents': setDocuments(results[i] || []); break
                    case 'doctorDocs': setDoctorDocs(results[i] || []); break
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
            <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
                {/* Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-2"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Volver</span>
                </button>

                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-primary to-teal-600"></div>
                    <div className="px-6 pb-6">
                        <div className="flex flex-col md:flex-row gap-6 -mt-12">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white p-1 shadow-lg flex-shrink-0">
                                {patient.avatar_url ? (
                                    <img src={patient.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold uppercase">
                                        {patient.full_name?.charAt(0) || 'P'}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 pt-2 md:pt-14">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{patient.full_name || 'Paciente'}</h1>
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                            {scopes.share_contact && contactInfo?.email && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail size={14} className="text-gray-400" />
                                                    <span>{contactInfo.email}</span>
                                                </div>
                                            )}
                                            {scopes.share_contact && contactInfo?.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <Phone size={14} className="text-gray-400" />
                                                    <span>{contactInfo.phone}</span>
                                                </div>
                                            )}
                                            {!scopes.share_contact && (
                                                <div className="flex items-center gap-1.5 text-gray-400">
                                                    <Lock size={14} />
                                                    <span className="text-xs italic">Contacto no compartido</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">
                                                <ShieldCheck size={12} />
                                                <span>Acceso concedido</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {scopes.share_contact && (
                                            <button
                                                onClick={() => navigate(mapDashboardPath(`/dashboard/mensajes?with=${patient.id}`))}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-teal-600 shadow-sm transition-all"
                                            >
                                                <MessageSquare size={18} />
                                                <span>Mensaje</span>
                                            </button>
                                        )}
                                        {scopes.share_appointments && (
                                            <button
                                                onClick={() => navigate(mapDashboardPath(`/dashboard/consultas/nueva?patient=${patient.id}`))}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                                            >
                                                <Calendar size={18} />
                                                <span>Agendar</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Summary & Medical Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 bg-white rounded-t-xl px-2">
                            {[
                                { id: 'summary', label: 'Resumen Médico', icon: Activity, enabled: true },
                                { id: 'expediente', label: 'Expediente Digital', icon: FileText, enabled: scopes.share_documents },
                                { id: 'notes', label: 'Notas Clínicas', icon: StickyNote, enabled: scopes.share_medical_notes },
                                { id: 'activity', label: 'Consultas', icon: Calendar, enabled: scopes.share_appointments },
                            ].filter(t => t.enabled).map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id
                                        ? 'text-primary border-primary bg-primary/5'
                                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white rounded-b-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
                            {activeTab === 'summary' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-blue-600 mb-1">Edad</p>
                                            <p className="text-xl font-bold text-gray-900">{calculateAge(patient.birthdate)} años</p>
                                        </div>
                                        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100/50">
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-purple-600 mb-1">Sexo</p>
                                            <p className="text-xl font-bold text-gray-900 capitalize">{patient.sex === 'male' ? 'Hombre' : patient.sex === 'female' ? 'Mujer' : 'Otro'}</p>
                                        </div>
                                        <div className="p-3 bg-red-50/50 rounded-xl border border-red-100/50">
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-red-600 mb-1">Tipo Sangre</p>
                                            <p className="text-xl font-bold text-gray-900">{medProfile?.blood_type || pProfile.blood_type || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 bg-green-50/50 rounded-xl border border-green-100/50">
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-green-600 mb-1">Idioma</p>
                                            <p className="text-xl font-bold text-gray-900 uppercase">{medProfile?.preferred_language || pProfile.preferred_language || 'ES'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <Scale size={16} className="text-primary" />
                                                Mediciones Biométricas
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="border border-gray-100 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Ruler size={14} className="text-gray-400" />
                                                        <span className="text-xs text-gray-500 font-medium">Altura</span>
                                                    </div>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {medProfile?.height_cm !== undefined && medProfile?.height_cm !== null
                                                            ? `${medProfile.height_cm} cm`
                                                            : pProfile.height_cm !== undefined && pProfile.height_cm !== null
                                                                ? `${pProfile.height_cm} cm`
                                                                : '---'}
                                                    </p>
                                                </div>
                                                <div className="border border-gray-100 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Scale size={14} className="text-gray-400" />
                                                        <span className="text-xs text-gray-500 font-medium">Peso</span>
                                                    </div>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {medProfile?.weight_kg !== undefined && medProfile?.weight_kg !== null
                                                            ? `${medProfile.weight_kg} kg`
                                                            : pProfile.weight_kg !== undefined && pProfile.weight_kg !== null
                                                                ? `${pProfile.weight_kg} kg`
                                                                : '---'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <AlertCircle size={16} className="text-red-500" />
                                                Datos médicos sensibles
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="border border-gray-100 rounded-lg p-3">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Condiciones Crónicas</p>
                                                    <p className="text-sm font-medium text-gray-900">{medProfile?.chronic_conditions || pProfile?.chronic_conditions || 'Ninguna registrada'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="border border-gray-100 rounded-lg p-3 bg-red-50/30">
                                                        <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Alergias</p>
                                                        <p className="text-sm font-medium text-red-900">{medProfile?.allergies || pProfile?.allergies || 'Ninguna'}</p>
                                                    </div>
                                                    <div className="border border-gray-100 rounded-lg p-3 bg-blue-50/30">
                                                        <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Medicamentos Activos</p>
                                                        <p className="text-sm font-medium text-blue-900">{medProfile?.current_medications || pProfile?.current_medications || 'Ninguno'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <FileText size={16} className="text-blue-500" />
                                            Resumen clínico
                                            </h3>
                                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-sm text-gray-800 leading-relaxed">
                                                {medProfile?.notes_for_doctor || pProfile?.notes_for_doctor || 'Sin notas clínicas adicionales registradas.'}
                                            </div>
                                        </div>
                                </div>
                            )}

                            {activeTab === 'expediente' && scopes.share_documents && (
                                <ExpedienteDigital
                                    documents={documents}
                                    doctorDocs={doctorDocs}
                                    patientName={patient.full_name}
                                    patientId={patient.id}
                                    doctorId={user!.id}
                                    onUpload={() => loadPatientData()}
                                />
                            )}

                            {activeTab === 'notes' && scopes.share_medical_notes && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                                    {/* Create Note Form */}
                                    <form onSubmit={handleCreateNote} className="bg-gray-50 p-4 rounded-xl space-y-3">
                                        <div className="flex items-center gap-2 text-primary mb-1">
                                            <Plus size={18} />
                                            <span className="text-sm font-bold">Nueva Nota Clínica</span>
                                        </div>
                                        <input
                                            placeholder="Título de la nota (ej: Seguimiento de tratamiento)"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                                            value={newNote.title}
                                            onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                                        />
                                        <textarea
                                            placeholder="Describe la evolución, hallazgos o recomendaciones..."
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                                            value={newNote.body}
                                            onChange={e => setNewNote({ ...newNote, body: e.target.value })}
                                            required
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={savingNote || !newNote.body.trim()}
                                                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-all flex items-center gap-2"
                                            >
                                                {savingNote ? <Loader2 size={16} className="animate-spin" /> : <StickyNote size={16} />}
                                                Guardar Nota
                                            </button>
                                        </div>
                                    </form>

                                    {/* Notes Timeline */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900">Historial de evolución</h3>
                                        {notes.length === 0 ? (
                                            <div className="text-center py-10 text-gray-400">
                                                <StickyNote size={40} className="mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-medium">Aún no hay notas para este paciente.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {notes.map(note => (
                                                    <div key={note.id} className="border-l-2 border-primary/20 pl-4 py-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="font-bold text-gray-900 text-sm">{note.title || 'Nota Clínica'}</h4>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(note.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed">{note.body}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && scopes.share_appointments && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <Calendar size={16} className="text-primary" />
                                            Todas las Consultas
                                            {appointments.length > 0 && (
                                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    {appointments.length}
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                    {appointments.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <Calendar size={40} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-sm font-medium">No hay consultas registradas.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {appointments.map(apt => {
                                                const isPast = new Date(apt.start_at) < new Date()
                                                const statusMap: Record<string, { label: string; color: string }> = {
                                                    confirmed: { label: 'Confirmada', color: 'text-green-600 bg-green-50' },
                                                    requested: { label: 'Solicitada', color: 'text-blue-600 bg-blue-50' },
                                                    completed: { label: 'Completada', color: 'text-gray-600 bg-gray-100' },
                                                    cancelled: { label: 'Cancelada', color: 'text-red-500 bg-red-50' },
                                                    rejected: { label: 'Rechazada', color: 'text-orange-500 bg-orange-50' },
                                                    no_show: { label: 'No asistió', color: 'text-yellow-600 bg-yellow-50' },
                                                }
                                                const st = statusMap[apt.status] || { label: apt.status, color: 'text-gray-500 bg-gray-50' }
                                                return (
                                                    <div
                                                        key={apt.id}
                                                        className="group flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-primary/30 transition-all cursor-pointer"
                                                        onClick={() => navigate(mapDashboardPath(`/dashboard/consultas/${apt.id}`))}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary'}`}>
                                                                <span className="text-[10px] font-bold uppercase">{new Date(apt.start_at).toLocaleDateString('es-MX', { month: 'short' })}</span>
                                                                <span className="text-sm font-bold -mt-1">{new Date(apt.start_at).getDate()}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                                    {apt.reason || 'Consulta médica'}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(apt.start_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    {' · '}
                                                                    {new Date(apt.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                                                            <ChevronRight size={14} className="text-gray-300" />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Actions and Highlights */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Plus size={16} className="text-primary" />
                                Acciones Rápidas
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {scopes.share_appointments && (
                                <button
                                    onClick={() => navigate(mapDashboardPath(`/dashboard/consultas/nueva?patient=${patient.id}`))}
                                    className="flex items-center gap-3 p-3 text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10">
                                        <Plus size={16} />
                                    </div>
                                    Nueva Consulta
                                </button>
                                )}
                                {scopes.share_documents && (
                                <button
                                    onClick={() => setActiveTab('expediente')}
                                    className="flex items-center gap-3 p-3 text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10">
                                        <FileText size={16} />
                                    </div>
                                    Expediente Digital
                                </button>
                                )}
                            </div>
                        </div>

                        {/* Insurance — only if medical notes scope */}
                        {scopes.share_medical_notes && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Información de Seguro</p>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{medProfile?.insurance_provider || pProfile.insurance_provider || 'Particular'}</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium">Cobertura</span>
                                        <span className="font-mono font-bold text-primary">Gestionada de forma segura</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs py-2">
                                        <span className="text-gray-500 font-medium">Estatus</span>
                                        <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded font-bold uppercase border border-teal-100">Activo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}

                        {/* Emergency Contact — only with contact scope */}
                        {scopes.share_contact && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Contacto del Paciente</h3>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-900">{patient.full_name || 'Paciente'}</p>
                                <p className="text-xs text-gray-500">{contactInfo?.phone || '---'}</p>
                            </div>
                            {contactInfo?.phone && (
                                <a
                                    href={`tel:${contactInfo.phone}`}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-100 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-all text-xs"
                                >
                                    <Phone size={14} /> Llamar
                                </a>
                            )}
                        </div>
                        )}
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

function DocCard({ doc, downloadingId, onDownload }: { doc: any; downloadingId: string | null; onDownload: (doc: any) => void }) {
    return (
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{doc.title || 'Documento'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                    {CATEGORY_LABELS[doc.category] || doc.category}
                    {doc.file_size ? ` • ${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
                    {doc.created_at ? ` • ${new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                </p>
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
    patientName,
    patientId,
    doctorId,
    onUpload,
}: {
    documents: any[]
    doctorDocs: any[]
    patientName: string
    patientId: string
    doctorId: string
    onUpload: () => void
}) {
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    const [showUpload, setShowUpload] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadForm, setUploadForm] = useState<{ file: File | null; title: string; category: DocCategory; notes: string }>({
        file: null, title: '', category: 'other', notes: '',
    })

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

    const grouped = documents.reduce<Record<string, any[]>>((acc, doc) => {
        const cat = doc.category || 'other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(doc)
        return acc
    }, {})

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Upload button / form */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                    Expediente de {patientName}
                </h3>
                <button
                    onClick={() => setShowUpload(v => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors"
                >
                    <Plus size={14} />
                    Nuevo documento
                </button>
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
            {doctorDocs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Plus size={12} /> Subidos por ti
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">{doctorDocs.length}</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {doctorDocs.map(doc => (
                            <DocCard key={doc.id} doc={doc} downloadingId={downloadingId} onDownload={handleDownload} />
                        ))}
                    </div>
                </div>
            )}

            {/* Patient's own documents grouped by category */}
            {documents.length === 0 && doctorDocs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">El paciente no tiene documentos cargados.</p>
                    <p className="text-xs mt-1">Puedes agregar el primero con el botón de arriba.</p>
                </div>
            ) : documents.length > 0 ? (
                <div className="space-y-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Documentos del paciente
                        <span className="ml-2 bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case">{documents.length}</span>
                    </p>
                    {Object.entries(grouped).map(([category, docs]) => (
                        <div key={category} className="space-y-2">
                            <p className="text-[11px] font-semibold text-gray-400 pl-1">{CATEGORY_LABELS[category] || category}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {docs.map(doc => (
                                    <DocCard key={doc.id} doc={doc} downloadingId={downloadingId} onDownload={handleDownload} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    )
}
