import { MessageCircle, ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { showToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { getUpcomingAppointments, getAppointmentDaysInMonth, AppointmentWithDetails } from '../lib/queries/appointments'
import { getUnreadNotifications } from '../lib/queries/notifications'
import { getUserDocuments } from '../lib/queries/documents'
import { logPerformanceSummary } from '../lib/performance'
import { DashboardAppointmentsSkeleton, Skeleton } from '../components/Skeleton'
import { DashboardSummary } from '../components/dashboard/DashboardSummary'

interface CalendarWidgetProps {
  markedDates: string[];
  currentDate?: Date;
}

const CalendarWidget = ({ markedDates, currentDate = new Date() }: CalendarWidgetProps) => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const month = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  const daysOfWeek = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

  // Get days for the current month view
  const getDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of current month
    const firstDay = new Date(year, month, 1).getDay()
    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    // Last days of previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days = []

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: '' })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({ day: i, isCurrentMonth: true, date: dateStr })
    }

    // Next month padding
    const remainingSlots = 42 - days.length
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({ day: i, isCurrentMonth: false, date: '' })
    }

    return days
  }

  const days = getDays()
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <span className="text-sm md:text-base text-gray-700 font-medium">{month}</span>
        <div className="flex gap-1 md:gap-2">
          <button className="p-1 hover:bg-gray-100 rounded text-gray-400 cursor-not-allowed" disabled>
            <ChevronLeft size={18} />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded text-gray-400 cursor-not-allowed" disabled>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3 md:mb-4">
        {daysOfWeek.map((day, i) => (
          <div key={i} className="text-center text-xs md:text-sm text-gray-500 font-medium">
            {day}
          </div>
        ))}

        {days.map((item, i) => {
          const isTodayDate = item.date === today
          const hasAppointment = item.isCurrentMonth && markedDates.includes(item.date)

          return (
            <div
              key={i}
              className={`relative text-center py-1.5 md:py-2 text-xs md:text-sm flex flex-col items-center justify-center ${!item.isCurrentMonth
                ? 'text-gray-300'
                : isTodayDate
                  ? 'bg-primary text-white rounded-full font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 rounded-full cursor-pointer'
                }`}
            >
              <span>{item.day}</span>
              {hasAppointment && !isTodayDate && (
                <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"></div>
              )}
              {hasAppointment && isTodayDate && (
                <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-right">
        <button className="text-primary text-xs md:text-sm font-medium hover:underline">
          HOY
        </button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [showNotification, setShowNotification] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [markedDates, setMarkedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [summaryData, setSummaryData] = useState<any>({
    nextAppointment: null,
    documentCount: 0,
    unreadMessages: 0,
    alerts: []
  })

  // Performance tracking
  useEffect(() => {
    performance.mark('dashboard-mount')
    return () => {
      performance.mark('dashboard-unmount')
      performance.measure('dashboard-lifetime', 'dashboard-mount', 'dashboard-unmount')
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return
    performance.mark('dashboard-load-start')
    setLoading(true)

    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const [upcomingData, markedDaysData, documentsData, notificationsData] = await Promise.all([
        getUpcomingAppointments(user.id),
        getAppointmentDaysInMonth(user.id, startOfMonth, endOfMonth),
        getUserDocuments(user.id),
        getUnreadNotifications(user.id)
      ])

      const upcoming = upcomingData || []
      setAppointments(upcoming)
      setMarkedDates(markedDaysData || [])

      // Process summary data
      const nextApt = upcoming[0]
      const nextAptFormatted = nextApt ? {
        date: new Date(nextApt.start_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        time: new Date(nextApt.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        doctor: nextApt.doctor?.full_name || 'Sin asignar'
      } : null

      const alerts = []
      if (!profile?.onboarding_completed) alerts.push({ type: 'profile', message: 'Completa tu perfil médico' })
      if (upcoming.length === 0) alerts.push({ type: 'appointment', message: 'Agenda tu primera consulta' })
      if ((documentsData?.length || 0) === 0) alerts.push({ type: 'document', message: 'Sube tus estudios médicos' })

      setSummaryData({
        nextAppointment: nextAptFormatted,
        documentCount: documentsData?.length || 0,
        unreadMessages: notificationsData?.length || 0,
        alerts
      })

    } catch (err) {
      console.error('Error loading dashboard data:', err)
      showToast('Error al cargar datos del dashboard', 'error')
    } finally {
      setLoading(false)
      performance.mark('dashboard-load-end')
      performance.measure('dashboard-load-total', 'dashboard-load-start', 'dashboard-load-end')
      const loadTime = performance.getEntriesByName('dashboard-load-total')[0]?.duration
      console.log(`✓ Dashboard fully loaded (${Math.round(loadTime)}ms)`)

      setTimeout(() => {
        logPerformanceSummary()
      }, 100)
    }
  }

  const handleDescartar = () => {
    setShowNotification(false)
    showToast('Notificación descartada', 'info', 2000)
  }

  const handleVerConsulta = (id: string) => {
    navigate(`/dashboard/consultas/${id}`)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        {/* Summary Section */}
        <DashboardSummary
          userName={profile?.full_name || 'Usuario'}
          avatarUrl={profile?.avatar_url}
          loading={loading}
          data={summaryData}
        />

        {/* Notification Card */}
        {showNotification && appointments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 flex flex-col md:flex-row items-start gap-4">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-full flex items-center justify-center">
                <MessageCircle className="text-white" size={20} />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-sm md:text-base text-gray-700">
                Tienes {appointments.length} {appointments.length === 1 ? 'consulta próxima' : 'consultas próximas'}
              </p>
            </div>
            <div className="flex gap-3 md:gap-4 mx-auto md:mx-0">
              <button
                onClick={() => navigate('/dashboard/consultas')}
                className="text-primary font-medium text-sm hover:underline"
              >
                VER
              </button>
              <button
                onClick={handleDescartar}
                className="text-gray-500 font-medium text-sm hover:underline"
              >
                CERRAR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Middle Grid - Calendar & Consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Calendar */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-6 h-[400px]">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full mx-auto" />
              ))}
            </div>
          </div>
        ) : (
          <CalendarWidget markedDates={markedDates} />
        )}

        {/* Upcoming Consultations */}
        {loading ? (
          <DashboardAppointmentsSkeleton />
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-primary">
                Consultas Próximas
              </h2>
              <Calendar size={20} className="text-primary" />
            </div>
            {appointments.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm md:text-base">No tienes consultas próximas</p>
                <button
                  onClick={() => navigate('/dashboard/doctores')}
                  className="mt-4 text-primary font-medium text-sm hover:underline"
                >
                  Agendar consulta →
                </button>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {appointments.slice(0, 3).map((appointment) => {
                  const isPatient = profile?.role === 'patient'
                  const counterpart = isPatient ? appointment.doctor : appointment.patient
                  const startTime = new Date(appointment.start_at)
                  const formattedDate = startTime.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })
                  const formattedTime = startTime.toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={appointment.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors cursor-pointer group"
                      onClick={() => handleVerConsulta(appointment.id)}
                    >
                      <div className="flex-1 mb-2 sm:mb-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {formattedDate} - {formattedTime}
                          </span>
                          {appointment.status === 'confirmed' && (
                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase">
                              Confirmada
                            </span>
                          )}
                        </div>
                        <p className="text-sm md:text-base text-gray-900 font-bold group-hover:text-primary transition-colors">
                          {appointment.reason || 'Consulta general'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <User size={12} className="text-gray-400" />
                          <span>
                            {counterpart?.full_name || 'Sin asignar'}
                          </span>
                          {isPatient && appointment.doctor?.specialty && (
                            <span className="text-gray-300">•</span>
                          )}
                          {isPatient && appointment.doctor?.specialty && (
                            <span className="text-gray-500 italic">
                              {appointment.doctor.specialty}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          className="text-primary font-semibold text-sm hover:text-teal-700 transition-colors"
                        >
                          DETALLES
                        </button>
                      </div>
                    </div>
                  )
                })}
                {appointments.length > 3 && (
                  <button
                    onClick={() => navigate('/dashboard/consultas')}
                    className="w-full text-center text-primary font-bold text-sm hover:underline py-2 bg-gray-50 rounded-lg"
                  >
                    Ver todas ({appointments.length}) →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions Section */}
      <div>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-primary">
            Accesos Rápidos
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Documentos */}
          <div
            className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/dashboard/documentos')}
          >
            <div className="h-2 bg-primary" />
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                    Mis Documentos
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500">
                    Ver todos
                  </p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                Accede a tus documentos médicos, recetas, estudios y más
              </p>
            </div>
          </div>

          {/* Doctores */}
          <div
            className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/dashboard/doctores')}
          >
            <div className="h-2 bg-teal-500" />
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 md:w-6 md:h-6 text-teal-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                    Doctores
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500">
                    Buscar médicos
                  </p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                Encuentra y agenda citas con especialistas
              </p>
            </div>
          </div>

          {/* Calendario */}
          <div
            className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/dashboard/calendario')}
          >
            <div className="h-2 bg-blue-500" />
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                    Calendario
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500">
                    Ver agenda
                  </p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                Organiza y visualiza todas tus citas médicas
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
