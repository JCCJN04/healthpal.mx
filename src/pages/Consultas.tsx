import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
// import { CalendarMini } from '../components/CalendarMini'
// import { AppointmentDetailCard } from '../components/AppointmentDetailCard'
// import { AppointmentList } from '../components/AppointmentList'
import { getUpcomingAppointments, getPastAppointments, AppointmentWithDoctor } from '../lib/queries/appointments'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function Consultas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pastAppointments, setPastAppointments] = useState<AppointmentWithDoctor[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithDoctor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointments()
  }, [user])

  const loadAppointments = async () => {
    if (!user) return
    setLoading(true)
    const [upcoming, past] = await Promise.all([
      getUpcomingAppointments(user.id),
      getPastAppointments(user.id)
    ])
    setUpcomingAppointments(upcoming || [])
    setPastAppointments(past || [])
    setLoading(false)
  }

  const handleGoToCalendar = () => {
    navigate('/dashboard/calendario')
  }

  const handleScheduleAppointment = () => {
    navigate('/dashboard/consultas/nueva')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tus Consultas
            </h1>
            <p className="text-gray-600">
              Gestiona tus citas médicas y revisa tu historial.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleGoToCalendar}
              className="px-5 py-2.5 border-2 border-[#33C7BE] text-[#33C7BE] text-sm font-semibold rounded-lg hover:bg-[#33C7BE] hover:text-white transition-colors"
            >
              ir a calendario
            </button>
            <button
              onClick={handleScheduleAppointment}
              className="px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-[#2bb5ad] transition-colors"
            >
              agendar consulta
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#33C7BE]" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tus Consultas</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Consultas Próximas ({upcomingAppointments.length})</h3>
                {upcomingAppointments.length === 0 ? (
                  <p className="text-gray-500">No tienes consultas próximas</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt) => (
                      <div 
                        key={apt.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-[#33C7BE] cursor-pointer transition-colors"
                        onClick={() => navigate(`/dashboard/consultas/${apt.id}`)}
                      >
                        <p className="font-semibold text-gray-900">{apt.reason || 'Consulta general'}</p>
                        <p className="text-sm text-gray-600">
                          {apt.doctor_profile?.full_name || 'Doctor asignado'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(apt.start_at).toLocaleDateString('es-MX', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Historial ({pastAppointments.length})</h3>
                {pastAppointments.length === 0 ? (
                  <p className="text-gray-500">No tienes consultas pasadas</p>
                ) : (
                  <div className="space-y-3">
                    {pastAppointments.map((apt) => (
                      <div 
                        key={apt.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-[#33C7BE] cursor-pointer transition-colors opacity-75"
                        onClick={() => navigate(`/dashboard/consultas/${apt.id}`)}
                      >
                        <p className="font-semibold text-gray-900">{apt.reason || 'Consulta general'}</p>
                        <p className="text-sm text-gray-600">
                          {apt.doctor_profile?.full_name || 'Doctor asignado'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(apt.start_at).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
