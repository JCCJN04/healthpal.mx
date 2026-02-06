import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { CalendarControls } from '../components/CalendarControls'
import { WeekCalendar } from '../components/WeekCalendar'
import { AppointmentModal } from '../components/AppointmentModal'
import { mockCalendarEvents, getEventsByDoctor, type CalendarEvent } from '../mock/calendarEvents'
import { mockDoctors } from '../mock/doctors'

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

  const handleTimeSlotClick = (date: Date, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    setSelectedEvent(null)
    setModalMode('booking')
    setModalOpen(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
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
            events={filteredEvents}
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
