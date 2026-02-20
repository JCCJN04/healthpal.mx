import { X, Calendar, Clock, ExternalLink } from 'lucide-react'
import type { AppointmentWithProfiles } from '@/shared/lib/queries/calendar'

interface AppointmentDetailsPanelProps {
    appointment: AppointmentWithProfiles | null
    onClose: () => void
    onViewDetail?: (id: string) => void
}

export const AppointmentDetailsPanel = ({
    appointment,
    onClose,
    onViewDetail
}: AppointmentDetailsPanelProps) => {
    if (!appointment) return null;

    const startDate = new Date(appointment.start_at)
    const endDate = new Date(appointment.end_at)

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        })
    }

    const statusColors = {
        requested: 'bg-yellow-50/80 text-yellow-700 border-yellow-200/50',
        confirmed: 'bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white border-teal-400 shadow-xl shadow-teal-500/20',
        completed: 'bg-blue-50/80 text-blue-700 border-blue-200/50',
        cancelled: 'bg-red-50/80 text-red-600 border-red-100 opacity-60',
        rejected: 'bg-gray-100 text-gray-500 border-gray-200 opacity-60',
        no_show: 'bg-orange-50/80 text-orange-700 border-orange-200/50'
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

            {/* Modal Card */}
            <div
                className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[-20px_0_80px_rgba(0,0,0,0.15)] overflow-hidden relative flex flex-col max-h-[90vh]"
                style={{
                    animation: 'modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <style>{`
                  @keyframes modalEnter {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                  }
                `}</style>
                {/* Header - Glassmorphism */}
                <div className="p-8 border-b border-gray-100/50 flex items-center justify-between bg-white/70 backdrop-blur-xl sticky top-0 z-20">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Detalles de Consulta</h2>
                        <p className="text-[10px] font-black text-[#33C7BE] uppercase tracking-[0.2em] mt-1">Gestión de Cita</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-900 rounded-2xl active:scale-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
                    {/* Status Badge */}
                    <div className="flex">
                        <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${statusColors[appointment.status as keyof typeof statusColors] || 'bg-gray-50 text-gray-500'}`}>
                            {appointment.status === 'confirmed' ? 'Confirmado' : appointment.status}
                        </span>
                    </div>

                    {/* Date & Time - Grouped Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50">
                        <div className="flex items-center gap-5 group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-teal-500/10 border border-teal-50 transition-transform group-hover:scale-110">
                                <Calendar className="w-6 h-6 text-[#33C7BE]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Fecha</p>
                                <p className="text-lg font-black text-gray-900 capitalize tracking-tight">{formatDate(startDate)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-blue-500/10 border border-blue-50 transition-transform group-hover:scale-110">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Horario</p>
                                <p className="text-lg font-black text-gray-900 tabular-nums">
                                    {formatTime(startDate)} – {formatTime(endDate)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reason / Symptoms - Elegant Block */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-6 bg-[#33C7BE] rounded-full" />
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Contexto</h4>
                        </div>
                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group/box">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/30 rounded-full blur-3xl -mr-16 -mt-16 group-hover/box:bg-teal-100/30 transition-colors" />
                            <p className="text-lg font-black text-gray-900 leading-snug italic relative z-10">
                                "{appointment.reason || 'Sin motivo especificado'}"
                            </p>
                            {appointment.symptoms && (
                                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-2">
                                    <p className="text-[10px] font-black text-[#33C7BE] uppercase tracking-[0.2em] leading-none">Síntomas reportados</p>
                                    <p className="text-sm text-gray-500 font-bold leading-relaxed">{appointment.symptoms}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Participant Info */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Participantes</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {appointment.doctor && (
                                <div className="bg-white rounded-3xl p-5 border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-default">
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-teal-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-inner">
                                        {appointment.doctor.avatar_url ? (
                                            <img src={appointment.doctor.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-teal-600 font-black text-2xl">
                                                {appointment.doctor.full_name?.[0] || 'D'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-[#33C7BE] uppercase tracking-[0.2em] mb-1 leading-none">Médico</p>
                                        <p className="text-lg font-black text-gray-900 truncate tracking-tight">{appointment.doctor.full_name}</p>
                                    </div>
                                </div>
                            )}

                            {appointment.patient && (
                                <div className="bg-white rounded-3xl p-5 border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-default">
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-blue-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-inner">
                                        {appointment.patient.avatar_url ? (
                                            <img src={appointment.patient.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-blue-600 font-black text-2xl">
                                                {appointment.patient.full_name?.[0] || 'P'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1 leading-none">Paciente</p>
                                        <p className="text-lg font-black text-gray-900 truncate tracking-tight">{appointment.patient.full_name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-8 bg-white border-t border-gray-100/50 flex flex-col sm:flex-row gap-4">
                    {onViewDetail && (
                        <button
                            onClick={() => onViewDetail(appointment.id)}
                            className="group flex-1 flex items-center justify-center gap-3 bg-[#33C7BE] text-white font-black py-5 rounded-[1.5rem] hover:bg-teal-600 transition-all shadow-2xl shadow-teal-500/20 active:scale-[0.98] overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <ExternalLink className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span className="tracking-wide text-lg">Abrir Consulta</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-8 py-5 rounded-[1.5rem] border border-gray-200 text-gray-400 font-black text-lg hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-[0.98]"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
