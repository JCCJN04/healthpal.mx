import { useState } from 'react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { CalendarControls } from '@/shared/components/calendar/CalendarControls'
import { WeekCalendar } from '@/shared/components/calendar/WeekCalendar'
import { AppointmentModal } from '@/shared/components/appointments/AppointmentModal'
import { mockCalendarEvents, getEventsByDoctor, type CalendarEvent } from '@/shared/mock/calendarEvents'
import { mockDoctors } from '@/shared/mock/doctors'
import type { AppointmentWithProfiles } from '@/shared/lib/queries/calendar'

export default function ScheduleAppointment() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [selectedDoctor, setSelectedDoctor] = useState('Dr Alfonso Reyes')
  const [currentWeekStart, setCurrentWeekStart] = useState(
    // Start on Monday, January 22, 2026
    new Date(2026, 0, 22)
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'booking' | 'view'>('booking')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Filter events by selected doctor (if any)
  const filteredEvents = selectedDoctor
    ? getEventsByDoctor(selectedDoctor)
    : mockCalendarEvents

  // Convert CalendarEvent[] to AppointmentWithProfiles[] for the WeekCalendar component
  const calendarEvents: AppointmentWithProfiles[] = filteredEvents.map(evt => ({
    id: evt.id,
    doctor_id: '',
    patient_id: '',
    status: evt.type === 'occupied' ? 'confirmed' as const : 'requested' as const,
    mode: 'in_person' as const,
    start_at: `${evt.date}T${evt.startTime}:00`,
    end_at: `${evt.date}T${evt.endTime}:00`,
    reason: evt.title,
    symptoms: null,
    location_text: null,
    location: null,
    created_by: '',
    created_at: '',
    updated_at: '',
    doctor: { full_name: evt.doctor },
    patient: undefined,
  }))

  // Get unique doctor names for dropdown
  const availableDoctors = ['Dr Alfonso Reyes', ...mockDoctors.map(d => d.name)]

  const handlePrevious = () => {
    const newDate = new Date(currentWeekStart)
    if (view === 'week') {
      newDate.setDate(currentWeekStart.getDate() - 7)
    } else if (view === 'day') {
      newDate.setDate(currentWeekStart.getDate() - 1)
    } else {
      newDate.setMonth(currentWeekStart.getMonth() - 1)
    }
    setCurrentWeekStart(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentWeekStart)
    if (view === 'week') {
      newDate.setDate(currentWeekStart.getDate() + 7)
    } else if (view === 'day') {
      newDate.setDate(currentWeekStart.getDate() + 1)
    } else {
      newDate.setMonth(currentWeekStart.getMonth() + 1)
    }
    setCurrentWeekStart(newDate)
  }

  const handleToday = () => {
    const today = new Date()
    // Find the Monday of the current week
    const monday = new Date(today)
    const day = monday.getDay()
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
    monday.setDate(diff)
    setCurrentWeekStart(monday)
  }

  const handleTimeSlotClick = (date: Date) => {
    setSelectedDate(date)
    const hours = String(date.getHours()).padStart(2, '0')
    setSelectedTime(`${hours}:00`)
    setSelectedEvent(null)
    setModalMode('booking')
    setModalOpen(true)
  }

  const handleEventClick = (event: AppointmentWithProfiles) => {
    // Find the original CalendarEvent by id for the modal
    const original = filteredEvents.find(e => e.id === event.id)
    if (original) {
      setSelectedEvent(original)
    }
    setModalMode('view')
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedEvent(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Agendar una cita
          </h1>
          <p className="text-gray-600">
            Selecciona a tu doctor con el que quieras agendar tu cita.
          </p>
        </div>

        {/* Calendar Controls */}
        <CalendarControls
          view={view}
          onViewChange={setView}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
          selectedDoctor={selectedDoctor}
          onDoctorChange={setSelectedDoctor}
          doctors={availableDoctors}
        />

        {/* Calendar View */}
        {view === 'week' ? (
          <WeekCalendar
            weekStart={currentWeekStart}
            onTimeSlotClick={handleTimeSlotClick}
            onEventClick={handleEventClick}
            events={calendarEvents}
          />
        ) : view === 'day' ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <p className="text-gray-500">Vista de día en construcción</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <p className="text-gray-500">Vista de mes en construcción</p>
          </div>
        )}
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        selectedEvent={selectedEvent}
        doctors={availableDoctors}
      />
    </DashboardLayout>
  )
}
