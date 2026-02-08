import { format, addDays, startOfDay, differenceInMinutes, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AppointmentWithProfiles } from '../lib/queries/calendar'

interface WeekCalendarProps {
  weekStart: Date
  onTimeSlotClick: (date: Date) => void
  onEventClick: (event: AppointmentWithProfiles) => void
  events?: AppointmentWithProfiles[]
}

export const WeekCalendar = ({ weekStart, onTimeSlotClick, onEventClick, events = [] }: WeekCalendarProps) => {
  // Generate hours 7 AM to 10 PM
  const hours = Array.from({ length: 16 }, (_, i) => i + 7)

  // Generate 7 days starting from weekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getEventStyle = (event: AppointmentWithProfiles) => {
    const start = new Date(event.start_at)
    const end = new Date(event.end_at)
    const dayStart = startOfDay(start)

    // Minutes from 7 AM
    const startOffset = differenceInMinutes(start, addDays(dayStart, 0).setHours(7, 0, 0, 0) as any)
    const duration = differenceInMinutes(end, start)

    // Each hour is 64px (h-16)
    const minuteHeight = 64 / 60

    return {
      top: `${Math.max(0, startOffset * minuteHeight)}px`,
      height: `${Math.max(20, duration * minuteHeight)}px`,
    }
  }

  const statusColors = {
    requested: 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200/50',
    confirmed: 'bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white border-teal-400 shadow-lg shadow-teal-500/20',
    completed: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200/50',
    cancelled: 'bg-gradient-to-br from-red-50 to-red-100 text-red-500 border-red-100 opacity-60 grayscale-[0.3]',
    rejected: 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-500 border-gray-200 opacity-60',
    no_show: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-orange-200/50'
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Sticky Header */}
      <div className="grid grid-cols-[80px_1fr] border-b border-gray-100/50 sticky top-0 z-30 bg-white/90 backdrop-blur-xl transition-all">
        <div className="p-4 bg-gray-50/10"></div>
        <div className="grid grid-cols-7">
          {weekDays.map((day, i) => (
            <div key={i} className="py-6 text-center border-l border-gray-50/50">
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${isToday(day) ? 'text-[#33C7BE]' : 'text-gray-400'}`}>
                {format(day, 'EEE', { locale: es })}
              </div>
              <div className={`text-2xl font-black tabular-nums flex items-center justify-center w-12 h-12 mx-auto rounded-2xl transition-all relative ${isToday(day)
                  ? 'bg-[#33C7BE] text-white shadow-2xl shadow-teal-500/40 scale-110 z-10'
                  : 'text-gray-900 border border-transparent hover:border-gray-100 hover:bg-gray-50'
                }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Grid */}
      <div className="flex-1 overflow-y-auto relative scrollbar-hide bg-gray-50/30">
        <div className="grid grid-cols-[80px_1fr]">
          {/* Time column labels */}
          <div className="flex flex-col bg-white">
            {hours.map(hour => (
              <div key={hour} className="h-20 pr-4 text-[10px] font-black text-gray-300 text-right py-4 uppercase tracking-tighter opacity-80">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 relative">
            {weekDays.map((_, dayIdx) => (
              <div key={dayIdx} className="border-l border-gray-100/30 relative group">
                {hours.map(hour => (
                  <div
                    key={hour}
                    onClick={() => {
                      const d = new Date(weekDays[dayIdx]);
                      d.setHours(hour, 0, 0, 0);
                      onTimeSlotClick(d);
                    }}
                    className="h-20 border-b border-gray-100/30 hover:bg-[#33C7BE]/5 cursor-pointer transition-colors"
                  />
                ))}

                {/* Events for this day */}
                <div className="absolute inset-0 pointer-events-none p-1.5">
                  {events
                    .filter(e => {
                      const d = new Date(e.start_at);
                      return d.getDate() === weekDays[dayIdx].getDate() &&
                        d.getMonth() === weekDays[dayIdx].getMonth();
                    })
                    .map(event => (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        style={getEventStyle(event)}
                        className={`absolute left-1 right-1 rounded-2xl border p-3 text-left pointer-events-auto transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-20 overflow-hidden group/card ${statusColors[event.status as keyof typeof statusColors] || 'bg-gray-100'
                          }`}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                        <p className="text-[11px] font-black truncate leading-tight tracking-tight uppercase mb-1">
                          {event.reason || 'Consulta Médica'}
                        </p>
                        <div className="flex items-center gap-1.5 opacity-90">
                          <div className="w-1 h-1 rounded-full bg-current" />
                          <p className="text-[9px] font-bold truncate uppercase tracking-widest">
                            {event.doctor?.full_name || event.patient?.full_name}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
