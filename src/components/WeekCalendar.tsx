import { CalendarEventBlock } from './CalendarEvent'
import type { CalendarEvent } from '../mock/calendarEvents'
import { timeToPosition, getEventDuration } from '../mock/calendarEvents'

interface TimeSlot {
  time: string
  hour: number
}

interface WeekDay {
  date: Date
  dayName: string
  dayNumber: number
}

interface WeekCalendarProps {
  weekStart: Date
  onTimeSlotClick: (date: Date, time: string) => void
  onEventClick: (event: CalendarEvent) => void
  events?: CalendarEvent[]
}

export const WeekCalendar = ({ weekStart, onTimeSlotClick, onEventClick, events = [] }: WeekCalendarProps) => {
  // Generate time slots from 7 AM to 2 PM
  const timeSlots: TimeSlot[] = [
    { time: '7 AM', hour: 7 },
    { time: '8 AM', hour: 8 },
    { time: '9 AM', hour: 9 },
    { time: '10 AM', hour: 10 },
    { time: '11 AM', hour: 11 },
    { time: '12 PM', hour: 12 },
    { time: '1 PM', hour: 13 },
    { time: '2 PM', hour: 14 }
  ]

  // Generate 5 weekdays starting from weekStart (MON-FRI)
  const generateWeekDays = (startDate: Date): WeekDay[] => {
    const days: WeekDay[] = []
    const dayNames = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      days.push({
        date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate()
      })
    }
    
    return days
  }

  const weekDays = generateWeekDays(weekStart)

  // Check if a day should be highlighted (Thursday in the screenshot)
  const isHighlightedDay = (dayIndex: number) => {
    return dayIndex === 3 // Thursday (0-indexed, so 3 = 4th day)
  }

  const handleSlotClick = (day: WeekDay, timeSlot: TimeSlot) => {
    const slotDate = new Date(day.date)
    slotDate.setHours(timeSlot.hour, 0, 0, 0)
    onTimeSlotClick(slotDate, timeSlot.time)
  }

  // Get events for a specific day
  const getEventsForDay = (day: WeekDay): CalendarEvent[] => {
    const dateStr = day.date.toISOString().split('T')[0]
    return events.filter(event => event.date === dateStr)
  }

  // Calculate event position and height
  const getEventStyle = (event: CalendarEvent) => {
    const position = timeToPosition(event.startTime)
    const duration = getEventDuration(event.startTime, event.endTime)
    const cellHeight = 64 // 16 * 4 (h-16 = 64px)
    
    return {
      top: `${position * cellHeight}px`,
      height: `${duration * cellHeight - 4}px` // -4px for gap
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-200">
            <div className="p-4"></div>
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`p-4 text-center border-l border-gray-200 ${
                  isHighlightedDay(index) ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                  {day.dayName}
                </div>
                <div className="text-xl font-semibold text-gray-900">
                  {day.dayNumber}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots Grid */}
          <div className="relative">
            {timeSlots.map((timeSlot, timeIndex) => (
              <div
                key={timeIndex}
                className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-100 last:border-b-0"
              >
                {/* Time Label */}
                <div className="p-4 text-sm font-medium text-gray-600 border-r border-gray-200">
                  {timeSlot.time}
                </div>

                {/* Day Columns */}
                {weekDays.map((day, dayIndex) => (
                  <button
                    key={dayIndex}
                    onClick={() => handleSlotClick(day, timeSlot)}
                    className={`
                      p-4 h-16 border-l border-gray-100 transition-colors
                      hover:bg-[#33C7BE]/10 cursor-pointer relative
                      ${isHighlightedDay(dayIndex) ? 'bg-blue-50/20' : ''}
                    `}
                  >
                    {/* Empty slot */}
                  </button>
                ))}
              </div>
            ))}

            {/* Event Overlays */}
            <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
              <div className="grid grid-cols-[80px_repeat(5,1fr)] h-full">
                {/* Time column spacer */}
                <div></div>
                
                {/* Event columns */}
                {weekDays.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day)
                  
                  return (
                    <div key={dayIndex} className="relative border-l border-gray-100 pointer-events-none">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          style={getEventStyle(event)}
                          className="absolute w-full pointer-events-auto"
                        >
                          <CalendarEventBlock
                            event={event}
                            onClick={() => onEventClick(event)}
                          />
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
