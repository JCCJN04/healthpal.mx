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
    Loader2
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getPatientFullProfile, getPatientNotes, addPatientNote } from '../lib/queries/patients'
import { getPatientProfile } from '../lib/queries/profile'
import { listUpcomingAppointments } from '../lib/queries/appointments'
import { getUserDocuments } from '../lib/queries/documents'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../components/Toast'

type TabType = 'summary' | 'notes' | 'activity'

export default function PatientDetail() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<TabType>('summary')
    const [patient, setPatient] = useState<any>(null)
    const [medProfile, setMedProfile] = useState<any>(null) // New state for medical profile
    const [notes, setNotes] = useState<any[]>([])
    const [appointments, setAppointments] = useState<any[]>([])
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newNote, setNewNote] = useState({ title: '', body: '' })
    const [savingNote, setSavingNote] = useState(false)

    useEffect(() => {
        if (id) {
            loadAllData()
        }
    }, [id])

    async function loadAllData() {
        setLoading(true)
        try {
            // 1. Critical data: Profile
            const profile = await getPatientFullProfile(id!)
            if (!profile) {
                setPatient(null)
                setLoading(false)
                return
            }
            setPatient(profile)

            // 2. Non-critical or secondary data: load in parallel but catch errors individually
            const [medProfileData, notesData, appointmentsData, documentsData] = await Promise.all([
                getPatientProfile(id!).catch(e => { console.warn('PDetail: medProfile fail', e); return null }),
                getPatientNotes(id!, user!.id).catch(e => { console.warn('PDetail: notes fail', e); return [] }),
                listUpcomingAppointments({ userId: id!, role: 'patient' }).catch(e => { console.warn('PDetail: appts fail', e); return [] }),
                getUserDocuments(id!).catch(e => { console.warn('PDetail: docs fail', e); return [] })
            ])

            setMedProfile(medProfileData)
            setNotes(notesData)
            setAppointments((appointmentsData || []).slice(0, 5))
            setDocuments((documentsData || []).slice(0, 5))
        } catch (err) {
            console.error('Error loading patient data:', err)
            showToast('Error crítico al cargar el expediente', 'error')
        } finally {
            setLoading(false)
        }
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

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Cargando expediente del paciente...</p>
                </div>
            </DashboardLayout>
        )
    }

    if (!patient) {
        return (
            <DashboardLayout>
                <div className="p-6 text-center">
                    <p className="text-red-500 font-bold">No se encontró el paciente solicitado.</p>
                    <button onClick={() => navigate('/dashboard')} className="mt-4 text-primary hover:underline">Volver al dashboard</button>
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
                                            <div className="flex items-center gap-1.5">
                                                <Mail size={14} className="text-gray-400" />
                                                <span>{patient.email}</span>
                                            </div>
                                            {patient.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <Phone size={14} className="text-gray-400" />
                                                    <span>{patient.phone}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 uppercase font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                                                <span>{patient.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => navigate(`/dashboard/mensajes?with=${patient.id}`)}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-teal-600 shadow-sm transition-all"
                                        >
                                            <MessageSquare size={18} />
                                            <span>Mensaje</span>
                                        </button>
                                        <button
                                            onClick={() => navigate(`/dashboard/consultas/nueva?patient=${patient.id}`)}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                                        >
                                            <Calendar size={18} />
                                            <span>Agendar</span>
                                        </button>
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
                                { id: 'summary', label: 'Resumen Médico', icon: Activity },
                                { id: 'notes', label: 'Notas Clínicas', icon: StickyNote },
                                { id: 'activity', label: 'Actividad Reciente', icon: Clock },
                            ].map((tab) => (
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
                                                Alergias y Condiciones
                                            </h3>
                                            <div className="space-y-2">
                                                <div className="bg-red-50/50 p-3 rounded-lg">
                                                    <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Alergias</p>
                                                    <p className="text-sm text-gray-700">{medProfile?.allergies || pProfile.allergies || 'Ninguna reportada'}</p>
                                                </div>
                                                <div className="bg-orange-50/50 p-3 rounded-lg">
                                                    <p className="text-[10px] font-bold text-orange-700 uppercase mb-1">Enfermedades crónicas</p>
                                                    <p className="text-sm text-gray-700">{medProfile?.chronic_conditions || pProfile.chronic_conditions || 'Ninguna reportada'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <FileText size={16} className="text-blue-500" />
                                            Medicamentos Actuales
                                        </h3>
                                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed italic">
                                            {medProfile?.current_medications || pProfile.current_medications || 'No hay información de medicamentos disponibles en el expediente.'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notes' && (
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
                                                                <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{apt.reason || 'Consulta General'}</p>
                                                                <p className="text-xs text-gray-500">{new Date(apt.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} • {apt.status}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-300" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-gray-100">
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
                                <button
                                    onClick={() => navigate(`/dashboard/consultas/nueva?patient=${patient.id}`)}
                                    className="flex items-center gap-3 p-3 text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10">
                                        <Plus size={16} />
                                    </div>
                                    Nueva Consulta
                                </button>
                                <button
                                    onClick={() => navigate('/dashboard/documentos')}
                                    className="flex items-center gap-3 p-3 text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10">
                                        <FileText size={16} />
                                    </div>
                                    Expediente Digital
                                </button>
                                <button
                                    onClick={() => navigate(`/dashboard/mensajes?with=${patient.id}`)}
                                    className="flex items-center gap-3 p-3 text-sm font-bold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10">
                                        <MessageSquare size={16} />
                                    </div>
                                    Contactar al Paciente
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Información de Seguro</p>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{medProfile?.insurance_provider || pProfile.insurance_provider || 'Particular'}</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium">Póliza</span>
                                        <span className="font-mono font-bold text-primary">{medProfile?.insurance_policy_number || pProfile.insurance_policy_number || '---'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs py-2">
                                        <span className="text-gray-500 font-medium">Estatus</span>
                                        <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded font-bold uppercase border border-teal-100">Activo</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Contacto de Emergencia</h3>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-900">{medProfile?.emergency_contact_name || pProfile.emergency_contact_name || 'No registrado'}</p>
                                <p className="text-xs text-gray-500">{medProfile?.emergency_contact_phone || pProfile.emergency_contact_phone || '---'}</p>
                            </div>
                            {(medProfile?.emergency_contact_phone || pProfile.emergency_contact_phone) && (
                                <a
                                    href={`tel:${medProfile?.emergency_contact_phone || pProfile.emergency_contact_phone}`}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-100 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-all text-xs"
                                >
                                    <Phone size={14} /> Llamada Emergencia
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
