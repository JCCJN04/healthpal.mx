import { Clock, MapPin, User } from 'lucide-react';
import type { Appointment } from '../mock/appointments';

interface DayViewProps {
  date: Date;
  appointments: Appointment[];
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventClick: (appointment: Appointment) => void;
}

export const DayView = ({ date, appointments, onTimeSlotClick, onEventClick }: DayViewProps) => {
  // Generate time slots from 7 AM to 8 PM
  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = 7 + i;
    return {
      time: `${hour.toString().padStart(2, '0')}:00`,
      display: hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`,
    };
  });

  const dateString = date.toISOString().split('T')[0];
  const dayAppointments = appointments.filter(apt => apt.date === dateString && apt.startTime && apt.endTime);

  const getAppointmentPosition = (startTime: string) => {
    const [hours] = startTime.split(':').map(Number);
    return (hours - 7) * 80; // 80px per hour
  };

  const getAppointmentHeight = (startTime: string, endTime: string) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const duration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    return (duration / 60) * 80; // 80px per hour
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#33C7BE]/10 to-teal-50">
        <h3 className="text-lg font-bold text-gray-900">
          {date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {dayAppointments.length} {dayAppointments.length === 1 ? 'cita programada' : 'citas programadas'}
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Time slots */}
        <div className="divide-y divide-gray-100">
          {timeSlots.map((slot) => (
            <button
              key={slot.time}
              onClick={() => onTimeSlotClick(date, slot.time)}
              className="w-full flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-500 w-20 flex-shrink-0">
                {slot.display}
              </span>
              <div className="flex-1 min-h-[64px]"></div>
            </button>
          ))}
        </div>

        {/* Event overlays */}
        <div className="absolute top-0 left-24 right-0 pointer-events-none">
          {dayAppointments.map((apt) => {
            const top = getAppointmentPosition(apt.startTime!);
            const height = getAppointmentHeight(apt.startTime!, apt.endTime!);

            return (
              <div
                key={apt.id}
                onClick={() => onEventClick(apt)}
                style={{ top: `${top}px`, height: `${height}px` }}
                className="absolute left-4 right-4 bg-gradient-to-r from-[#33C7BE] to-teal-500 text-white rounded-lg p-3 shadow-md cursor-pointer hover:shadow-lg transition-shadow pointer-events-auto"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm line-clamp-1">{apt.title}</h4>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    {apt.startTime} - {apt.endTime}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-teal-50">
                    <User className="w-3 h-3" />
                    <span className="line-clamp-1">{apt.doctor}</span>
                  </div>
                  {apt.location && (
                    <div className="flex items-center gap-2 text-xs text-teal-50">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{apt.location}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {dayAppointments.length === 0 && (
        <div className="p-12 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No hay citas programadas para este día</p>
          <button
            onClick={() => onTimeSlotClick(date, '09:00')}
            className="mt-4 px-4 py-2 text-sm text-[#33C7BE] hover:bg-teal-50 rounded-lg transition-colors font-medium"
          >
            Agendar una cita
          </button>
        </div>
      )}
    </div>
  );
};
