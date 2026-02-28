import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import { useAuth } from '@/app/providers/AuthContext';
import {
  getDoctorSchedule,
  upsertDoctorSchedule,
  type DoctorScheduleRow,
  type ScheduleBlockInput,
} from '@/shared/lib/queries/doctorManagement';
import { showToast } from '@/shared/components/ui/Toast';

// ─── Constants ─────────────────────────────────────────────────────────────

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

interface DaySchedule {
  day_of_week: number;
  is_active: boolean;
  blocks: { open_time: string; close_time: string }[];
}

function initSchedule(): DaySchedule[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    is_active: i >= 1 && i <= 5, // Mon–Fri by default
    blocks: i >= 1 && i <= 5 ? [{ open_time: '09:00', close_time: '17:00' }] : [],
  }));
}

function scheduleRowsToDaySchedules(rows: DoctorScheduleRow[]): DaySchedule[] {
  const base = initSchedule();

  // Clear defaults and fill with real data
  for (const day of base) {
    day.blocks = [];
    day.is_active = false;
  }

  for (const row of rows) {
    const day = base[row.day_of_week];
    if (day) {
      day.is_active = row.is_active;
      day.blocks.push({
        open_time: row.open_time.slice(0, 5), // "09:00:00" → "09:00"
        close_time: row.close_time.slice(0, 5),
      });
    }
  }

  return base;
}

function daySchedulesToBlocks(schedule: DaySchedule[]): ScheduleBlockInput[] {
  const blocks: ScheduleBlockInput[] = [];
  for (const day of schedule) {
    for (const block of day.blocks) {
      blocks.push({
        day_of_week: day.day_of_week,
        open_time: block.open_time + ':00',
        close_time: block.close_time + ':00',
        is_active: day.is_active,
      });
    }
    // If active but no blocks, still create an entry
    if (day.is_active && day.blocks.length === 0) {
      blocks.push({
        day_of_week: day.day_of_week,
        open_time: '09:00:00',
        close_time: '17:00:00',
        is_active: false,
      });
    }
  }
  return blocks;
}

// ─── Time selector component ───────────────────────────────────────────────

