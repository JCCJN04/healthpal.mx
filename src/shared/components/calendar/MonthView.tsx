import { format, isSameMonth, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isToday } from 'date-fns'
import type { AppointmentWithProfiles } from '@/shared/lib/queries/calendar'

interface MonthViewProps {
  currentDate: Date;
  appointments: AppointmentWithProfiles[];
  onDateClick: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MonthView = ({
  currentDate,
  appointments,
  onDateClick,
}: MonthViewProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = [];
  let day = startDate;

  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const statusColors = {
    requested: 'bg-yellow-100/50 text-yellow-700 border-yellow-200/50',
    confirmed: 'bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white shadow-sm shadow-teal-500/20',
    completed: 'bg-blue-100/50 text-blue-700 border-blue-200/50',
    cancelled: 'bg-red-50/50 text-red-500 line-through opacity-60',
    rejected: 'bg-gray-100/50 text-gray-500 opacity-60',
    no_show: 'bg-orange-50/50 text-orange-700 border-orange-200/50'
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-100/50 bg-gray-50/40 sticky top-0 z-10 backdrop-blur-md">
        {['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map((d) => (
          <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-hidden">
        {calendarDays.map((date, i) => {
          const dayAppointments = appointments.filter(a => isSameDay(new Date(a.start_at), date));
          const isCurrentMonth = isSameMonth(date, monthStart);
          const isTodayDate = isToday(date);

          return (
            <div
              key={i}
              className={`min-h-[140px] border-b border-r border-gray-100/30 p-3 transition-all hover:bg-gray-50/50 flex flex-col gap-2 relative group-cell ${!isCurrentMonth ? 'bg-gray-50/20 opacity-40' : ''
                }`}
            >
              {/* Day Number Bubble */}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black tabular-nums transition-all w-9 h-9 flex items-center justify-center rounded-2xl relative ${isTodayDate
                  ? 'bg-[#33C7BE] text-white shadow-xl shadow-teal-500/30 scale-110'
                  : isCurrentMonth ? 'text-gray-900 border border-transparent hover:border-gray-100 hover:bg-gray-100/50' : 'text-gray-300'
                  }`}>
                  {format(date, 'd')}
                </span>
                {dayAppointments.length > 2 && (
                  <span className="text-[10px] font-black text-teal-500 bg-teal-50 px-2 py-0.5 rounded-lg uppercase tracking-tight">
                    +{dayAppointments.length - 2}
                  </span>
                )}
              </div>

              {/* Events list inline - Premium Pills */}
              <div className="flex-1 flex flex-col gap-1.5 overflow-hidden z-10">
                {dayAppointments.slice(0, 2).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateClick(date);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[10px] font-black truncate transition-all hover:scale-[1.03] active:scale-95 shadow-sm border border-black/5 ${statusColors[apt.status as keyof typeof statusColors] || 'bg-gray-100'
                      }`}
                  >
                    <span className="opacity-70 font-bold mr-1">{format(new Date(apt.start_at), 'HH:mm')}</span>
                    {apt.reason || 'Cita'}
                  </button>
                ))}
              </div>

              {/* Click target for creating new */}
              <div
                className="absolute inset-0 cursor-pointer z-0"
                onClick={() => onDateClick(date)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
