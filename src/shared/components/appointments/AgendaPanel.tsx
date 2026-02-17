import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react';
import { Appointment } from '@/shared/mock/appointments';

interface AgendaPanelProps {
  appointments: Appointment[];
  selectedAppointmentId?: string | null;
  onSelectAppointment?: (id: string) => void;
}

const AgendaPanel: React.FC<AgendaPanelProps> = ({
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
}) => {
  const navigate = useNavigate();

  const handleOpenAppointment = (id: string) => {
    console.log('Open appointment:', id);
    navigate(`/dashboard/consultas/${id}`);
  };

  const handleScheduleNew = () => {
    navigate('/dashboard/consultas/nueva');
  };

  const getStatusBadge = (status?: string) => {
    const badges = {
      confirmed: { text: 'Confirmada', color: 'bg-green-100 text-green-700' },
      pending: { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
      cancelled: { text: 'Cancelada', color: 'bg-red-100 text-red-700' },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Próximas citas</h2>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-[#33C7BE]" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            No tienes citas programadas
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Agenda una cita con tu doctor para comenzar
          </p>
          <button
            onClick={handleScheduleNew}
            className="px-6 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
          >
            Agendar cita
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Próximas citas</h2>
        <span className="px-3 py-1 bg-teal-50 text-[#33C7BE] text-xs font-semibold rounded-full">
          {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
        </span>
      </div>

      {/* Appointments List */}
      <div className="divide-y divide-gray-100">
        {appointments.map((appointment) => {
          const badge = getStatusBadge(appointment.status);
          const isSelected = selectedAppointmentId === appointment.id;

          return (
            <div
              key={appointment.id}
              className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                isSelected ? 'bg-teal-50 border-l-4 border-[#33C7BE]' : ''
              }`}
              onClick={() => onSelectAppointment?.(appointment.id)}
            >
              {/* Date Badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{appointment.dateFormatted}</span>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                  {badge.text}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {appointment.title}
              </h3>

              {/* Doctor & Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-purple-700">
                      {appointment.doctor.charAt(4)}
                    </span>
                  </div>
                  <span>{appointment.doctor}</span>
                </div>

                {appointment.startTime && appointment.endTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {appointment.startTime} - {appointment.endTime}
                    </span>
                  </div>
                )}

                {appointment.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="line-clamp-1">{appointment.location}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAppointment(appointment.id);
                }}
                className="w-full px-4 py-2.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <span>Abrir</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={handleScheduleNew}
          className="w-full px-4 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Agendar nueva cita</span>
        </button>
      </div>
    </div>
  );
};

export default AgendaPanel;
