import { X, Calendar, Clock, Video, Phone, User, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { CalendarEvent } from '@/shared/mock/calendarEvents'

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
          <div className="bg-gray-50 px-6 py-4 flex gap-3">
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
    </>
  )
}
