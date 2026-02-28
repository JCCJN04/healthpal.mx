import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { getDoctorAvailability, type AvailabilitySlot } from '@/shared/lib/queries/publicDoctors';

// ─── Helpers ───────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function formatDate(dateStr: string): { dayName: string; dayNum: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    dayName: DAY_NAMES_SHORT[d.getDay()],
    dayNum: String(d.getDate()),
    month: MONTH_NAMES[d.getMonth()],
  };
}

function formatTime(timeStr: string): string {
  // "09:00:00" → "9:00"
  const [h, m] = timeStr.split(':');
  return `${parseInt(h, 10)}:${m}`;
}

function getDateRange(offset: number, days: number): [string, string] {
  const start = new Date();
  start.setDate(start.getDate() + offset);
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  return [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0],
  ];
}

/** Group slots by date */
function groupByDate(slots: AvailabilitySlot[]): Map<string, AvailabilitySlot[]> {
  const map = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots) {
    const key = slot.slot_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(slot);
  }
  return map;
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface AvailabilityCarouselProps {
  doctorSlug: string;
  /** Number of day columns to show */
  columns?: number;
  /** Max time slots per day column */
  maxSlotsPerDay?: number;
  /** Called when a time slot is clicked */
  onSlotClick?: (slot: AvailabilitySlot) => void;
  /** Compact mode for card embedding */
  compact?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AvailabilityCarousel({
  doctorSlug,
  columns = 3,
  maxSlotsPerDay = 4,
  onSlotClick,
  compact = false,
}: AvailabilityCarouselProps) {
  const [dayOffset, setDayOffset] = useState(0);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  const WINDOW = columns + 2; // fetch a bit extra for paging

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const [start, end] = getDateRange(dayOffset, WINDOW);
    getDoctorAvailability(doctorSlug, start, end).then((data) => {
      if (!cancelled) {
        setSlots(data);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [doctorSlug, dayOffset, WINDOW]);

  const grouped = useMemo(() => groupByDate(slots), [slots]);

  // Build ordered date keys for the visible columns
  const visibleDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date();
    start.setDate(start.getDate() + dayOffset);
    for (let i = 0; i < columns; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [dayOffset, columns]);

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${compact ? 'py-4' : 'py-8'}`}>
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Cargando disponibilidad…</span>
      </div>
    );
  }

  if (slots.length === 0 && dayOffset === 0) {
    return (
      <div className={`text-center ${compact ? 'py-3' : 'py-6'}`}>
        <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Sin horarios disponibles próximamente</p>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setDayOffset((d) => Math.max(0, d - columns))}
          disabled={dayOffset === 0}
          className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        <span className="text-xs text-gray-500 font-medium">
          {dayOffset === 0 ? 'Próximos horarios' : 'Más horarios'}
        </span>

        <button
          type="button"
          onClick={() => setDayOffset((d) => d + columns)}
          className="p-1 rounded-full hover:bg-gray-100 transition"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Day columns */}
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {visibleDates.map((dateStr) => {
          const { dayName, dayNum, month } = formatDate(dateStr);
          const daySlots = grouped.get(dateStr) ?? [];
          const display = daySlots.slice(0, maxSlotsPerDay);
          const remaining = daySlots.length - display.length;
          const today = isToday(dateStr);

          return (
            <div key={dateStr} className="text-center">
              {/* Day header */}
              <div
                className={`rounded-lg py-1.5 mb-2 ${
                  today
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'bg-gray-50 text-gray-600'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide">{dayName}</div>
                <div className={`text-sm font-bold ${today ? 'text-primary' : 'text-gray-800'}`}>
                  {dayNum} {month}
                </div>
              </div>

              {/* Time slots */}
              {display.length > 0 ? (
                <div className="space-y-1.5">
                  {display.map((slot) => (
                    <button
                      key={slot.slot_ts}
                      type="button"
                      onClick={() => onSlotClick?.(slot)}
                      className={`w-full rounded-md border text-xs font-medium transition-all ${
                        compact ? 'py-1.5 px-1' : 'py-2 px-2'
                      } border-primary/30 text-primary hover:bg-primary hover:text-white hover:border-primary`}
                    >
                      {formatTime(slot.slot_time)}
                    </button>
                  ))}
                  {remaining > 0 && (
                    <p className="text-[10px] text-gray-400">+{remaining} más</p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-gray-300 mt-4">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
