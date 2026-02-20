import { format, startOfDay, differenceInMinutes, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Loader2, Plus } from 'lucide-react'
import type { AppointmentWithProfiles } from '@/shared/lib/queries/calendar'

interface DayViewProps {
  date: Date;
  appointments: AppointmentWithProfiles[];
  onTimeSlotClick: (date: Date) => void;
  onEventClick: (appointment: AppointmentWithProfiles) => void;
  isLoading?: boolean;
}

export const DayView = ({ date, appointments, onTimeSlotClick, onEventClick, isLoading }: DayViewProps) => {
  // Generate hours 7 AM to 10 PM
  const hours = Array.from({ length: 16 }, (_, i) => i + 7)

  const getEventStyle = (event: AppointmentWithProfiles) => {
    const start = new Date(event.start_at)
    const end = new Date(event.end_at)
    const dayStart = startOfDay(start)

    // Minutes from 7 AM
    const startOffset = differenceInMinutes(start, addDays(dayStart, 0).setHours(7, 0, 0, 0) as any)
    const duration = differenceInMinutes(end, start)

    // Each hour is 80px
    const minuteHeight = 80 / 60

    return {
      top: `${Math.max(0, startOffset * minuteHeight)}px`,
      height: `${Math.max(40, duration * minuteHeight)}px`,
    }
  }

  // Add missing addDays import if needed, but we can just use dayStart
  function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  const statusColors = {
    requested: 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200/50',
    confirmed: 'bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white border-teal-400 shadow-2xl shadow-teal-500/30',
    completed: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200/50',
    cancelled: 'bg-gradient-to-br from-red-50 to-red-100 text-red-500 border-red-200/50 opacity-60 line-through',
    rejected: 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-500 border-gray-200 opacity-60',
    no_show: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-orange-200/50'
  }

  // Current time line helper
  const now = new Date();
  const isTodayDate = isToday(date);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = 7 * 60;
  const timeLineTop = (currentMinutes - startMinutes) * (80 / 60);

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header Info - Premium Glass */}
      <div className="p-8 border-b border-gray-100/50 flex items-center justify-between bg-white/70 backdrop-blur-xl sticky top-0 z-30">
        <div>
          <p className="text-[10px] font-black text-[#33C7BE] uppercase tracking-[0.3em] mb-2 leading-none">Agenda Diaria</p>
          <div className="flex items-center gap-4">
            <h3 className={`text-3xl font-black capitalize tracking-tight ${isTodayDate ? 'text-gray-900' : 'text-gray-900'}`}>
              {format(date, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            {isTodayDate && (
              <span className="px-3 py-1 bg-teal-50 text-[#33C7BE] text-[10px] font-black uppercase rounded-full border border-teal-100/50 animate-pulse">
                Hoy
              </span>
            )}
            {isLoading && <Loader2 className="w-5 h-5 text-[#33C7BE] animate-spin" />}
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Total Agenda</p>
          <p className="text-3xl font-black text-gray-900 tabular-nums tracking-tighter">{appointments.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative scrollbar-hide bg-gray-50/20">
        <div className="grid grid-cols-[100px_1fr] min-h-full">
          {/* Time Labels - Clear & Bold */}
          <div className="border-r border-gray-100/50 bg-white">
            {hours.map(hour => (
              <div key={hour} className="h-20 pr-6 text-[11px] font-black text-gray-400 text-right py-3 uppercase tracking-tighter opacity-60">
                {format(new Date().setHours(hour, 0), 'h:mm a')}
              </div>
            ))}
          </div>

          {/* Grid Slots */}
          <div className="relative">
            {hours.map(hour => (
              <div
                key={hour}
                onClick={() => {
                  const d = new Date(date);
                  d.setHours(hour, 0, 0, 0);
                  onTimeSlotClick(d);
                }}
                className="h-20 border-b border-gray-100/30 hover:bg-[#33C7BE]/5 cursor-pointer transition-colors relative"
              />
            ))}

            {/* Current Time Line Overlay */}
            {isTodayDate && timeLineTop > 0 && timeLineTop < (hours.length * 80) && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none flex items-center"
                style={{ top: `${timeLineTop}px` }}
              >
                <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-md shadow-red-500/50" />
                <div className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded uppercase tracking-widest shadow-sm">
                  Ahora
                </div>
              </div>
            )}

            {/* Event Overlays - Modern Deep Gradient */}
            <div className="absolute inset-0 pointer-events-none p-6">
              {appointments.map(event => (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  style={getEventStyle(event)}
                  className={`absolute left-6 right-6 rounded-[2rem] border p-6 text-left pointer-events-auto transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:z-20 flex flex-col justify-between group/card ${statusColors[event.status as keyof typeof statusColors] || 'bg-gray-100'
                    }`}
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">
                        {format(new Date(event.start_at), 'h:mm a')} – {format(new Date(event.end_at), 'h:mm a')}
                      </p>
                      <div className="w-2 h-2 rounded-full bg-current animate-pulse md:block hidden" />
                    </div>
                    <h4 className="text-2xl font-black leading-tight mb-4 tracking-tight group-hover/card:translate-x-1 transition-transform">
                      {event.reason || 'Consulta General'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-4 mt-auto">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20 shadow-inner group-hover/card:rotate-6 transition-transform">
                      {(event.doctor?.full_name?.[0] || event.patient?.full_name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Participante</p>
                      <p className="text-base font-black truncate tracking-tight">
                        {event.doctor?.full_name || event.patient?.full_name}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty State - High Fidelity */}
        {!isLoading && appointments.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-white/40 backdrop-blur-[2px]">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-gray-200/50 flex items-center justify-center mb-6 relative">
              <Clock className="w-10 h-10 text-gray-200" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#33C7BE] rounded-xl flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-gray-900 font-black text-2xl tracking-tight">No hay citas para hoy</p>
            <p className="text-gray-400 text-sm font-bold mt-2 uppercase tracking-[0.2em]">Selecciona un horario para empezar</p>
          </div>
        )}
      </div>
    </div>
  );
};
