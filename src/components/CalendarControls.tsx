import { ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react'

interface CalendarControlsProps {
  view: 'day' | 'week' | 'month'
  onViewChange: (view: 'day' | 'week' | 'month') => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  selectedDoctor: string
  onDoctorChange: (doctor: string) => void
  doctors: string[]
}

export const CalendarControls = ({
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  selectedDoctor,
  onDoctorChange,
  doctors
}: CalendarControlsProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={onPrevious}
            className="p-2 hover:bg-gray-50 transition-colors rounded-l-lg"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-x border-gray-200"
          >
            Hoy
          </button>
          <button
            onClick={onNext}
            className="p-2 hover:bg-gray-50 transition-colors rounded-r-lg"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Center: View Switcher */}
      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
        <button
          onClick={() => onViewChange('day')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'day'
              ? 'bg-[#33C7BE] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Dia
        </button>
        <button
          onClick={() => onViewChange('week')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'week'
              ? 'bg-[#33C7BE] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Semana
        </button>
        <button
          onClick={() => onViewChange('month')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'month'
              ? 'bg-[#33C7BE] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Mes
        </button>
      </div>

      {/* Right: Doctor Selector */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <select
          value={selectedDoctor}
          onChange={(e) => onDoctorChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent bg-white appearance-none cursor-pointer"
        >
          <option value="">Todos los doctores</option>
          {doctors.map((doctor, index) => (
            <option key={index} value={doctor}>
              {doctor}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}
