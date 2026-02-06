import type { CalendarEvent } from '../mock/calendarEvents'

interface CalendarEventProps {
  event: CalendarEvent
  onClick: () => void
}

export const CalendarEventBlock = ({ event, onClick }: CalendarEventProps) => {
  const getEventColor = () => {
    if (event.color === 'red') {
      return 'bg-red-400 hover:bg-red-500'
    } else if (event.color === 'teal') {
      return 'bg-[#33C7BE] hover:bg-[#2bb5ad]'
    }
    return 'bg-gray-400 hover:bg-gray-500'
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <button
      onClick={onClick}
      className={`
        absolute left-1 right-1 rounded-lg shadow-md
        ${getEventColor()}
        text-white text-left p-2
        transition-all duration-200
        cursor-pointer
        overflow-hidden
        z-10
      `}
      title={`${event.title} - ${event.doctor}`}
    >
      <div className="space-y-0.5">
        <p className="text-xs font-semibold truncate leading-tight">
          {event.title}
        </p>
        <p className="text-[10px] leading-tight opacity-90">
          {formatTime(event.startTime)} – {formatTime(event.endTime)}
        </p>
        <p className="text-[10px] leading-tight opacity-90 truncate">
          {event.doctor}
        </p>
      </div>
    </button>
  )
}
