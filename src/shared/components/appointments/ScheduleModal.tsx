import { useState } from 'react'
import { X, Calendar, Clock, Video, Phone, User } from 'lucide-react'
import { mockDoctors, type Doctor } from '@/shared/mock/doctors'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  selectedTime: string | null
  filteredDoctors?: Doctor[]
}

export const ScheduleModal = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  filteredDoctors = mockDoctors
}: ScheduleModalProps) => {
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [appointmentMode, setAppointmentMode] = useState<'presencial' | 'video' | 'llamada'>(
    'presencial'
  )

  if (!isOpen || !selectedDate || !selectedTime) return null

  const formatDate = (date: Date) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return `${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}`
  }

  const handleContinue = () => {
    if (!selectedDoctor) {
      alert('Por favor selecciona un doctor')
      return
    }

    const doctor = filteredDoctors.find(d => d.id === selectedDoctor)

    // Reset and close
    setSelectedDoctor('')
    setAppointmentMode('presencial')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all"
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
                    Confirmar cita
                  </h2>
                  <p className="text-sm text-white/80">
                    {formatDate(selectedDate)} - {selectedTime}
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
                {filteredDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time Display */}
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

            {/* Appointment Mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Modalidad de consulta
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setAppointmentMode('presencial')}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${appointmentMode === 'presencial'
                      ? 'border-[#33C7BE] bg-[#33C7BE]/5'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <User className={`w-6 h-6 ${appointmentMode === 'presencial' ? 'text-[#33C7BE]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${appointmentMode === 'presencial' ? 'text-[#33C7BE]' : 'text-gray-600'}`}>
                    Presencial
                  </span>
                </button>

                <button
                  onClick={() => setAppointmentMode('video')}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${appointmentMode === 'video'
                      ? 'border-[#33C7BE] bg-[#33C7BE]/5'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Video className={`w-6 h-6 ${appointmentMode === 'video' ? 'text-[#33C7BE]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${appointmentMode === 'video' ? 'text-[#33C7BE]' : 'text-gray-600'}`}>
                    Video
                  </span>
                </button>

                <button
                  onClick={() => setAppointmentMode('llamada')}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${appointmentMode === 'llamada'
                      ? 'border-[#33C7BE] bg-[#33C7BE]/5'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Phone className={`w-6 h-6 ${appointmentMode === 'llamada' ? 'text-[#33C7BE]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${appointmentMode === 'llamada' ? 'text-[#33C7BE]' : 'text-gray-600'}`}>
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
              className="flex-1 bg-[#33C7BE] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2bb5ad] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
