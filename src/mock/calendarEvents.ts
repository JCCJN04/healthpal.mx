export interface CalendarEvent {
  id: string
  title: string
  doctor: string
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  date: string // YYYY-MM-DD
  type: 'occupied' | 'available' | 'selected'
  color: 'red' | 'teal'
  description?: string
}

export const mockCalendarEvents: CalendarEvent[] = [
  // Wednesday, Jan 24 - 10:00 AM
  {
    id: 'evt-1',
    title: 'Cita Seguimiento...',
    doctor: 'Dr Raul Salinas',
    startTime: '10:00',
    endTime: '11:00',
    date: '2026-01-24',
    type: 'occupied',
    color: 'red',
    description: 'Cita de seguimiento post-operatorio'
  },
  // Tuesday, Jan 23 - 12:00 PM
  {
    id: 'evt-2',
    title: 'Cita Seguimiento...',
    doctor: 'Dr Raul Salinas',
    startTime: '12:00',
    endTime: '13:00',
    date: '2026-01-23',
    type: 'occupied',
    color: 'red',
    description: 'Cita de revisión general'
  },
  // Thursday, Jan 25 - 8:00 AM
  {
    id: 'evt-3',
    title: 'Cita Seguimiento...',
    doctor: 'Dr Raul Salinas',
    startTime: '08:00',
    endTime: '09:00',
    date: '2026-01-25',
    type: 'selected',
    color: 'teal',
    description: 'Cita de control mensual'
  },
  // Friday, Jan 26 - 9:00 AM
  {
    id: 'evt-4',
    title: 'Cita Seguimiento...',
    doctor: 'Dr Raul Salinas',
    startTime: '09:00',
    endTime: '10:00',
    date: '2026-01-26',
    type: 'occupied',
    color: 'red',
    description: 'Consulta de especialidad'
  }
]

export const getEventsByDate = (date: string): CalendarEvent[] => {
  return mockCalendarEvents.filter(event => event.date === date)
}

export const getEventsByWeek = (weekStart: Date): CalendarEvent[] => {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  
  return mockCalendarEvents.filter(event => {
    const eventDate = new Date(event.date)
    return eventDate >= weekStart && eventDate < weekEnd
  })
}

export const getEventsByDoctor = (doctor: string): CalendarEvent[] => {
  if (!doctor) return mockCalendarEvents
  return mockCalendarEvents.filter(event => 
    event.doctor.toLowerCase().includes(doctor.toLowerCase())
  )
}

// Convert time string (HH:MM) to position in grid (0-1 range for the hour)
export const timeToPosition = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  const startHour = 7 // Calendar starts at 7 AM
  const relativeHour = hours - startHour
  return relativeHour + (minutes / 60)
}

// Get event duration in hours
export const getEventDuration = (startTime: string, endTime: string): number => {
  const start = timeToPosition(startTime)
  const end = timeToPosition(endTime)
  return end - start
}
