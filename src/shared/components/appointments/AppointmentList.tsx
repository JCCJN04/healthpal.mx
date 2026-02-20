import { FileText } from 'lucide-react'
import type { Appointment } from '@/shared/mock/appointments'

interface AppointmentListProps {
  title: string
  appointments: Appointment[]
  onSelectAppointment: (appointment: Appointment) => void
  selectedId?: string
}

export const AppointmentList = ({
  title,
  appointments,
  onSelectAppointment,
  selectedId
}: AppointmentListProps) => {
  const handleOpen = (appointment: Appointment) => {
    onSelectAppointment(appointment)
  }

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <h2 className="text-xl font-semibold text-[#33C7BE]">{title}</h2>

      {/* List Container */}
      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
        {appointments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No hay citas disponibles</p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`p-5 hover:bg-gray-50 transition-colors ${
                selectedId === appointment.id ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Icon + Content */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Document Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Appointment Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {appointment.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-0.5">
                      {appointment.dateFormatted}
                    </p>
                    <p className="text-sm text-gray-600">{appointment.doctor}</p>
                  </div>
                </div>

                {/* Right: Action Button */}
                <button
                  onClick={() => handleOpen(appointment)}
                  className="flex-shrink-0 px-4 py-2 bg-[#33C7BE] text-white text-sm font-medium rounded-lg hover:bg-[#2bb5ad] transition-colors"
                >
                  abrir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
