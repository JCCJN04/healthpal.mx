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
    Droplets,
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
import { listUpcomingAppointments } from '@/shared/lib/queries/appointments'
import { getUserDocuments } from '@/shared/lib/queries/documents'
import { getConsentForPatient, requestPatientAccess, ConsentScopes } from '@/shared/lib/queries/consent'
import { useAuth } from '@/app/providers/AuthContext'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

type TabType = 'summary' | 'notes' | 'activity'
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
            setConsentGate('accepted')
            setScopes({
                share_basic_profile: consent.share_basic_profile,
                share_contact: consent.share_contact,
                share_documents: consent.share_documents,
                share_appointments: consent.share_appointments,
                share_medical_notes: consent.share_medical_notes,
            })

            await loadPatientData()
        } catch (err) {
            logger.error('PatientDetail.consentCheck', err)
            setConsentGate('no-consent')
            setLoading(false)
        }
    }

    async function loadPatientData() {
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

            if (scopes.share_medical_notes) {
                promises.push(getPatientNotes(id!, user!.id).catch(e => { logger.error('PatientDetail.notes', e); return [] }))
                keys.push('notes')
            }

            if (scopes.share_appointments) {
                promises.push(listUpcomingAppointments({ userId: id!, role: 'patient' }).catch(e => { logger.error('PatientDetail.appts', e); return [] }))
                keys.push('appointments')
            }

            if (scopes.share_documents) {
                promises.push(getUserDocuments(id!).catch(e => { logger.error('PatientDetail.docs', e); return [] }))
                keys.push('documents')
            }

            if (scopes.share_contact) {
                promises.push(getPatientContactInfo(id!).catch(e => { logger.error('PatientDetail.contact', e); return null }))
                keys.push('contact')
            }

            const results = await Promise.all(promises)
            keys.forEach((key, i) => {
                switch (key) {
                    case 'medProfile': setMedProfile(results[i]); break
                    case 'notes': setNotes(results[i] || []); break
                    case 'appointments': setAppointments((results[i] || []).slice(0, 5)); break
                    case 'documents': setDocuments((results[i] || []).slice(0, 5)); break
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
                    <button onClick={() => navigate('/dashboard')} className="mt-4 text-primary hover:underline">Volver al dashboard</button>
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
                                                onClick={() => navigate(`/dashboard/mensajes?with=${patient.id}`)}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-teal-600 shadow-sm transition-all"
                                            >
                                                <MessageSquare size={18} />
                                                <span>Mensaje</span>
                                            </button>
                                        )}
                                        {scopes.share_appointments && (
                                            <button
                                                onClick={() => navigate(`/dashboard/consultas/nueva?patient=${patient.id}`)}
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
                                { id: 'notes', label: 'Notas Clínicas', icon: StickyNote, enabled: scopes.share_medical_notes },
                                { id: 'activity', label: 'Actividad Reciente', icon: Clock, enabled: scopes.share_appointments || scopes.share_documents },
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
                                            <div className="space-y-2">
                                                <div className="bg-red-50/50 p-3 rounded-lg">
                                                    <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Aviso de privacidad</p>
                                                    <p className="text-sm text-gray-700">Los antecedentes sensibles del paciente se gestionan mediante flujos protegidos y no se muestran en texto plano.</p>
                                                </div>
                                                <div className="bg-orange-50/50 p-3 rounded-lg">
                                                    <p className="text-[10px] font-bold text-orange-700 uppercase mb-1">Acceso clínico</p>
                                                    <p className="text-sm text-gray-700">Para revisar detalles clínicos, utiliza las vistas y permisos específicos del expediente cifrado.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <FileText size={16} className="text-blue-500" />
                                            Resumen clínico
                                        </h3>
                                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed italic">
                                            La información de medicamentos y antecedentes sensibles se consulta desde el flujo clínico protegido.
                                        </div>
                                    </div>
                                </div>
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

                            {activeTab === 'activity' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    {scopes.share_appointments && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <Calendar size={16} className="text-primary" />
                                                Próximas Consultas
                                            </h3>
                                            <button onClick={() => navigate('/dashboard/consultas')} className="text-xs font-bold text-primary hover:underline">Ver todas</button>
                                        </div>
                                        {appointments.length === 0 ? (
                                            <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg italic">No hay consultas programadas.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {appointments.map(apt => (
                                                    <div key={apt.id} className="group flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate(`/dashboard/consultas/${apt.id}`)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                                                                <span className="text-[10px] font-bold uppercase">{new Date(apt.start_at).toLocaleDateString('es-MX', { month: 'short' })}</span>
                                                                <span className="text-sm font-bold -mt-1">{new Date(apt.start_at).getDate()}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">Consulta médica</p>
                                                                <p className="text-xs text-gray-500">{new Date(apt.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} • {apt.status}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-300" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    )}

                                    {scopes.share_documents && (
                                    <div className={`space-y-4 ${scopes.share_appointments ? 'pt-6 border-t border-gray-100' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <Droplets size={16} className="text-blue-500" />
                                                Documentos y Estudios
                                            </h3>
                                            <button onClick={() => navigate('/dashboard/documentos')} className="text-xs font-bold text-primary hover:underline">Ver todos</button>
                                        </div>
                                        {documents.length === 0 ? (
                                            <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg italic">Sin documentos cargados.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {documents.map(doc => (
                                                    <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-primary/30 transition-all group">
                                                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-gray-900 truncate">{doc.title}</p>
                                                            <p className="text-[10px] text-gray-500">{doc.category} • {(doc.file_size / 1024 / 1024).toFixed(1)} MB</p>
                                                        </div>
                                                        <button className="text-gray-400 hover:text-primary p-1">
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
                                    onClick={() => navigate(`/dashboard/consultas/nueva?patient=${patient.id}`)}
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
                                    onClick={() => navigate('/dashboard/documentos')}
                                    className="flex items-center gap-3 p-3 text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10">
                                        <FileText size={16} />
                                    </div>
                                    Expediente Digital
                                </button>
                                )}
                                {scopes.share_contact && (
                                <button
                                    onClick={() => navigate(`/dashboard/mensajes?with=${patient.id}`)}
                                    className="flex items-center gap-3 p-3 text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10">
                                        <MessageSquare size={16} />
                                    </div>
                                    Contactar al Paciente
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
