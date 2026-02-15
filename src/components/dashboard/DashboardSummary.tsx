import React from 'react'
import { Calendar, FileText, MessageSquare, AlertCircle, ChevronRight, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '../Skeleton'
import type { UserRole } from '../../types/database'

interface SummaryData {
    nextAppointment: {
        date: string;
        time: string;
        doctor: string;
    } | null;
    documentCount: number;
    unreadMessages: number;
    activePatients?: number;
    alerts: {
        type: 'profile' | 'appointment' | 'document';
        message: string;
    }[];
}

interface DashboardSummaryProps {
    userName: string;
    avatarUrl?: string | null;
    loading: boolean;
    data: SummaryData;
    role?: UserRole;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
    userName,
    avatarUrl,
    loading,
    data,
    role
}) => {
    const navigate = useNavigate()

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2)
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={userName} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20">
                            {getInitials(userName)}
                        </div>
                    )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Bienvenido, <span className="text-primary">{userName.split(' ')[0]}</span>
                </h1>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Next Appointment Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <Calendar size={18} className="text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Próxima Consulta</span>
                        </div>
                        {data.nextAppointment ? (
                            <div className="mt-1">
                                <p className="text-sm font-bold text-gray-900">{data.nextAppointment.date}</p>
                                <p className="text-xs text-gray-600 line-clamp-1">{data.nextAppointment.time} - {data.nextAppointment.doctor}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 mt-1 italic">No tienes consultas próximas</p>
                        )}
                    </div>
                    <button
                        onClick={() => navigate(data.nextAppointment ? '/dashboard/consultas' : '/dashboard/doctores')}
                        className="mt-4 flex items-center justify-between text-primary text-xs font-bold group"
                    >
                        {data.nextAppointment ? 'VER DETALLES' : 'AGENDAR AHORA'}
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Documents Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <FileText size={18} className="text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Mis Documentos</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{data.documentCount}</p>
                        <p className="text-xs text-gray-500">Documentos médicos</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/documentos')}
                        className="mt-4 flex items-center justify-between text-primary text-xs font-bold group"
                    >
                        VER DOCUMENTOS
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Messages Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <MessageSquare size={18} className="text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Mensajes</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{data.unreadMessages}</p>
                        <p className="text-xs text-gray-500">Mensajes sin leer</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/mensajes')}
                        className="mt-4 flex items-center justify-between text-primary text-xs font-bold group"
                    >
                        IR A MENSAJES
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Alerts / Patients Card */}
                {role === 'doctor' ? (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                                <Users size={18} className="text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Pacientes Activos</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{data.activePatients ?? 0}</p>
                            <p className="text-xs text-gray-500">Con citas o seguimiento</p>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard/consultas')}
                            className="mt-4 flex items-center justify-between text-primary text-xs font-bold group"
                        >
                            VER CONSULTAS
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                ) : (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                                <AlertCircle size={18} className="text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Estado de Cuenta</span>
                            </div>
                            <div className="mt-1 space-y-2">
                                {data.alerts.length > 0 ? (
                                    data.alerts.slice(0, 1).map((alert, i) => (
                                        <p key={i} className="text-sm font-medium text-amber-600 line-clamp-2">
                                            {alert.message}
                                        </p>
                                    ))
                                ) : (
                                    <p className="text-sm text-green-600 font-medium">✓ Perfil al día</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard/configuracion')}
                            className="mt-4 flex items-center justify-between text-primary text-xs font-bold group"
                        >
                            COMPLETAR PERFIL
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
