import React from 'react'
import { FileText, ChevronRight, Users, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { SpotlightCard } from '@/shared/components/ui/SpotlightCard'
import { motion } from 'framer-motion'
import type { UserRole } from '@/shared/types/database'

interface SummaryData {
  documentCount: number
  activePatients?: number
  sharedDocumentCount?: number
}

interface DashboardSummaryProps {
  userName: string
  avatarUrl?: string | null
  loading: boolean
  data: SummaryData
  role?: UserRole
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  userName,
  avatarUrl,
  loading,
  data,
  role,
}) => {
  const navigate = useNavigate()

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)

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
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Hero with Smooth Entrance Animation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-white via-white/95 to-teal-50/50 border border-teal-100/70 shadow-sm hover:shadow-md transition-shadow duration-300 p-5 sm:p-6"
      >
        {/* Decorative ambient gradients */}
        <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-40 -bottom-20 w-60 h-60 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-primary/20 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-sm text-base">
                {getInitials(userName)}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-700 border border-teal-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                {role === 'doctor' ? 'Portal Clínico' : 'Expediente Personal'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              Bienvenido, <span className="text-primary">{userName.split(' ')[0]}</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {role === 'doctor'
                ? 'Gestión de expedientes de tus pacientes'
                : 'Tu expediente de salud centralizado'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards with Spotlight and Motion Entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Documentos */}
        <SpotlightCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <FileText size={18} className="text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {role === 'doctor' ? 'Documentos' : 'Mis Documentos'}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">{data.documentCount}</p>
            {role === 'doctor' ? (
              <p className="text-xs text-gray-500 mt-1">Subidos para pacientes</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {(data.sharedDocumentCount ?? 0) > 0
                  ? `+ ${data.sharedDocumentCount} recibidos de tu médico`
                  : 'En tu historial médico'}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/dashboard/documentos')}
            className="mt-4 flex items-center justify-between text-primary text-xs font-bold group pt-2 border-t border-gray-50 hover:text-teal-700 transition-colors"
          >
            VER EXPEDIENTE
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </SpotlightCard>

        {/* Pacientes activos (doctor) / Compartidos (paciente) */}
        {role === 'doctor' ? (
          <SpotlightCard
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Users size={18} className="text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Pacientes Activos
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.activePatients ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Con acceso al expediente</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/pacientes')}
              className="mt-4 flex items-center justify-between text-primary text-xs font-bold group pt-2 border-t border-gray-50 hover:text-teal-700 transition-colors"
            >
              VER PACIENTES
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </SpotlightCard>
        ) : (
          <SpotlightCard
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Share2 size={18} className="text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Documentos Compartidos
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.sharedDocumentCount ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Recibidos de tus profesionales de salud</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/documentos')}
              className="mt-4 flex items-center justify-between text-primary text-xs font-bold group pt-2 border-t border-gray-50 hover:text-teal-700 transition-colors"
            >
              VER COMPARTIDOS
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </SpotlightCard>
        )}
      </div>
    </div>
  )
}
