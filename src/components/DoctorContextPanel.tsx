import React from 'react';
import { User, MapPin, Star, Calendar, FileText, Share2, X } from 'lucide-react';
import { Conversation } from '../mock/messages';

interface DoctorContextPanelProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduleAppointment?: () => void;
  onShareDocument?: () => void;
}

const DoctorContextPanel: React.FC<DoctorContextPanelProps> = ({
  conversation,
  isOpen,
  onClose,
  onScheduleAppointment,
  onShareDocument,
}) => {
  if (!conversation || !isOpen) {
    return null;
  }

  const handleScheduleAppointment = () => {
    console.log('Schedule appointment with:', conversation.doctorName);
    onScheduleAppointment?.();
  };

  const handleShareDocument = () => {
    console.log('Share document with:', conversation.doctorName);
    onShareDocument?.();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Información</h3>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Doctor Info Card */}
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: conversation.doctorAvatar }}
          >
            <User className="w-10 h-10 text-white" />
          </div>
          <h4 className="font-bold text-gray-900 mb-1">
            {conversation.doctorName}
          </h4>
          <p className="text-sm text-gray-600 mb-2">
            {conversation.doctorSpecialty}
          </p>
          
          {/* Status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${conversation.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className={conversation.isOnline ? 'text-green-700' : 'text-gray-500'}>
              {conversation.isOnline ? 'En línea' : 'Desconectado'}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-700 mb-0.5">
                Consultorio
              </p>
              <p className="text-xs text-gray-600">
                Alicante 135, San Jerónimo
              </p>
              <p className="text-xs text-gray-600">
                Monterrey, N.L.
              </p>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-semibold text-gray-900">4.8</span>
            </div>
            <span className="text-xs text-gray-600">127 opiniones</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Acciones rápidas
          </h5>
          
          <button
            onClick={handleScheduleAppointment}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#33C7BE] text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Agendar cita</span>
          </button>

          <button
            onClick={handleShareDocument}
            className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Compartir documento</span>
          </button>
        </div>

        {/* Recent Documents */}
        <div>
          <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Documentos compartidos
          </h5>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  Resultados_Lab.pdf
                </p>
                <p className="text-xs text-gray-500">
                  15 Ene 2026
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  Receta_Medica.pdf
                </p>
                <p className="text-xs text-gray-500">
                  10 Ene 2026
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-900">
            <strong>Privacidad:</strong> Tus conversaciones están cifradas y solo son visibles para ti y tu médico.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DoctorContextPanel;
