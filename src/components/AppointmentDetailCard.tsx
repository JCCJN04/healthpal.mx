import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Appointment } from '../mock/appointments'

interface AppointmentDetailCardProps {
  appointment: Appointment | null
}

export const AppointmentDetailCard = ({ appointment }: AppointmentDetailCardProps) => {
  const navigate = useNavigate()
  const [attendanceStatus, setAttendanceStatus] = useState(
    appointment?.attendanceStatus || 'pending'
  )

  if (!appointment) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <p className="text-gray-500">Selecciona una cita para ver los detalles</p>
        </div>
      </div>
    )
  }

  const handleSendMessage = () => {
    console.log('Enviar mensaje para cita:', appointment.id)
    navigate('/dashboard/mensajes')
  }

  const handleMoreDetails = () => {
    console.log('Ver más detalles de cita:', appointment.id)
    // Could navigate to /dashboard/consultas/:id
  }

  const handleAttending = () => {
    setAttendanceStatus('attending')
    console.log('Confirmado asistencia a cita:', appointment.id)
  }

  const handleNotAttending = () => {
    setAttendanceStatus('not-attending')
    console.log('Cancelado asistencia a cita:', appointment.id)
  }

  // Parse date to format: "10 de Enero del 2026"
  const formatLongDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return `${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}`
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        {appointment.title}
      </h3>

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Fecha de la cita:</span>{' '}
          {formatLongDate(appointment.date)}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Profesional Encargado:</span>{' '}
          {appointment.doctor}
        </p>
      </div>

      {/* Description */}
      {appointment.description && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Descripcion</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {appointment.description}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Left side actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-[#33C7BE] text-white text-sm font-medium rounded-lg hover:bg-[#2bb5ad] transition-colors"
          >
            enviar mensaje
          </button>
          <button
            onClick={handleMoreDetails}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            mas detalles
          </button>
        </div>

        {/* Right side actions (only for upcoming appointments) */}
        {appointment.type === 'upcoming' && (
          <div className="flex gap-3 ml-auto">
            <button
              onClick={handleAttending}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                attendanceStatus === 'attending'
                  ? 'bg-[#33C7BE] text-white'
                  : 'bg-[#33C7BE] text-white hover:bg-[#2bb5ad]'
              }`}
            >
              asistire
            </button>
            <button
              onClick={handleNotAttending}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                attendanceStatus === 'not-attending'
                  ? 'bg-gray-200 text-gray-700'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              no asistire
            </button>
          </div>
        )}
      </div>

      {/* Status indicator (if status changed) */}
      {attendanceStatus !== 'pending' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Estado:{' '}
            <span
              className={`font-semibold ${
                attendanceStatus === 'attending' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {attendanceStatus === 'attending' ? 'Confirmado' : 'Cancelado'}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
