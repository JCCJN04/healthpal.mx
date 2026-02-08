import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Loader2 } from 'lucide-react'

interface CalendarHeaderProps {
    view: 'day' | 'week' | 'month'
    onViewChange: (view: 'day' | 'week' | 'month') => void
    label: string
    onPrev: () => void
    onNext: () => void
    onToday: () => void
    onSchedule: () => void
    isLoading?: boolean
}

export const CalendarHeader = ({
    view,
    onViewChange,
    label,
    onPrev,
    onNext,
    onToday,
    onSchedule,
    isLoading
}: CalendarHeaderProps) => {
    return (
        <div className="flex flex-col space-y-6 mb-8">
            {/* Top row: Title and Schedule CTA */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tu Calendario</h1>
                        <div className="h-6 w-px bg-gray-200 hidden lg:block" />
                        <span className="text-gray-400 text-sm font-bold hidden lg:block uppercase tracking-widest">HealthPal v1.0</span>
                    </div>
                    <p className="text-[10px] font-black text-[#33C7BE] uppercase tracking-[0.2em] mt-1">
                        Gestión inteligente de citas médicas
                    </p>
                </div>

                <button
                    onClick={onSchedule}
                    className="group relative px-8 py-4 bg-[#33C7BE] text-white font-black rounded-2xl hover:bg-teal-600 transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-teal-500/30 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    <span className="tracking-wide">Agendar cita</span>
                </button>
            </div>

            {/* Control Bar - Glassmorphism */}
            <div className="bg-white/70 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-white/50 p-4 flex flex-col md:flex-row items-center justify-between gap-6 ring-1 ring-black/5">
                {/* Navigation */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100/50 rounded-2xl p-1.5 border border-white/40 shadow-inner">
                        <button
                            onClick={onPrev}
                            className="p-2.5 hover:bg-white hover:shadow-xl hover:scale-110 rounded-xl transition-all text-gray-700 active:scale-90"
                            aria-label="Anterior"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onToday}
                            className="px-6 py-2 text-xs font-black text-gray-900 hover:bg-white hover:shadow-xl hover:scale-105 rounded-xl transition-all uppercase tracking-widest mx-1"
                        >
                            Hoy
                        </button>
                        <button
                            onClick={onNext}
                            className="p-2.5 hover:bg-white hover:shadow-xl hover:scale-110 rounded-xl transition-all text-gray-700 active:scale-90"
                            aria-label="Siguiente"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 px-2">
                        <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center shadow-sm border border-teal-100/50">
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 text-[#33C7BE] animate-spin" />
                            ) : (
                                <CalendarIcon className="w-6 h-6 text-[#33C7BE]" />
                            )}
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Periodo actual</p>
                            <span className="font-black text-xl text-gray-900 tracking-tight capitalize">{label}</span>
                        </div>
                    </div>
                </div>

                {/* View Switcher (Segmented Control) */}
                <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-2xl border border-white/40 shadow-inner">
                    {(['day', 'week', 'month'] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => onViewChange(v)}
                            className={`px-6 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-[0.15em] ${view === v
                                    ? 'bg-white text-[#33C7BE] shadow-xl shadow-[#33C7BE]/10 border border-white ring-1 ring-black/5 scale-105'
                                    : 'text-gray-400 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
