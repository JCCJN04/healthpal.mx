import { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Ruler, Weight, Baby, BarChart2, Plus, Loader2, AlertCircle } from 'lucide-react'
import { getBiometricHistory, insertBiometricRecord } from '@/shared/lib/queries/biometrics'
import type { BiometricRecord } from '@/shared/types/database'
import {
  WHO_HEIGHT_BOYS,
  WHO_HEIGHT_GIRLS,
  WHO_WEIGHT_BOYS,
  WHO_WEIGHT_GIRLS,
  WHO_HC_BOYS,
  WHO_HC_GIRLS,
  WHO_BMI_BOYS,
  WHO_BMI_GIRLS,
  calcPercentile,
  type GrowthSex,
  type GrowthPoint,
} from './whoGrowthData'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props {
  patientId: string
  patientSex: 'male' | 'female' | null
  patientBirthDate: string | null
}

type ChartTab = 'height' | 'weight' | 'hc' | 'bmi'

interface MeasurementRow {
  record: BiometricRecord
  ageMonths: number
  heightPct: number | null
  weightPct: number | null
  hcPct: number | null
  bmiPct: number | null
  bmi: number | null
}

interface ChartDataPoint {
  age: number
  patient?: number
  p3: number
  p15: number
  p50: number
  p85: number
  p97: number
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ageInMonths(birthDate: string, measureDate: string): number {
  const birth = new Date(birthDate)
  const measure = new Date(measureDate)
  const years = measure.getFullYear() - birth.getFullYear()
  const months = measure.getMonth() - birth.getMonth()
  const days = measure.getDate() - birth.getDate()
  const totalMonths = years * 12 + months + (days < 0 ? -1 : 0)
  return Math.max(0, totalMonths)
}

function formatPct(pct: number | null): string {
  if (pct === null) return 'â€”'
  return `P${pct}`
}

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TEAL = '#33C7BE'
const GRAY_LINES = ['#d1d5db', '#9ca3af', '#6b7280', '#9ca3af', '#d1d5db']
const PCT_KEYS = ['p3', 'p15', 'p50', 'p85', 'p97'] as const
const PCT_LABELS = ['P3', 'P15', 'P50', 'P85', 'P97']

function GrowthChart({
  data,
  yLabel,
  yDomain,
}: {
  data: ChartDataPoint[]
  yLabel: string
  yDomain?: [number, number]
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos de referencia disponibles para este rango.
      </div>
    )
  }

  const hasPatient = data.some((d) => d.patient != null)

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="age"
          label={{ value: 'Edad (meses)', position: 'insideBottom', offset: -4, fontSize: 11 }}
          tick={{ fontSize: 11 }}
          tickCount={10}
        />
        <YAxis
          label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
          tick={{ fontSize: 11 }}
          domain={yDomain}
          width={50}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => {
            if (name === 'patient') return [value, 'Paciente']
            return [value, String(name).toUpperCase()]
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(label: any) => `${label} meses`}
        />
        <Legend
          formatter={(value) => (value === 'patient' ? 'Paciente' : value.toUpperCase())}
          wrapperStyle={{ fontSize: 11 }}
        />

