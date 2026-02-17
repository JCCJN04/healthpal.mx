import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    User,
    Search,
    Calendar,
    Clock,
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    Loader2,
    Stethoscope,
    MapPin,
    Video,
    Phone,
    ChevronRight,
    ChevronLeft
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { useAuth } from '@/app/providers/AuthContext'
import { listDoctors, searchDoctors, DoctorWithProfile } from '@/features/patient/services/doctors'
import { createAppointment, getDoctorAppointments } from '@/shared/lib/queries/appointments'
import { showToast } from '@/shared/components/ui/Toast'
import type { Database } from '@/shared/types/database'
import { searchPatients, listDoctorPatients, type PatientProfileLite } from '@/features/doctor/services/patients'

type VisitMode = Database['public']['Enums']['visit_mode']

export default function NuevaConsulta() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, profile } = useAuth()
    const isDoctor = profile?.role === 'doctor'

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)

    // Wizards Data
    const [doctors, setDoctors] = useState<DoctorWithProfile[]>([])
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithProfile | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const [patients, setPatients] = useState<PatientProfileLite[]>([])
    const [doctorPatients, setDoctorPatients] = useState<PatientProfileLite[]>([])
    const [selectedPatient, setSelectedPatient] = useState<PatientProfileLite | null>(null)
    const [patientSearchQuery, setPatientSearchQuery] = useState('')

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        time: '',
        mode: 'in_person' as VisitMode,
        reason: '',
        symptoms: ''
    })

    // Calendar & Slots State
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [occupiedSlots, setOccupiedSlots] = useState<string[]>([])
    const [loadingSlots, setLoadingSlots] = useState(false)

    const businessHours = [
        '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
    ]

    // Pre-load doctor if ID in URL
    useEffect(() => {
        if (isDoctor) {
            loadDoctorPatients()
            return
        }

        const doctorId = searchParams.get('doctor')
        if (doctorId && step === 1) {
            loadInitialDoctor(doctorId)
        } else {
            loadDoctorsList()
        }
    }, [searchParams, isDoctor])

    const loadInitialDoctor = async (id: string) => {
        setSearching(true)
        const docs = await listDoctors()
        const found = docs.find(d => d.id === id)
        if (found) {
            setSelectedDoctor(found)
            setStep(2)
        }
        setDoctors(docs)
        setSearching(false)
    }

    const loadDoctorsList = async () => {
        setSearching(true)
        const docs = searchQuery ? await searchDoctors(searchQuery) : await listDoctors()
        setDoctors(docs)
        setSearching(false)
    }

    const loadPatientsList = async () => {
        setSearching(true)
        // If doctor, filter existing roster locally; otherwise search global patients
        if (isDoctor) {
            const filtered = doctorPatients.filter(p => {
                const term = patientSearchQuery.toLowerCase()
                return (p.full_name || '').toLowerCase().includes(term) || (p.email || '').toLowerCase().includes(term)
            })
            setPatients(filtered)
        } else {
            const results = patientSearchQuery ? await searchPatients(patientSearchQuery) : []
            setPatients(results)
        }
        setSearching(false)
    }

    const loadDoctorPatients = async () => {
        if (!user?.id) return
        setSearching(true)
        const roster = await listDoctorPatients(user.id)
        setDoctorPatients(roster)
        setPatients(roster)
        setSearching(false)
    }

    const doctorIdForSchedule = isDoctor ? user?.id : selectedDoctor?.id

    // Load schedule when date or doctor changes
    useEffect(() => {
        if (doctorIdForSchedule && formData.date) {
            loadDoctorSchedule(doctorIdForSchedule)
        }
    }, [doctorIdForSchedule, formData.date])

    const loadDoctorSchedule = async (doctorId: string) => {
        setLoadingSlots(true)
        const apts = await getDoctorAppointments(doctorId, formData.date)
        const occupied = apts.map(a => {
            const date = new Date(a.start_at)
            return `${String(date.getHours()).padStart(2, '0')}:00`
        })
        setOccupiedSlots(occupied)
        setLoadingSlots(false)
        // Reset time if it's occupied or on new date
        setFormData(prev => ({ ...prev, time: '' }))
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        loadDoctorsList()
    }

    const handlePatientSearch = (e: React.FormEvent) => {
        e.preventDefault()
        loadPatientsList()
    }

    const handleFinish = async () => {
        if (!user) return
        if (!formData.time || !formData.date || !formData.reason) {
            showToast('Completa la fecha, hora y motivo', 'warning')
            return
        }

        const doctorId = isDoctor ? user.id : selectedDoctor?.id
        const patientId = isDoctor ? selectedPatient?.id : user.id

        if (!doctorId || !patientId) {
            showToast('Selecciona el doctor y el paciente antes de continuar', 'warning')
            return
        }

        setLoading(true)

        // Construct temporal dates
        const startAt = new Date(`${formData.date}T${formData.time}:00`)
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000) // Default 1 hour

        const result = await createAppointment({
            doctor_id: doctorId,
            patient_id: patientId,
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            mode: formData.mode,
            reason: formData.reason,
            symptoms: formData.symptoms,
            status: isDoctor ? 'confirmed' : 'requested',
            created_by: user.id
        })

        if (result.success) {
            showToast('Cita agendada exitosamente', 'success')
            navigate('/dashboard/consultas')
        } else {
            showToast(result.error || 'Error al agendar cita', 'error')
        }
        setLoading(false)
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-4">
                {/* Progress Bar */}
                <div className="mb-8 overflow-hidden bg-gray-100 h-2 rounded-full flex">
                    <div className={`h-full bg-[#33C7BE] transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
                </div>

                {/* Step 1: Choose Doctor (patients) */}
                {step === 1 && !isDoctor && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Selecciona a tu Doctor</h1>
                            <p className="text-gray-500 font-medium mt-1">Busca entre nuestros especialistas certificados.</p>
                        </div>

                        <form onSubmit={handleSearch} className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#33C7BE] transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o especialidad..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent shadow-sm rounded-2xl focus:border-[#33C7BE] focus:ring-0 transition-all font-medium text-gray-700"
                            />
                        </form>

                        {searching ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#33C7BE]" /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {doctors.map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => { setSelectedDoctor(doc); setStep(2); }}
                                        className="bg-white p-5 rounded-2xl border-2 border-transparent hover:border-[#33C7BE] shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-[#33C7BE] font-bold text-xl">
                                            {doc.full_name?.charAt(0) || 'D'}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 group-hover:text-[#33C7BE] transition-colors">{doc.full_name}</h3>
                                            <p className="text-gray-500 text-sm font-medium">{doc.doctor_profile?.specialty || 'Especialista'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                    {doc.doctor_profile?.clinic_name || 'Hospital Local'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#33C7BE] transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 1: Choose Patient (doctors) */}
                {step === 1 && isDoctor && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Selecciona al paciente</h1>
                            <p className="text-gray-500 font-medium mt-1">Pacientes con los que ya tienes historial o chat.</p>
                        </div>

                        <form onSubmit={handlePatientSearch} className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#33C7BE] transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar por nombre o email..."
                                value={patientSearchQuery}
                                onChange={(e) => setPatientSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent shadow-sm rounded-2xl focus:border-[#33C7BE] focus:ring-0 transition-all font-medium text-gray-700"
                            />
                        </form>

                        {searching ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#33C7BE]" /></div>
                        ) : patients.length === 0 ? (
                            <div className="bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-400 font-medium">
                                No hay pacientes vinculados aún. Genera una cita o conversación para listarlos aquí.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {patients.map(patient => (
                                    <div
                                        key={patient.id}
                                        onClick={() => { setSelectedPatient(patient); setStep(2); setFormData(prev => ({ ...prev, time: '' })); setOccupiedSlots([]); }}
                                        className="bg-white p-5 rounded-2xl border-2 border-transparent hover:border-[#33C7BE] shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-[#33C7BE] font-bold text-xl">
                                            {patient.full_name?.charAt(0) || 'P'}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 group-hover:text-[#33C7BE] transition-colors">{patient.full_name || 'Paciente'}</h3>
                                            <p className="text-gray-500 text-sm font-medium">{patient.email}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#33C7BE] transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Date, Time & Details */}
                {step === 2 && ((isDoctor && selectedPatient) || (!isDoctor && selectedDoctor)) && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <button onClick={() => setStep(1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-colors mb-4">
                            <ArrowLeft className="w-5 h-5" /> Regresar
                        </button>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-[#33C7BE] text-white flex items-center justify-center font-black text-xl">
                                {isDoctor ? selectedPatient?.full_name?.charAt(0) : selectedDoctor?.full_name?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs font-black text-[#33C7BE] uppercase tracking-widest">{isDoctor ? 'Paciente seleccionado' : 'Confirmando doctor'}</p>
                                <h2 className="text-xl font-black text-gray-900">{isDoctor ? selectedPatient?.full_name : `Dr. ${selectedDoctor?.full_name}`}</h2>
                                {isDoctor && (
                                    <p className="text-xs text-gray-500 font-semibold mt-1">Tú serás el médico asignado</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            {/* Calendar Side */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">Selecciona Fecha</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <div className="text-center font-bold text-[#33C7BE] mb-2">
                                    {currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase()}
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, idx) => <div key={`${d}-${idx}`} className="text-[10px] font-black text-gray-300 py-2">{d}</div>)}
                                    {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`p-${i}`} />)}
                                    {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                        const day = i + 1
                                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                        const todayStr = new Date().toISOString().split('T')[0]
                                        const isToday = dateStr === todayStr
                                        const isSelected = formData.date === dateStr
                                        const isPast = new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0))
                                        const isBeforeToday = new Date(dateStr) < new Date(todayStr)

                                        return (
                                            <button
                                                key={day}
                                                disabled={isPast}
                                                onClick={() => setFormData({ ...formData, date: dateStr })}
                                                className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-[#33C7BE] text-white shadow-lg shadow-teal-100 scale-110 z-10' : isPast ? 'text-gray-200 cursor-not-allowed' : 'text-gray-700 hover:bg-teal-50 hover:text-[#33C7BE]'} ${isToday && !isSelected ? 'border-2 border-teal-100' : ''}`}
                                            >
                                                {day}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Details Side */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-[#33C7BE]" /> Horarios Disponibles
                                    </label>
                                    {loadingSlots ? (
                                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#33C7BE]" /></div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-3">
                                            {businessHours.map(time => {
                                                const isOccupied = occupiedSlots.includes(time)
                                                const isSelected = formData.time === time
                                                const selectedDate = new Date(formData.date)
                                                const slotDateTime = new Date(`${formData.date}T${time}:00`)
                                                const isPastSlot = slotDateTime.getTime() <= Date.now()
                                                const disableSlot = isOccupied || isPastSlot
                                                return (
                                                    <button
                                                        key={time}
                                                        disabled={disableSlot}
                                                        onClick={() => setFormData({ ...formData, time })}
                                                        className={`py-3 rounded-2xl border-2 font-bold text-xs transition-all ${isSelected ? 'border-[#33C7BE] bg-teal-50 text-[#33C7BE] scale-105' : disableSlot ? 'border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed' : 'border-gray-100 text-gray-600 hover:border-teal-200'}`}
                                                    >
                                                        {time}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-3 px-1">Modalidad</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'in_person', icon: MapPin, label: 'Presencial' },
                                            { id: 'video', icon: Video, label: 'Video' },
                                            { id: 'phone', icon: Phone, label: 'Teléfono' }
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setFormData({ ...formData, mode: m.id as VisitMode })}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${formData.mode === m.id ? 'border-[#33C7BE] bg-teal-50/50 text-[#33C7BE]' : 'border-gray-100 bg-white text-gray-400'}`}
                                            >
                                                <m.icon className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-3 px-1">Motivo de Consulta</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Chequeo anual, dolor de garganta..."
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full px-5 py-4 bg-white border-2 border-gray-100 shadow-sm rounded-2xl focus:border-[#33C7BE] focus:ring-0 transition-all font-medium py-3"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-3 px-1">Síntomas adicionales</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Opcional: Describe brevemente tus dudas..."
                                        value={formData.symptoms}
                                        onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                                        className="w-full px-5 py-3 bg-white border-2 border-gray-100 shadow-sm rounded-2xl focus:border-[#33C7BE] focus:ring-0 transition-all font-medium resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(3)}
                            disabled={!formData.date || !formData.time || !formData.reason}
                            className="w-full py-5 bg-[#33C7BE] text-white font-black text-lg rounded-2xl hover:bg-[#2bb5ad] disabled:opacity-50 transition-all shadow-lg shadow-teal-100 flex items-center justify-center gap-2 mt-8"
                        >
                            Resumen Final <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && ((isDoctor && selectedPatient) || (!isDoctor && selectedDoctor)) && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="bg-[#33C7BE]/10 p-8 rounded-[2rem] border-2 border-[#33C7BE]/20 text-center space-y-4">
                            <div className="w-20 h-20 bg-[#33C7BE] text-white rounded-full flex items-center justify-center mx-auto shadow-xl ring-4 ring-white">
                                <Stethoscope className="w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">¿Todo listo para agendar?</h2>
                                <p className="text-gray-500 font-medium">Revisa los detalles antes de confirmar con el especialista.</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-[#33C7BE]"><User className="w-6 h-6" /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isDoctor ? 'Paciente' : 'Médico'}</p>
                                        <p className="font-bold text-gray-900">{isDoctor ? selectedPatient?.full_name : `Dr. ${selectedDoctor?.full_name}`}</p>
                                    </div>
                                </div>
                                <button onClick={() => setStep(1)} className="text-[#33C7BE] font-black text-xs uppercase tracking-widest hover:underline">Cambiar</button>
                            </div>

                            {isDoctor && (
                                <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-[#33C7BE]"><User className="w-6 h-6" /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Doctor</p>
                                        <p className="font-bold text-gray-900">{profile?.full_name || 'Tú'}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8 pb-6 border-b border-gray-100">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><Calendar className="w-3 h-3" /> Fecha y Hora</p>
                                    <p className="font-bold text-gray-900">{new Date(formData.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                    <p className="font-medium text-[#33C7BE]">{formData.time} hrs</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><MapPin className="w-3 h-3" /> Modalidad</p>
                                    <p className="font-bold text-gray-900 uppercase tracking-tight">{formData.mode === 'in_person' ? 'Presencial' : formData.mode === 'video' ? 'Video Llamada' : 'Llamada'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Motivo</p>
                                <p className="font-bold text-gray-900 text-lg leading-tight">"{formData.reason}"</p>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-4 border-2 border-gray-100 text-gray-400 font-black rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest text-sm"
                                >
                                    Editar Detalles
                                </button>
                                <button
                                    onClick={handleFinish}
                                    disabled={loading}
                                    className="flex-[2] py-4 bg-[#33C7BE] text-white font-black rounded-2xl hover:bg-[#2bb5ad] hover:shadow-lg shadow-teal-100 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Confirmar Cita</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
