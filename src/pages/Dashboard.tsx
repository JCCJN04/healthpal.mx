import { MessageCircle, ChevronLeft, ChevronRight, User, Loader2, Calendar, Phone, Mail, Cake, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { showToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { getUpcomingAppointments, AppointmentWithDoctor } from '../lib/queries/appointments'
import { logPerformanceSummary } from '../lib/performance'
import { DashboardAppointmentsSkeleton } from '../components/Skeleton'

const CalendarWidget = () => {
  const month = 'Febrero 2026'
  const daysOfWeek = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  
  // Generate calendar days for February 2026
  const days = [
    { day: 26, isCurrentMonth: false },
    { day: 27, isCurrentMonth: false },
    { day: 28, isCurrentMonth: false },
    { day: 29, isCurrentMonth: false },
    { day: 30, isCurrentMonth: false },
    { day: 31, isCurrentMonth: false },
    ...Array.from({ length: 29 }, (_, i) => ({ day: i + 1, isCurrentMonth: true })),
    { day: 1, isCurrentMonth: false },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      {/* Month selector */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <span className="text-sm md:text-base text-gray-700 font-medium">{month}</span>
        <div className="flex gap-1 md:gap-2">
          <button className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3 md:mb-4">
        {/* Day headers */}
        {daysOfWeek.map((day, i) => (
          <div key={i} className="text-center text-xs md:text-sm text-gray-500 font-medium">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((item, i) => {
          const isToday = item.day === 5 && item.isCurrentMonth
          
          return (
            <div
              key={i}
              className={`text-center py-1.5 md:py-2 text-xs md:text-sm ${
                !item.isCurrentMonth
                  ? 'text-gray-300'
                  : isToday
                  ? 'bg-primary text-white rounded-full font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 rounded-full cursor-pointer'
              }`}
            >
              {item.day}
            </div>
          )
        })}
      </div>

      {/* Today button */}
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
  const [appointments, setAppointments] = useState<AppointmentWithDoctor[]>([])
  const [loading, setLoading] = useState(true)

  // Calculate age from birthdate
  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return null
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Get first name from full name
  const getFirstName = () => {
    if (!profile?.full_name) return 'Usuario'
    return profile.full_name.split(' ')[0]
  }

  // Format phone number
  const formatPhone = (phone: string | null) => {
    if (!phone) return null
    // Remove +52 and format
    const cleaned = phone.replace('+52', '').replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`
    }
    return phone
  }

  // Format gender
  const formatGender = (sex: string | null) => {
    if (!sex || sex === 'unspecified') return null
    const genderMap: Record<string, string> = {
      male: 'Masculino',
      female: 'Femenino',
      other: 'Otro'
    }
    return genderMap[sex] || sex
  }

  // Performance tracking
  useEffect(() => {
    performance.mark('dashboard-mount')
    return () => {
      performance.mark('dashboard-unmount')
      performance.measure('dashboard-lifetime', 'dashboard-mount', 'dashboard-unmount')
    }
  }, [])

  useEffect(() => {
    loadAppointments()
  }, [user])

  const loadAppointments = async () => {
    if (!user) return
    performance.mark('dashboard-load-start')
    setLoading(true)
    const data = await getUpcomingAppointments(user.id)
    setAppointments(data || [])
    setLoading(false)
    performance.mark('dashboard-load-end')
    performance.measure('dashboard-load-total', 'dashboard-load-start', 'dashboard-load-end')
    const loadTime = performance.getEntriesByName('dashboard-load-total')[0]?.duration
    console.log(`✓ Dashboard fully loaded (${Math.round(loadTime)}ms)`)
    
    // Log complete performance summary after everything is loaded
    setTimeout(() => {
      logPerformanceSummary()
    }, 100)
  }

  const handleRevisar = () => {
    navigate('/dashboard/mensajes')
  }

  const handleDescartar = () => {
    setShowNotification(false)
    showToast('Notificación descartada', 'info', 2000)
  }

  const handleVerConsulta = (id: string) => {
    navigate(`/dashboard/consultas/${id}`)
  }

  const handleDocumentClick = () => {
    navigate('/dashboard/documentos')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">
            ¡Bienvenido {getFirstName()}!
          </h1>

          {/* Profile Card */}
          {profile && (
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
              <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Usuario'}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-gray-50"
                    />
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center border-4 border-gray-50">
                      <span className="text-2xl md:text-3xl font-bold text-white">
                        {profile.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left w-full">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    {profile.full_name || 'Usuario'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-gray-600">
                    {profile.email && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Mail size={16} className="text-primary" />
                        <span className="break-all">{profile.email}</span>
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Phone size={16} className="text-primary" />
                        <span>{formatPhone(profile.phone)}</span>
                      </div>
                    )}
                    {formatGender(profile.sex) && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <User size={16} className="text-primary" />
                        <span>{formatGender(profile.sex)}</span>
                      </div>
                    )}
                    {profile.birthdate && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Cake size={16} className="text-primary" />
                        <span>{calculateAge(profile.birthdate)} años</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 md:mt-4">
                    <button
                      onClick={() => navigate('/dashboard/configuracion')}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      Editar perfil →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
          <CalendarWidget />

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
                  {appointments.slice(0, 3).map((appointment) => (
                    <div 
                      key={appointment.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => handleVerConsulta(appointment.id)}
                    >
                      <div className="flex-1 mb-2 sm:mb-0">
                        <p className="text-sm md:text-base text-gray-900 font-medium mb-1">
                          {appointment.reason || 'Consulta general'}
                        </p>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                          <User size={14} />
                          <span>
                            {appointment.doctor_profile?.full_name || 'Doctor asignado'}
                          </span>
                        </div>
                      </div>
                      <button 
                        className="text-primary font-medium text-sm hover:underline self-start sm:self-center"
                      >
                        VER
                      </button>
                    </div>
                  ))}
                  {appointments.length > 3 && (
                    <button
                      onClick={() => navigate('/dashboard/consultas')}
                      className="w-full text-center text-primary font-medium text-sm hover:underline py-2"
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
      </div>
    </DashboardLayout>
  )
}
