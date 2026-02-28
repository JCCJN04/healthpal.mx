import { useEffect, useState } from 'react';
import {
  Shield,
  Video,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import Checkbox from '@/shared/components/ui/Checkbox';
import {
  getPublicInsuranceProviders,
  type InsuranceOption,
} from '@/shared/lib/queries/publicDoctors';

// ─── Predefined options ────────────────────────────────────────────────────

const DATE_OPTIONS = [
  { value: '', label: 'Cualquier día' },
  { value: 'today', label: 'Hoy' },
  { value: 'tomorrow', label: 'Mañana' },
  { value: 'week', label: 'Próximos 7 días' },
] as const;

// ─── Filter state ──────────────────────────────────────────────────────────

export interface DirectorioFilterValues {
  insurance: string;
  acceptsVideo: boolean | null;
  dateRange: '' | 'today' | 'tomorrow' | 'week';
}

export const EMPTY_FILTERS: DirectorioFilterValues = {
  insurance: '',
  acceptsVideo: null,
  dateRange: '',
};

interface DirectorioFiltersProps {
  values: DirectorioFilterValues;
  onChange: (next: DirectorioFilterValues) => void;
  /** Mobile: show as overlay */
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function DirectorioFilters({
  values,
  onChange,
  mobileOpen,
  onCloseMobile,
}: DirectorioFiltersProps) {
  // Insurance options from backend
  const [insurances, setInsurances] = useState<InsuranceOption[]>([]);
  const [loadingIns, setLoadingIns] = useState(true);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    insurance: true,
    modality: true,
    date: true,
  });

  useEffect(() => {
    getPublicInsuranceProviders().then((data) => {
      setInsurances(data);
      setLoadingIns(false);
    });
  }, []);

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const hasActiveFilters =
    values.insurance !== '' ||
    values.acceptsVideo !== null ||
    values.dateRange !== '';

  const activeCount = [
    values.insurance,
    values.acceptsVideo !== null ? 'x' : '',
    values.dateRange,
  ].filter(Boolean).length;

  // ─── Render ──────────────────────────────────────────────────────────────

  const content = (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-gray-800 font-semibold text-base">
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeCount > 0 && (
            <span className="ml-1 bg-primary text-white text-xs rounded-full px-2 py-0.5">
              {activeCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs text-primary hover:underline"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* ─ Seguro médico ─ */}
      <FilterSection
        title="Seguro médico"
        icon={<Shield className="w-4 h-4" />}
        open={openSections.insurance}
        onToggle={() => toggleSection('insurance')}
      >
        {loadingIns ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : insurances.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin datos disponibles</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {insurances.map((ins) => (
              <Checkbox
                key={ins.insurance_provider}
                label={`${ins.insurance_provider} (${ins.doctor_count})`}
                checked={values.insurance === ins.insurance_provider}
                onChange={() =>
                  onChange({
                    ...values,
                    insurance:
                      values.insurance === ins.insurance_provider
                        ? ''
                        : ins.insurance_provider,
                  })
                }
              />
            ))}
          </div>
        )}
      </FilterSection>

      {/* ─ Modalidad ─ */}
      <FilterSection
        title="Modalidad de consulta"
        icon={<Video className="w-4 h-4" />}
        open={openSections.modality}
        onToggle={() => toggleSection('modality')}
      >
        <div className="space-y-2">
          <Checkbox
            label="Presencial"
            checked={values.acceptsVideo === false}
            onChange={() =>
              onChange({
                ...values,
                acceptsVideo: values.acceptsVideo === false ? null : false,
              })
            }
          />
          <Checkbox
            label="Videoconsulta"
            checked={values.acceptsVideo === true}
            onChange={() =>
              onChange({
                ...values,
                acceptsVideo: values.acceptsVideo === true ? null : true,
              })
            }
          />
        </div>
      </FilterSection>

      {/* ─ Disponibilidad ─ */}
      <FilterSection
        title="Disponibilidad"
        icon={<Calendar className="w-4 h-4" />}
        open={openSections.date}
        onToggle={() => toggleSection('date')}
      >
        <div className="space-y-2">
          {DATE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="date-filter"
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                checked={values.dateRange === opt.value}
                onChange={() => onChange({ ...values, dateRange: opt.value })}
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

    </div>
  );

  // ─── Desktop: sidebar ────────────────────────────────────────────────────
  // ─── Mobile: slide-over panel ────────────────────────────────────────────

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 shrink-0">{content}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
          />
          {/* Panel */}
          <div className="absolute left-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-xl overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Filtros</h2>
              <button onClick={onCloseMobile}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {content}
            <button
              onClick={onCloseMobile}
              className="mt-6 w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Collapsible section ───────────────────────────────────────────────────

function FilterSection({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 pb-3 pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon}
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="mt-3 pl-6">{children}</div>}
    </div>
  );
}
