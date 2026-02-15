import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '../components/DashboardLayout';
import { WeekCalendar } from '../components/WeekCalendar';
import { DayView } from '../components/DayView';
import { MonthView } from '../components/MonthView';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { AppointmentDetailsPanel } from '../components/calendar/AppointmentDetailsPanel';
import { useAuth } from '../context/AuthContext';
import {
  listAppointmentsInRange,
  getMyRole,
  AppointmentWithProfiles
} from '../lib/queries/calendar';

type ViewType = 'day' | 'week' | 'month';

export default function Calendario() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // State
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'patient' | 'doctor' | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const selectedAppointment = useMemo(() =>
    appointments.find(a => a.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );

  // 1. Initial Load & Role Check
  useEffect(() => {
    if (user) {
      getMyRole(user.id).then(r => setRole(r as any));
    }
  }, [user]);

  // Seed date/view from query params
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const viewParam = searchParams.get('view');

    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
        if (viewParam === 'day' || viewParam === 'week' || viewParam === 'month') {
          setView(viewParam as ViewType);
        }
      }
    }
  }, [searchParams]);

  // 2. Fetch Appointments when range or role changes
  useEffect(() => {
    if (!user || !role) return;
    fetchData();
  }, [user, role, currentDate, view]);

  const fetchData = async () => {
    setLoading(true);
    let start: Date, end: Date;

    if (view === 'day') {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    } else if (view === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    const data = await listAppointmentsInRange({
      userId: user!.id,
      role: role as any,
      from: start.toISOString(),
      to: end.toISOString()
    });

    setAppointments(data);
    setLoading(false);
  };

  // Handlers
  const handlePrev = () => {
    if (view === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const getLabel = () => {
    if (view === 'day') return format(currentDate, "d 'de' MMMM yyyy", { locale: es });
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: es });

    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });

    if (start.getMonth() === end.getMonth()) {
      return format(start, 'MMMM yyyy', { locale: es });
    }
    return `${format(start, 'MMM', { locale: es })} - ${format(end, 'MMM yyyy', { locale: es })}`;
  };

  return (
    <DashboardLayout title="Calendario">
      <div className="p-4 lg:p-8 flex flex-col h-[calc(100vh-64px)] overflow-hidden">

        <CalendarHeader
          view={view}
          onViewChange={setView}
          label={getLabel()}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onSchedule={() => navigate('/dashboard/consultas/nueva')}
          isLoading={loading}
        />

        <div className="flex-1 overflow-hidden">
          {/* Main Grid Area - Full Width */}
          <div className="h-full overflow-y-auto bg-white rounded-3xl border border-gray-100 shadow-sm scrollbar-hide">
            {view === 'week' && (
              <WeekCalendar
                weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
                onTimeSlotClick={(d) => navigate(`/dashboard/consultas/nueva?date=${d.toISOString()}`)}
                onEventClick={(e: any) => setSelectedAppointmentId(e.id)}
                events={appointments as any}
              />
            )}

            {view === 'day' && (
              <DayView
                date={currentDate}
                appointments={appointments as any}
                onTimeSlotClick={(d) => navigate(`/dashboard/consultas/nueva?date=${d.toISOString()}`)}
                onEventClick={(a: any) => setSelectedAppointmentId(a.id)}
              />
            )}

            {view === 'month' && (
              <MonthView
                currentDate={currentDate}
                appointments={appointments as any}
                onDateClick={(d) => {
                  setCurrentDate(d);
                  setView('day');
                }}
                onPrevMonth={handlePrev}
                onNextMonth={handleNext}
              />
            )}
          </div>

          {/* Appointment Details Modal Overlay */}
          <AppointmentDetailsPanel
            appointment={selectedAppointment}
            onClose={() => setSelectedAppointmentId(null)}
            onViewDetail={(id) => navigate(`/dashboard/consultas/${id}`)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
