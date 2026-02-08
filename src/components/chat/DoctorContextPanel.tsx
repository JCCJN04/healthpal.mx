// @ts-nocheck
import { useNavigate } from 'react-router-dom'
import { User, Calendar, ExternalLink, ShieldCheck } from 'lucide-react'
import { ConversationWithDetails } from '../../lib/queries/chat'

interface DoctorContextPanelProps {
    conversation: ConversationWithDetails | null
}

export default function DoctorContextPanel({ conversation }: DoctorContextPanelProps) {
    const navigate = useNavigate()

    if (!conversation) return null

    const profile = conversation.other_participant
    const isDoctor = profile?.role === 'doctor'

    return (
        <div className="hidden lg:flex flex-col w-80 bg-white border-l border-gray-100 p-6 space-y-8 overflow-y-auto">
            {/* Minimal Profile */}
            <div className="text-center space-y-4">
                <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-3xl bg-teal-50 flex items-center justify-center text-[#33C7BE] font-black text-3xl shadow-sm border-2 border-white ring-1 ring-gray-100 overflow-hidden mx-auto">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            profile?.full_name?.charAt(0) || '?'
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm border border-gray-100">
                        <ShieldCheck className="w-5 h-5 text-[#33C7BE]" />
                    </div>
                </div>

                <div>
                    <h3 className="font-black text-gray-900 text-lg leading-tight">
                        {isDoctor ? 'Dr. ' : ''}{profile?.full_name || 'Usuario'}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {isDoctor ? 'Especialista verificado' : 'Paciente registrado'}
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Acciones rápidas</h4>
                {isDoctor && (
                    <button
                        onClick={() => navigate(`/dashboard/consultas/nueva?doctor=${profile.id}`)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-[#33C7BE]/10 hover:text-[#33C7BE] rounded-2xl transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5" />
                            <span className="text-sm font-bold">Agendar Cita</span>
                        </div>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                )}
                <button
                    onClick={() => navigate(`/dashboard/doctores/${profile?.id}`)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">Ver Perfil</span>
                    </div>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            {/* Privacy Note */}
            <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100/50">
                <p className="text-[10px] leading-relaxed text-teal-700/70 font-medium">
                    Toda tu comunicación está protegida por encriptación de extremo a extremo. HealthPal no almacena copias legibles de tus mensajes médicos.
                </p>
            </div>
        </div>
    )
}