        {/* Reference percentile lines */}
        {PCT_KEYS.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={GRAY_LINES[i]}
            strokeWidth={key === 'p50' ? 1.5 : 1}
            strokeDasharray={key === 'p50' ? undefined : '4 3'}
            dot={false}
            name={PCT_LABELS[i]}
            legendType="line"
          />
        ))}

        {/* Patient measurements */}
        {hasPatient && (
          <Line
            type="monotone"
            dataKey="patient"
            stroke={TEAL}
            strokeWidth={2}
            dot={{ r: 5, fill: TEAL, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 7 }}
            connectNulls={false}
            name="patient"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

function MeasurementTable({ rows, tab }: { rows: MeasurementRow[]; tab: ChartTab }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No hay mediciones registradas.</p>
  }

  const sorted = [...rows].sort(
    (a, b) => new Date(b.record.recorded_at).getTime() - new Date(a.record.recorded_at).getTime(),
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-600 text-left">
            <th className="px-3 py-2 font-medium rounded-l">Fecha</th>
            <th className="px-3 py-2 font-medium">Edad (m)</th>
            {tab === 'height' && (
              <>
                <th className="px-3 py-2 font-medium">Talla (cm)</th>
                <th className="px-3 py-2 font-medium rounded-r">Percentil</th>
              </>
            )}
            {tab === 'weight' && (
              <>
                <th className="px-3 py-2 font-medium">Peso (kg)</th>
                <th className="px-3 py-2 font-medium rounded-r">Percentil</th>
              </>
            )}
            {tab === 'hc' && (
              <>
                <th className="px-3 py-2 font-medium">PC (cm)</th>
                <th className="px-3 py-2 font-medium rounded-r">Percentil</th>
              </>
            )}
            {tab === 'bmi' && (
              <>
                <th className="px-3 py-2 font-medium">IMC (kg/mÂ²)</th>
                <th className="px-3 py-2 font-medium rounded-r">Percentil</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const date = new Date(row.record.recorded_at).toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })

            let value: number | null = null
            let pct: number | null = null

            if (tab === 'height') {
              value = row.record.height_cm
              pct = row.heightPct
            } else if (tab === 'weight') {
              value = row.record.weight_kg
              pct = row.weightPct
            } else if (tab === 'hc') {
              value = row.record.head_circumference_cm ?? null
              pct = row.hcPct
            } else {
              value = row.bmi
              pct = row.bmiPct
            }

            return (
              <tr key={row.record.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">{date}</td>
                <td className="px-3 py-2 text-gray-700">{row.ageMonths}</td>
                <td className="px-3 py-2 font-medium text-gray-800">
                  {value != null ? value.toFixed(1) : 'â€”'}
                </td>
                <td className="px-3 py-2">
                  {pct !== null ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${TEAL}20`, color: TEAL }}
                    >
                      {formatPct(pct)}
                    </span>
                  ) : (
                    <span className="text-gray-400">â€”</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function GrowthCurvesTab({ patientId, patientSex, patientBirthDate }: Props) {
  const [records, setRecords] = useState<BiometricRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ChartTab>('height')
  const [localSex, setLocalSex] = useState<GrowthSex>('female')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formWeight, setFormWeight] = useState('')
  const [formHeight, setFormHeight] = useState('')
  const [formHC, setFormHC] = useState('')

  const effectiveSex: GrowthSex = patientSex ?? localSex

  // Age in months at current date (for tab visibility)
  const currentAgeMonths = useMemo(() => {
    if (!patientBirthDate) return null
    return ageInMonths(patientBirthDate, new Date().toISOString().slice(0, 10))
  }, [patientBirthDate])

  const showHC = currentAgeMonths !== null && currentAgeMonths < 60
  const showBMI = currentAgeMonths !== null && currentAgeMonths >= 24

  // Load data
  useEffect(() => {
    setLoading(true)
    getBiometricHistory(patientId)
      .then(setRecords)
      .catch((err) => {
        logger.error('GrowthCurvesTab:load', err)
        showToast('Error al cargar el historial biomÃ©trico', 'error')
      })
      .finally(() => setLoading(false))
  }, [patientId])

  // Derived measurement rows with percentiles
  const measurementRows = useMemo<MeasurementRow[]>(() => {
    if (!patientBirthDate) return []
    return records
      .filter((r) => r.recorded_at)
      .map((r) => {
        const age = ageInMonths(patientBirthDate, r.recorded_at)
        const bmi = r.height_cm && r.weight_kg ? r.weight_kg / Math.pow(r.height_cm / 100, 2) : null

        return {
          record: r,
          ageMonths: age,
          heightPct:
            r.height_cm != null ? calcPercentile(r.height_cm, age, 'height', effectiveSex) : null,
          weightPct:
            r.weight_kg != null ? calcPercentile(r.weight_kg, age, 'weight', effectiveSex) : null,
          hcPct:
            r.head_circumference_cm != null
              ? calcPercentile(r.head_circumference_cm, age, 'hc', effectiveSex)
              : null,
          bmiPct: bmi != null ? calcPercentile(bmi, age, 'bmi', effectiveSex) : null,
          bmi,
        }
      })
  }, [records, patientBirthDate, effectiveSex])

  // Chart data for active tab
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const sex = effectiveSex

    function makeChartData(
      table: GrowthPoint[],
      getValue: (m: MeasurementRow) => number | null,
    ): ChartDataPoint[] {
      const refPoints: ChartDataPoint[] = table.map((pt) => ({
        age: pt.age,
        p3: pt.p3,
        p15: pt.p15,
        p50: pt.p50,
        p85: pt.p85,
        p97: pt.p97,
      }))

      const patientByAge = new Map<number, number | null>()
      for (const m of measurementRows) {
        const v = getValue(m)
        patientByAge.set(m.ageMonths, v)
      }

      const allAges = new Set([...refPoints.map((p) => p.age), ...patientByAge.keys()])

      return Array.from(allAges)
        .sort((a, b) => a - b)
        .map((age) => {
          const refPt = (() => {
            const exact = refPoints.find((p) => p.age === age)
            if (exact) return exact
            const lo = [...refPoints].reverse().find((p) => p.age <= age)
            const hi = refPoints.find((p) => p.age >= age)
            if (!lo || !hi || lo === hi) return lo ?? hi ?? null
            const t = (age - lo.age) / (hi.age - lo.age)
            return {
              age,
              p3: lo.p3 + t * (hi.p3 - lo.p3),
              p15: lo.p15 + t * (hi.p15 - lo.p15),
              p50: lo.p50 + t * (hi.p50 - lo.p50),
              p85: lo.p85 + t * (hi.p85 - lo.p85),
              p97: lo.p97 + t * (hi.p97 - lo.p97),
            }
          })()
          if (!refPt) return null

          const pv = patientByAge.get(age)
          return {
            age,
            p3: +refPt.p3.toFixed(1),
            p15: +refPt.p15.toFixed(1),
            p50: +refPt.p50.toFixed(1),
            p85: +refPt.p85.toFixed(1),
            p97: +refPt.p97.toFixed(1),
            ...(pv != null ? { patient: +pv.toFixed(1) } : {}),
          } as ChartDataPoint
        })
        .filter((p): p is ChartDataPoint => p !== null)
    }

    if (activeTab === 'height') {
      const table = sex === 'male' ? WHO_HEIGHT_BOYS : WHO_HEIGHT_GIRLS
      return makeChartData(table, (m) => m.record.height_cm)
    }
    if (activeTab === 'weight') {
      const table = sex === 'male' ? WHO_WEIGHT_BOYS : WHO_WEIGHT_GIRLS
      return makeChartData(table, (m) => m.record.weight_kg)
    }
    if (activeTab === 'hc') {
      const table = sex === 'male' ? WHO_HC_BOYS : WHO_HC_GIRLS
      return makeChartData(table, (m) => m.record.head_circumference_cm ?? null)
    }
    // bmi
    const table = sex === 'male' ? WHO_BMI_BOYS : WHO_BMI_GIRLS
    return makeChartData(table, (m) => m.bmi)
  }, [activeTab, measurementRows, effectiveSex])

  // Save measurement
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formDate) {
      showToast('Selecciona una fecha', 'warning')
      return
    }
    if (!formWeight && !formHeight) {
      showToast('Ingresa al menos peso o talla', 'warning')
      return
    }

    const weightVal = formWeight ? parseFloat(formWeight) : null
    const heightVal = formHeight ? parseFloat(formHeight) : null
    const hcVal = formHC ? parseFloat(formHC) : null

    if (weightVal !== null && (isNaN(weightVal) || weightVal <= 0 || weightVal > 300)) {
      showToast('Peso invÃ¡lido', 'error')
      return
    }
    if (heightVal !== null && (isNaN(heightVal) || heightVal <= 0 || heightVal > 250)) {
      showToast('Talla invÃ¡lida', 'error')
      return
    }
    if (hcVal !== null && (isNaN(hcVal) || hcVal <= 0 || hcVal > 80)) {
      showToast('PerÃ­metro cefÃ¡lico invÃ¡lido', 'error')
      return
    }

    setSaving(true)
    try {
      const newRecord = await insertBiometricRecord({
        patient_id: patientId,
        recorded_at: new Date(formDate).toISOString(),
        weight_kg: weightVal,
        height_cm: heightVal,
        head_circumference_cm: hcVal,
        blood_type: null,
        notes: null,
      })
      if (newRecord) {
        setRecords((prev) => [newRecord, ...prev])
        showToast('MediciÃ³n registrada', 'success')
        setFormWeight('')
        setFormHeight('')
        setFormHC('')
        setFormDate(new Date().toISOString().slice(0, 10))
        setShowForm(false)
      }
    } catch (err) {
      logger.error('GrowthCurvesTab:save', err)
      showToast('Error al guardar la mediciÃ³n', 'error')
    } finally {
      setSaving(false)
    }
  }

  // â”€â”€ Tab definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tabs: { key: ChartTab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { key: 'height', label: 'Talla/Edad', icon: <Ruler size={14} />, visible: true },
    { key: 'weight', label: 'Peso/Edad', icon: <Weight size={14} />, visible: true },
    { key: 'hc', label: 'PC/Edad', icon: <Baby size={14} />, visible: showHC },
    { key: 'bmi', label: 'IMC/Edad', icon: <BarChart2 size={14} />, visible: showBMI },
  ]

  const yConfig: Record<ChartTab, { label: string; domain?: [number, number] }> = {
    height: { label: 'Talla (cm)' },
    weight: { label: 'Peso (kg)' },
    hc: { label: 'PC (cm)' },
    bmi: { label: 'IMC (kg/mÂ²)' },
  }

  // If active tab becomes invisible (age change), fall back to height
  const visibleTabs = tabs.filter((t) => t.visible)
  const activeTabVisible = visibleTabs.some((t) => t.key === activeTab)

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="space-y-4">
      {/* Sex selector when sex is unknown */}
      {patientSex === null && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-800">
              El sexo del paciente no estÃ¡ registrado â€” selecciona para ver las curvas
              correspondientes.
            </p>
            <div className="flex gap-2 mt-2">
              {(['male', 'female'] as GrowthSex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setLocalSex(s)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    localSex === s
                      ? 'text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
                  }`}
                  style={localSex === s ? { backgroundColor: TEAL } : {}}
                >
                  {s === 'male' ? 'Masculino' : 'Femenino'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No birth date */}
      {patientBirthDate === null && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
          <AlertCircle size={16} className="text-gray-400 shrink-0" />
          <p className="text-sm text-gray-500">
            Fecha de nacimiento no registrada. No es posible calcular la edad en meses.
          </p>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Curvas de Crecimiento OMS</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: `${TEAL}18`, color: TEAL }}
          >
            <Plus size={14} />
            {showForm ? 'Cancelar' : 'Agregar mediciÃ³n'}
          </button>
        </div>

        {/* Add measurement form */}
        {showForm && (
          <form onSubmit={handleSave} className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="300"
                  placeholder="ej. 12.5"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Talla (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="250"
                  placeholder="ej. 85.0"
                  value={formHeight}
                  onChange={(e) => setFormHeight(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              {(currentAgeMonths === null || currentAgeMonths <= 60) && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    PC (cm)
                    {currentAgeMonths !== null && currentAgeMonths > 60 && (
                      <span className="ml-1 text-gray-400">(opcional)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="80"
                    placeholder="ej. 47.0"
                    value={formHC}
                    onChange={(e) => setFormHC(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Guardar mediciÃ³n
              </button>
            </div>
          </form>
        )}

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-2 pt-2 gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-400 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart area */}
        <div className="px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : !activeTabVisible ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Selecciona una pestaÃ±a disponible.
            </div>
          ) : (
            <GrowthChart
              data={chartData}
              yLabel={yConfig[activeTab].label}
              yDomain={yConfig[activeTab].domain}
            />
          )}
        </div>

        {/* Measurement table */}
        {!loading && patientBirthDate && (
          <div className="px-4 pb-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Mediciones registradas</h3>
            <MeasurementTable rows={measurementRows} tab={activeTab} />
          </div>
        )}
      </div>
    </div>
  )
}
