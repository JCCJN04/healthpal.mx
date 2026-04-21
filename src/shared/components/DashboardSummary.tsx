import React from 'react'
import { FileText, ChevronRight, Users, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import type { UserRole } from '@/shared/types/database'

interface SummaryData {
    nextAppointment: {
        date: string;
        time: string;
        doctor: string;
    } | null;
    documentCount: number;
    unreadMessages: number;
    activePatients?: number;
    sharedDocumentCount?: number;
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

    const getInitials = (name: string) =>
        name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={userName} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20">
                            {getInitials(userName)}
                        </div>
                    )}
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Bienvenido, <span className="text-primary">{userName.split(' ')[0]}</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {role === 'doctor'
                            ? 'Gestión de expedientes de tus pacientes'
                            : 'Tu expediente de salud centralizado'}
                    </p>
                </div>
            </div>

            {/* 3 stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 1. Documentos — protagonista */}
                <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-primary/20 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <FileText size={18} className="text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wider">
                                {role === 'doctor' ? 'Documentos' : 'Mis Documentos'}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.documentCount}</p>
                        {role === 'doctor' ? (
                            <p className="text-xs text-gray-500">Subidos para pacientes</p>
                        ) : (
                            <p className="text-xs text-gray-500">
                                {(data.sharedDocumentCount ?? 0) > 0
                                    ? `+ ${data.sharedDocumentCount} recibidos de tu médico`
                                    : 'En tu historial médico'}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/documentos')}
                        className="mt-4 flex items-center justify-between text-primary text-xs font-bold group"
                    >
                        VER EXPEDIENTE
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* 2. Compartidos (paciente) / Pacientes activos (doctor) */}
                {role === 'doctor' ? (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                                <Users size={18} className="text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Pacientes Activos</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{data.activePatients ?? 0}</p>
                            <p className="text-xs text-gray-500">Con historial activo</p>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard/consultas')}
                            className="mt-4 flex items-center justify-between text-primary text-xs font-bold group"
                        >
                            VER PACIENTES
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                ) : (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                                <Share2 size={18} className="text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Compartidos</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{data.sharedDocumentCount ?? 0}</p>
                            <p className="text-xs text-gray-500">De tu médico</p>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard/documentos')}
                            className="mt-4 flex items-center justify-between text-primary text-xs font-bold group"
                        >
                            VER COMPARTIDOS
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}

            </div>
        </div>
    )
}
