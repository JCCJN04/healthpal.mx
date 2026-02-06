import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '../mock/appointments';

interface MonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onDateClick: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MonthView = ({
  currentDate,
  appointments,
  onDateClick,
  onPrevMonth,
  onNextMonth,
}: MonthViewProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Generate calendar days
  const days: { date: Date; isCurrentMonth: boolean; appointments: Appointment[] }[] = [];

  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({ date, isCurrentMonth: false, appointments: [] });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateString = date.toISOString().split('T')[0];
    const dayAppointments = appointments.filter(apt => apt.date === dateString);
    days.push({ date, isCurrentMonth: true, appointments: dayAppointments });
  }

  // Next month days to fill the grid
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push({ date, isCurrentMonth: false, appointments: [] });
  }

  const monthName = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (date: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 capitalize">{monthName}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const hasAppointments = day.appointments.length > 0;
            const isTodayDate = isToday(day.date);

            return (
              <button
                key={index}
                onClick={() => onDateClick(day.date)}
                className={`
                  relative aspect-square p-2 rounded-lg transition-colors text-sm
                  ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                  ${isTodayDate ? 'bg-[#33C7BE] text-white font-bold' : 'hover:bg-gray-50'}
                  ${hasAppointments && !isTodayDate ? 'font-semibold' : ''}
                `}
              >
                <span className="block">{day.date.getDate()}</span>
                {hasAppointments && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                    {day.appointments.slice(0, 3).map((_apt, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          isTodayDate ? 'bg-white' : 'bg-[#33C7BE]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#33C7BE] rounded"></div>
            <span>Hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white border border-[#33C7BE] rounded flex items-center justify-center">
              <div className="w-1 h-1 bg-[#33C7BE] rounded-full"></div>
            </div>
            <span>Días con citas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
