import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { WeekCalendar } from '../components/WeekCalendar';
import { DayView } from '../components/DayView';
import { MonthView } from '../components/MonthView';
import { getAppointmentsByWeek, mockAppointments } from '../mock/appointments';
import type { CalendarEvent } from '../mock/calendarEvents';

type ViewType = 'day' | 'week' | 'month';

export default function Calendario() {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start on Monday of current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  
  const [currentDayDate, setCurrentDayDate] = useState(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<ViewType>('week');
  
  // Get appointments for the current week
  const weekAppointments = getAppointmentsByWeek(currentWeekStart);

  // Convert appointments to calendar events
  const calendarEvents: CalendarEvent[] = weekAppointments
    .filter(apt => apt.startTime && apt.endTime)
    .map(apt => ({
      id: apt.id,
      title: apt.title,
      date: apt.date,
      startTime: apt.startTime!,
      endTime: apt.endTime!,
      doctor: apt.doctor,
      specialty: apt.specialty || '',
      location: apt.location || '',
      type: apt.status === 'confirmed' ? 'occupied' : 'available',
      color: apt.status === 'confirmed' ? 'teal' as const : 'red' as const,
    }));

  const handlePreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(currentDayDate);
    newDate.setDate(currentDayDate.getDate() - 1);
    setCurrentDayDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDayDate);
    newDate.setDate(currentDayDate.getDate() + 1);
    setCurrentDayDate(newDate);
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonthDate);
    newDate.setMonth(currentMonthDate.getMonth() - 1);
    setCurrentMonthDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonthDate);
    newDate.setMonth(currentMonthDate.getMonth() + 1);
    setCurrentMonthDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedView === 'day') {
      setCurrentDayDate(today);
    } else if (selectedView === 'month') {
      setCurrentMonthDate(today);
    } else {
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      setCurrentWeekStart(monday);
    }
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    console.log('Time slot clicked:', date, time);
    // Navigate to schedule appointment with pre-selected date/time
    navigate('/dashboard/consultas/nueva');
  };

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event);
    // Navigate to consultation detail if needed
    // navigate(`/dashboard/consultas/${event.id}`);
  };

  const handleAppointmentClick = (appointment: typeof mockAppointments[0]) => {
    navigate(`/dashboard/consultas/${appointment.id}`);
  };

  const handleMonthDateClick = (date: Date) => {
    setCurrentDayDate(date);
    setSelectedView('day');
  };

  const handleScheduleNew = () => {
    navigate('/dashboard/consultas/nueva');
  };

  // Format current date range for display
  const getDateRangeText = () => {
    if (selectedView === 'day') {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const month = monthNames[currentDayDate.getMonth()];
      const day = currentDayDate.getDate();
      const year = currentDayDate.getFullYear();
      return `${day} de ${month} ${year}`;
    } else if (selectedView === 'month') {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${monthNames[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`;
    } else {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 4); // Friday
      
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      
      const startMonth = monthNames[currentWeekStart.getMonth()];
      const endMonth = monthNames[weekEnd.getMonth()];
      const year = currentWeekStart.getFullYear();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${year}`;
      }
      return `${startMonth} - ${endMonth} ${year}`;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tu Calendario</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona y visualiza tus citas médicas
            </p>
          </div>
          
          <button
            onClick={handleScheduleNew}
            className="px-6 py-3 bg-[#33C7BE] text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Agendar cita</span>
          </button>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
              onClick={selectedView === 'day' ? handlePreviousDay : selectedView === 'month' ? handlePreviousMonth : handlePreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hoy
            </button>
            
            <button
              onClick={selectedView === 'day' ? handleNextDay : selectedView === 'month' ? handleNextMonth : handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="hidden lg:block w-px h-6 bg-gray-200 mx-2"></div>
            
            <div className="flex items-center gap-2 text-gray-700">
              <CalendarIcon className="w-5 h-5" />
              <span className="font-semibold">{getDateRangeText()}</span>
            </div>
          </div>
            
            {/* View Selector */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setSelectedView('day')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedView === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Día
              </button>
              <button
                onClick={() => setSelectedView('week')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedView === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setSelectedView('month')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedView === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mes
              </button>
            </div>
          </div>
        </div>

        {/* Main Content: Calendar Grid + Agenda Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Calendar Grid */}
          <div>
            {selectedView === 'week' && (
              <WeekCalendar
                weekStart={currentWeekStart}
                onTimeSlotClick={handleTimeSlotClick}
                onEventClick={handleEventClick}
                events={calendarEvents}
              />
            )}
            
            {selectedView === 'day' && (
              <DayView
                date={currentDayDate}
                appointments={mockAppointments}
                onTimeSlotClick={handleTimeSlotClick}
                onEventClick={handleAppointmentClick}
              />
            )}
            
            {selectedView === 'month' && (
              <MonthView
                currentDate={currentMonthDate}
                appointments={mockAppointments}
                onDateClick={handleMonthDateClick}
                onPrevMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