function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
    >
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AvailabilityCalendarManager() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const [schedule, setSchedule] = useState<DaySchedule[]>(initSchedule());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const load = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    const rows = await getDoctorSchedule(doctorId);
    if (rows.length > 0) {
      setSchedule(scheduleRowsToDaySchedules(rows));
    }
    setLoading(false);
    setHasChanges(false);
  }, [doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  // Update helpers
  const updateDay = (dayIdx: number, updates: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev.map((d, i) => (i === dayIdx ? { ...d, ...updates } : d)),
    );
    setHasChanges(true);
  };

  const updateBlock = (dayIdx: number, blockIdx: number, field: 'open_time' | 'close_time', value: string) => {
    setSchedule((prev) =>
      prev.map((d, di) =>
        di === dayIdx
          ? {
              ...d,
              blocks: d.blocks.map((b, bi) =>
                bi === blockIdx ? { ...b, [field]: value } : b,
              ),
            }
          : d,
      ),
    );
    setHasChanges(true);
  };

  const addBlock = (dayIdx: number) => {
    setSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              blocks: [...d.blocks, { open_time: '14:00', close_time: '18:00' }],
              is_active: true,
            }
          : d,
      ),
    );
    setHasChanges(true);
  };

  const removeBlock = (dayIdx: number, blockIdx: number) => {
    setSchedule((prev) =>
      prev.map((d, di) =>
        di === dayIdx
          ? {
              ...d,
              blocks: d.blocks.filter((_, bi) => bi !== blockIdx),
            }
          : d,
      ),
    );
    setHasChanges(true);
  };

  const toggleDay = (dayIdx: number) => {
    const day = schedule[dayIdx];
    const newActive = !day.is_active;
    updateDay(dayIdx, {
      is_active: newActive,
      blocks: newActive && day.blocks.length === 0
        ? [{ open_time: '09:00', close_time: '17:00' }]
        : day.blocks,
    });
  };

  const handleSave = async () => {
    if (!doctorId) return;
    setSaving(true);
    const blocks = daySchedulesToBlocks(schedule);
    const ok = await upsertDoctorSchedule(doctorId, blocks);
    if (ok) {
      showToast('Horarios guardados correctamente', 'success');
      setHasChanges(false);
    } else {
      showToast('Error al guardar horarios', 'error');
    }
    setSaving(false);
  };

  // ─── Visual indicator: total hours per week ──────────────────────────

  const totalHours = schedule.reduce((sum, day) => {
    if (!day.is_active) return sum;
    return (
      sum +
      day.blocks.reduce((bSum, b) => {
        const [oh, om] = b.open_time.split(':').map(Number);
        const [ch, cm] = b.close_time.split(':').map(Number);
        return bSum + (ch + cm / 60) - (oh + om / 60);
      }, 0)
    );
  }, 0);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Horarios de Atención</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configura tus horarios de trabajo. Los pacientes verán tu disponibilidad en tiempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar cambios
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-gray-900">
                {schedule.filter((d) => d.is_active && d.blocks.length > 0).length}
              </p>
              <p className="text-xs text-gray-500">Días activos</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-lg font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500">Horas / semana</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
            {hasChanges ? (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <p className="text-xs text-amber-600 font-medium">Cambios sin guardar</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="text-xs text-emerald-600 font-medium">Todo guardado</p>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── Weekly calendar grid ─── */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {schedule.map((day, dayIdx) => {
                const isActive = day.is_active && day.blocks.length > 0;

                return (
                  <div
                    key={day.day_of_week}
                    className={`flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${
                      isActive ? '' : 'bg-gray-50/50'
                    }`}
                  >
                    {/* Day toggle */}
                    <div className="flex items-center gap-3 sm:w-40 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleDay(dayIdx)}
                        className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
                          day.is_active ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                      </button>
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            day.is_active ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          <span className="sm:hidden">{DAY_SHORT[dayIdx]}</span>
                          <span className="hidden sm:inline">{DAY_NAMES[dayIdx]}</span>
                        </p>
                      </div>
                    </div>

                    {/* Time blocks */}
                    <div className="flex-1 space-y-2">
                      {day.is_active ? (
                        <>
                          {day.blocks.map((block, blockIdx) => (
                            <div
                              key={blockIdx}
                              className="flex items-center gap-2 flex-wrap"
                            >
                              <TimeSelect
                                value={block.open_time}
                                onChange={(v) => updateBlock(dayIdx, blockIdx, 'open_time', v)}
                                label={`${DAY_NAMES[dayIdx]} apertura bloque ${blockIdx + 1}`}
                              />
                              <span className="text-xs text-gray-400">a</span>
                              <TimeSelect
                                value={block.close_time}
                                onChange={(v) => updateBlock(dayIdx, blockIdx, 'close_time', v)}
                                label={`${DAY_NAMES[dayIdx]} cierre bloque ${blockIdx + 1}`}
                              />

                              {day.blocks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeBlock(dayIdx, blockIdx)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Eliminar bloque"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Add another block */}
                          <button
                            type="button"
                            onClick={() => addBlock(dayIdx)}
                            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-1"
                          >
                            <Plus className="w-3 h-3" />
                            Agregar bloque
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 py-1">Sin horario</p>
                      )}
                    </div>

                    {/* Visual indicator */}
                    {day.is_active && day.blocks.length > 0 && (
                      <div className="hidden sm:block w-32 shrink-0">
                        {/* Mini timeline bar */}
                        <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                          {day.blocks.map((block, bi) => {
                            const [oh, om] = block.open_time.split(':').map(Number);
                            const [ch, cm] = block.close_time.split(':').map(Number);
                            const start = (oh + om / 60) / 24;
                            const end = (ch + cm / 60) / 24;
                            const width = Math.max(end - start, 0.02);

                            return (
                              <div
                                key={bi}
                                className="absolute top-0 bottom-0 bg-primary/60 rounded-full"
                                style={{
                                  left: `${start * 100}%`,
                                  width: `${width * 100}%`,
                                }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-gray-400">0h</span>
                          <span className="text-[9px] text-gray-400">12h</span>
                          <span className="text-[9px] text-gray-400">24h</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Help text */}
            <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Tip:</strong> Puedes agregar múltiples bloques por día (ej. mañana 9–14 y
                tarde 16–19). Los pacientes solo verán los horarios disponibles después de descontar
                las citas ya agendadas.
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
