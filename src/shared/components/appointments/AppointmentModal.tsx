import { X, Calendar, Clock, Video, Phone, User, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { CalendarEvent } from '@/shared/mock/calendarEvents'
import { openAddToGoogleCalendar } from '@/shared/lib/googleCalendar'

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'booking' | 'view'
  selectedDate?: Date | null
  selectedTime?: string | null
  selectedEvent?: CalendarEvent | null
  doctors?: string[]
}

export const AppointmentModal = ({
  isOpen,
  onClose,
  mode,
  selectedDate,
  selectedTime,
  selectedEvent,
  doctors = []
}: AppointmentModalProps) => {
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [appointmentType, setAppointmentType] = useState<'presencial' | 'video' | 'llamada'>(
    'presencial'
  )

  if (!isOpen) return null

  const formatDate = (date: Date) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return `${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}`
  }

  const handleAddToCalendar = () => {
    if (!selectedDate || !selectedTime) return
    const pad = (n: number) => String(n).padStart(2, '0')
    const y = selectedDate.getFullYear()
    const mo = pad(selectedDate.getMonth() + 1)
    const d = pad(selectedDate.getDate())
    const [h, m] = selectedTime.split(':').map(Number)
    const startISO = `${y}-${mo}-${d}T${pad(h)}:${pad(m)}:00`
    const endDate = new Date(selectedDate)
    endDate.setHours(h + 1, m)
    const endISO = `${y}-${mo}-${d}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`

    const typeLabel: Record<string, string> = {
      presencial: 'Consulta presencial',
      video: 'Videollamada médica',
      llamada: 'Llamada médica',
    }

    openAddToGoogleCalendar({
      title: `${typeLabel[appointmentType] ?? 'Consulta médica'}${selectedDoctor ? ` — ${selectedDoctor}` : ''}`,
      description: 'Cita agendada a través de HealthPal.mx',
      startDateTime: startISO,
      endDateTime: endISO,
      timeZone: 'America/Mexico_City',
    })
  }

  const handleContinue = () => {
    if (mode === 'booking' && !selectedDoctor) {
      alert('Por favor selecciona un doctor')
      return
    }

    setSelectedDoctor('')
    setAppointmentType('presencial')
    onClose()
  }

  // View mode (existing appointment)
  if (mode === 'view' && selectedEvent) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Red for occupied */}
            <div className={`px-6 py-5 ${selectedEvent.color === 'red' ? 'bg-red-400' : 'bg-[#33C7BE]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Cita no disponible
                    </h2>
                    <p className="text-sm text-white/80">
                      Este horario ya está ocupado
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Doctor</p>
                    <p className="text-sm text-gray-600">{selectedEvent.doctor}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Horario</p>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Título</p>
                    <p className="text-sm text-gray-600">{selectedEvent.title}</p>
                  </div>
                </div>
              </div>

              {selectedEvent.color === 'red' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">
                    Este horario no está disponible. Por favor selecciona otro horario.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4">
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Booking mode (new appointment)
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#33C7BE] to-[#2bb5ad] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Solicitar cita
                  </h2>
                  <p className="text-sm text-white/80">
                    {selectedDate && selectedTime
                      ? `${formatDate(selectedDate)} - ${selectedTime}`
                      : 'Nueva consulta'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Selecciona tu doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent bg-white text-sm"
              >
                <option value="">Selecciona un doctor...</option>
                {doctors.map((doctor, index) => (
                  <option key={index} value={doctor}>
                    {doctor}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            {selectedDate && selectedTime && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-[#33C7BE]" />
                  <span className="font-medium">Fecha:</span>
                  <span>{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="w-4 h-4 text-[#33C7BE]" />
                  <span className="font-medium">Hora:</span>
                  <span>{selectedTime}</span>
                </div>
              </div>
            )}

            {/* Appointment Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tipo de consulta
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setAppointmentType('presencial')}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${appointmentType === 'presencial'
                      ? 'border-[#33C7BE] bg-[#33C7BE]/5'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <User className={`w-6 h-6 ${appointmentType === 'presencial' ? 'text-[#33C7BE]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${appointmentType === 'presencial' ? 'text-[#33C7BE]' : 'text-gray-600'}`}>
                    Presencial
                  </span>
                </button>

                <button
                  onClick={() => setAppointmentType('video')}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${appointmentType === 'video'
                      ? 'border-[#33C7BE] bg-[#33C7BE]/5'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Video className={`w-6 h-6 ${appointmentType === 'video' ? 'text-[#33C7BE]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${appointmentType === 'video' ? 'text-[#33C7BE]' : 'text-gray-600'}`}>
                    Video
                  </span>
                </button>

                <button
                  onClick={() => setAppointmentType('llamada')}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${appointmentType === 'llamada'
                      ? 'border-[#33C7BE] bg-[#33C7BE]/5'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Phone className={`w-6 h-6 ${appointmentType === 'llamada' ? 'text-[#33C7BE]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${appointmentType === 'llamada' ? 'text-[#33C7BE]' : 'text-gray-600'}`}>
                    Llamada
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 space-y-3">
            {selectedDate && selectedTime && selectedDoctor && (
              <button
                onClick={handleAddToCalendar}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Agregar a Google Calendar
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedDoctor}
                className="flex-1 bg-[#33C7BE] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2bb5ad] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
