export interface Appointment {
  id: string
  title: string
  date: string
  dateFormatted: string
  doctor: string
  type: 'past' | 'upcoming'
  description?: string
  status?: 'confirmed' | 'pending' | 'cancelled'
  attendanceStatus?: 'attending' | 'not-attending' | 'pending'
  startTime?: string
  endTime?: string
  specialty?: string
  location?: string
}

export const mockAppointments: Appointment[] = [
  // Historial (Past)
  {
    id: '1',
    title: 'Cita Diagnostico',
    date: '2026-01-11',
    dateFormatted: '11/01/2026',
    doctor: 'Dra. Mariana Ocampo',
    type: 'past',
    description: 'Cita inicial para diagnóstico general y evaluación de síntomas.',
    status: 'confirmed',
    attendanceStatus: 'attending'
  },
  {
    id: '2',
    title: 'Cita Dolor Espalda',
    date: '2025-12-12',
    dateFormatted: '12/12/2025',
    doctor: 'Dr. Alfonso Gomez',
    type: 'past',
    description: 'Consulta de seguimiento para dolor de espalda crónico.',
    status: 'confirmed',
    attendanceStatus: 'attending'
  },
  {
    id: '3',
    title: 'Cita Seguimiento Operacion Mayo',
    date: '2025-05-05',
    dateFormatted: '05/05/2025',
    doctor: 'Dr. Raul Salinas',
    type: 'past',
    description: 'Seguimiento post-operatorio para verificar recuperación.',
    status: 'confirmed',
    attendanceStatus: 'attending'
  },
  {
    id: '4',
    title: 'Cita Seguimiento Operacion Abril',
    date: '2025-04-07',
    dateFormatted: '07/04/2025',
    doctor: 'Dr. Raul Salinas',
    type: 'past',
    description: 'Revisión post-operatoria inicial.',
    status: 'confirmed',
    attendanceStatus: 'attending'
  },
  // Próximas (Upcoming)
  {
    id: '5',
    title: 'Cita Seguimiento Operacion Enero',
    date: '2026-01-10',
    dateFormatted: '10/01/2026',
    doctor: 'Dr. Raul Salinas',
    type: 'upcoming',
    description: 'Buenas tardes Daniel! te espero el 10 de enero para tu revision de seguimiento de la operacion, feliz año nuevo!',
    status: 'confirmed',
    attendanceStatus: 'pending',
    startTime: '10:00',
    endTime: '11:00',
    specialty: 'Cirugía General',
    location: 'Consultorio 201'
  },
  {
    id: '6',
    title: 'Cita Dolor Espalda Seguimiento',
    date: '2026-03-03',
    dateFormatted: '03/03/2026',
    doctor: 'Dr. Alfonso Gomez',
    type: 'upcoming',
    description: 'Consulta de seguimiento para evaluar progreso del tratamiento.',
    status: 'confirmed',
    attendanceStatus: 'pending',
    startTime: '14:00',
    endTime: '15:00',
    specialty: 'Traumatología',
    location: 'Consultorio 305'
  },
  {
    id: '7',
    title: 'Cita Seguimiento...',
    date: '2026-02-20',
    dateFormatted: '20/02/2026',
    doctor: 'Dr. Raul Salinas',
    type: 'upcoming',
    description: 'Revisión de evolución postoperatoria',
    status: 'confirmed',
    attendanceStatus: 'pending',
    startTime: '09:00',
    endTime: '10:00',
    specialty: 'Cirugía General',
    location: 'Consultorio 201'
  }
]

export const getAppointmentById = (id: string): Appointment | undefined => {
  return mockAppointments.find(apt => apt.id === id)
}

export const getPastAppointments = (): Appointment[] => {
  return mockAppointments.filter(apt => apt.type === 'past')
}

export const getUpcomingAppointments = (): Appointment[] => {
  return mockAppointments.filter(apt => apt.type === 'upcoming')
}

export const getAppointmentsByWeek = (weekStart: Date): Appointment[] => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  return mockAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate >= weekStart && aptDate <= weekEnd;
  });
}

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}
