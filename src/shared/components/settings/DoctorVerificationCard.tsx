import { Stethoscope, BadgeCheck, Building2, MapPin, Clock, DollarSign, FileText } from 'lucide-react'
import { DoctorProfile } from '@/shared/types/database'

interface DoctorVerificationCardProps {
  doctorProfile: DoctorProfile | null
  isLoading?: boolean
}

export default function DoctorVerificationCard({ doctorProfile, isLoading = false }: DoctorVerificationCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-6" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-36" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const fields: { icon: React.ReactNode; label: string; value: string | number | null | undefined }[] = [
    {
      icon: <BadgeCheck className="w-4 h-4 text-primary" />,
      label: 'Cédula profesional',
      value: doctorProfile?.professional_license,
    },
    {
      icon: <Stethoscope className="w-4 h-4 text-primary" />,
      label: 'Especialidad',
      value: doctorProfile?.specialty,
    },
    {
      icon: <Building2 className="w-4 h-4 text-primary" />,
      label: 'Consultorio / Clínica',
      value: doctorProfile?.clinic_name,
    },
    {
      icon: <MapPin className="w-4 h-4 text-primary" />,
      label: 'Dirección',
      value: doctorProfile?.address_text,
    },
    {
      icon: <Clock className="w-4 h-4 text-primary" />,
      label: 'Años de experiencia',
      value: doctorProfile?.years_experience != null ? `${doctorProfile.years_experience} años` : null,
    },
    {
      icon: <DollarSign className="w-4 h-4 text-primary" />,
      label: 'Precio de consulta',
      value:
        doctorProfile?.consultation_price_mxn != null
          ? `$${doctorProfile.consultation_price_mxn.toLocaleString('es-MX')} MXN`
          : null,
    },
  ]

  const hasBio = Boolean(doctorProfile?.bio)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Stethoscope className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Perfil médico</h3>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Grid of data fields */}
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {fields.map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">{icon}</div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-800">
                  {value ?? <span className="text-gray-400 font-normal">Sin registrar</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bio */}
        {(hasBio || doctorProfile === null) && (
          <div className="flex items-start gap-2.5 pt-1">
            <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Descripción / Bio</p>
              {hasBio ? (
                <p className="text-sm text-gray-700 leading-relaxed">{doctorProfile!.bio}</p>
              ) : (
                <p className="text-sm text-gray-400">Sin registrar</p>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!doctorProfile && (
          <p className="text-sm text-gray-400 text-center py-2">
            No se encontró información de perfil médico.
          </p>
        )}
      </div>
    </div>
  )
}
