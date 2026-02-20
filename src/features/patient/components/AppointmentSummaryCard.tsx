import React from 'react';
import { User, Edit2, Calendar, Clock, Video, Phone, Building2 } from 'lucide-react';

interface AppointmentData {
  reason: string;
  consultationType: string;
  additionalInfo: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
}

interface AppointmentSummaryCardProps {
  data: AppointmentData;
  isConfirmed: boolean;
  onEdit: () => void;
}

const AppointmentSummaryCard: React.FC<AppointmentSummaryCardProps> = ({
  data,
  isConfirmed,
  onEdit,
}) => {
  const getConsultationIcon = () => {
    switch (data.consultationType) {
      case 'Videollamada':
        return <Video className="w-4 h-4" />;
      case 'Llamada telefónica':
        return <Phone className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getConsultationColor = () => {
    switch (data.consultationType) {
      case 'Videollamada':
        return 'bg-blue-100 text-blue-700';
      case 'Llamada telefónica':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-teal-100 text-teal-700';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-2xl font-bold text-gray-900">Revisa tu solicitud</h2>
          {isConfirmed && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Listo para enviar
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Verifica que la información sea correcta antes de enviarla al doctor.
        </p>
      </div>

      {/* Appointment Chip Summary */}
      <div className="p-6 bg-gradient-to-br from-teal-50 to-blue-50 border-b border-gray-100">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Doctor */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">{data.doctorName}</span>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-gray-300"></div>

          {/* Date & Time */}
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{data.appointmentDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{data.appointmentTime}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-gray-300"></div>

          {/* Type */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${getConsultationColor()}`}>
            {getConsultationIcon()}
            <span>{data.consultationType}</span>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="p-6 space-y-6">
        {/* Motivo de la consulta */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Motivo de la consulta
            </h3>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-sm text-[#33C7BE] hover:text-teal-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Editar</span>
            </button>
          </div>
          <p className="text-gray-700 leading-relaxed max-w-2xl">
            {data.reason}
          </p>
        </div>

        {/* Tipo de consulta */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Tipo de consulta
            </h3>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-sm text-[#33C7BE] hover:text-teal-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Editar</span>
            </button>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${getConsultationColor()}`}>
            {getConsultationIcon()}
            <span>{data.consultationType}</span>
          </div>
        </div>

        {/* Información adicional */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Información adicional (opcional)
            </h3>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-sm text-[#33C7BE] hover:text-teal-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Editar</span>
            </button>
          </div>
          {data.additionalInfo ? (
            <p className="text-gray-700 leading-relaxed max-w-2xl">
              {data.additionalInfo}
            </p>
          ) : (
            <p className="text-gray-500 italic text-sm">
              No se agregó información adicional.
            </p>
          )}
        </div>
      </div>

      {/* Privacy Note */}
      <div className="px-6 pb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-xs text-blue-900 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              Tu solicitud solo será visible para el doctor seleccionado. 
              La información está protegida según nuestra política de privacidad.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentSummaryCard;
