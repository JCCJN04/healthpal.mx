// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useEffect, useMemo } from 'react'
import {
  UserCircle2, Loader2, Search, Phone,
  CalendarDays, ChevronDown, ChevronUp, X,
} from 'lucide-react'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
import DashboardLayout from '@/app/layout/DashboardLayout'
import { getMyDoctorLink, type DoctorAssistant } from '@/shared/lib/queries/assistants'
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { AppointmentWithPatient } from '@/shared/lib/queries/appointments'

interface PatientBasic {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  email: string | null
}

// ─── WhatsApp helpers ─────────────────────────────────────────────────────────

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  // Mexico: ensure 52 country code
  if (digits.startsWith('521') || digits.startsWith('52')) return digits
  if (digits.length === 10) return `52${digits}`
  return digits
}

function waUrl(phone: string | null, message: string): string | null {
  const p = cleanPhone(phone)
  if (!p) return null
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`
}

interface WaTemplate {
  label: string
  build: (patientName: string, doctorName: string, apptInfo?: string) => string
}

const WA_TEMPLATES: WaTemplate[] = [
  {
    label: 'Recordatorio de cita',
    build: (patient, doctor, appt) =>
      `Hola ${patient}, le recordamos su cita con ${doctor}${appt ? ` el ${appt}` : ''}. Confirme su asistencia por favor.`,
  },
  {
    label: 'Cita confirmada',
    build: (patient, doctor, appt) =>
      `Hola ${patient}, su cita con ${doctor}${appt ? ` para el ${appt}` : ''} ha sido confirmada. Le esperamos.`,
  },
  {
    label: 'Cancelación de cita',
    build: (patient, doctor) =>
      `Hola ${patient}, lamentablemente su cita con ${doctor} ha sido cancelada. Contáctenos para reagendarla.`,
  },
  {
    label: 'Agendar cita',
    build: (patient, doctor) =>
      `Hola ${patient}, le contactamos de parte de ${doctor}. ¿Le gustaría agendar una cita? Indíquenos su disponibilidad.`,
  },
]

// ─── WhatsApp modal ───────────────────────────────────────────────────────────

interface WaModalProps {
  patient: PatientBasic
  doctorName: string
  nextAppt?: string
  onClose: () => void
}

function WaModal({ patient, doctorName, nextAppt, onClose }: WaModalProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [customText, setCustomText] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const patientName = patient.full_name?.split(' ')[0] ?? 'paciente'
  const builtMessage = useCustom
    ? customText
    : WA_TEMPLATES[selectedIdx].build(patientName, doctorName, nextAppt)

  const url = waUrl(patient.phone, builtMessage)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <WhatsAppIcon className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">WhatsApp</p>
              <p className="text-xs text-gray-400 truncate max-w-[200px]">
                {patient.full_name ?? patient.phone ?? 'Paciente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Phone */}
          {patient.phone ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone size={14} className="text-gray-400" />
              <span>{patient.phone}</span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              Este paciente no tiene número de teléfono registrado.
            </div>
          )}

          {/* Template selector */}
          {!useCustom && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plantilla</p>
              <div className="grid grid-cols-2 gap-2">
                {WA_TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`text-left text-xs px-3 py-2 rounded-xl border transition-colors ${
                      selectedIdx === i
                        ? 'bg-green-50 border-green-200 text-green-700 font-semibold'
                        : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message preview / custom */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensaje</p>
              <button
                onClick={() => {
                  setUseCustom(v => !v)
                  if (!useCustom) setCustomText(builtMessage)
                }}
                className="text-xs text-primary hover:underline"
              >
                {useCustom ? 'Usar plantilla' : 'Editar'}
              </button>
            </div>
            {useCustom ? (
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                rows={4}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary resize-none"
              />
            ) : (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 leading-relaxed">
                {builtMessage}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <a
            href={url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={!url ? e => e.preventDefault() : undefined}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
              url
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <WhatsAppIcon className="w-4 h-4" />
            Abrir WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Patient card ─────────────────────────────────────────────────────────────

interface PatientCardProps {
  patient: PatientBasic
  appointments: AppointmentWithPatient[]
  doctorName: string
  onWhatsApp: () => void
}

function PatientCard({ patient, appointments, doctorName: _doctorName, onWhatsApp }: PatientCardProps) {
  const [expanded, setExpanded] = useState(false)

  const upcoming = appointments
    .filter(a => a.status !== 'cancelled' && new Date(a.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const nextAppt = upcoming[0]

  const nextApptLabel = nextAppt
    ? new Date(nextAppt.scheduled_at).toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: 'numeric', month: 'short', year: 'numeric',
      }) + ' ' +
      new Date(nextAppt.scheduled_at).toLocaleTimeString('es-MX', {
        timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : undefined

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 p-4">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {patient.avatar_url
            ? <img src={patient.avatar_url} className="w-11 h-11 object-cover" />
            : <UserCircle2 size={22} className="text-gray-400" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {patient.full_name ?? 'Paciente'}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {patient.phone && (
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Phone size={10} /> {patient.phone}
              </span>
            )}
            {nextAppt && (
              <span className="flex items-center gap-1 text-[11px] text-primary">
                <CalendarDays size={10} /> {nextApptLabel}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onWhatsApp}
            title="Enviar WhatsApp"
            className="p-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
          >
            <WhatsAppIcon className="w-5 h-5" />
          </button>
          {appointments.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded appointments */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Historial de citas ({appointments.length})
          </p>
          {appointments
            .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
            .slice(0, 5)
            .map(appt => (
              <div key={appt.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">
                  {new Date(appt.scheduled_at).toLocaleDateString('es-MX', {
                    timeZone: 'America/Mexico_City',
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  appt.status === 'confirmed' ? 'bg-green-50 text-green-600 border-green-100' :
                  appt.status === 'pending'   ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  appt.status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-100' :
                                                'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {{ confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada', completed: 'Completada' }[appt.status]}
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AssistantPacientes() {
  const [link, setLink] = useState<DoctorAssistant | null>(null)
  const [linkLoading, setLinkLoading] = useState(true)
  const [patients, setPatients] = useState<PatientBasic[]>([])
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [waPatient, setWaPatient] = useState<PatientBasic | null>(null)

  useEffect(() => {
    getMyDoctorLink().then(l => {
      setLink(l)
      setLinkLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!link) return
    setLoading(true)

    Promise.all([
      supabase.rpc('get_doctor_patients_for_assistant', { p_doctor_id: link.doctor_id }),
      supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', link.doctor_id)
        .order('scheduled_at', { ascending: false }),
    ]).then(([pRes, aRes]) => {
      if (pRes.error) logger.error('AssistantPacientes:patients', pRes.error)
      else setPatients((pRes.data ?? []) as PatientBasic[])

      if (aRes.error) logger.error('AssistantPacientes:appts', aRes.error)
      else setAppointments((aRes.data ?? []) as AppointmentWithPatient[])

      setLoading(false)
    })
  }, [link])

  const apptsByPatient = useMemo(() => {
    const map = new Map<string, AppointmentWithPatient[]>()
    for (const a of appointments) {
      const list = map.get(a.patient_id) ?? []
      list.push(a)
      map.set(a.patient_id, list)
    }
    return map
  }, [appointments])

  const filtered = useMemo(() => {
    if (!search.trim()) return patients
    const q = search.toLowerCase()
    return patients.filter(p =>
      p.full_name?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  }, [patients, search])

  const waNextAppt = (patientId: string): string | undefined => {
    const appts = apptsByPatient.get(patientId) ?? []
    const next = appts
      .filter(a => a.status !== 'cancelled' && new Date(a.scheduled_at) >= new Date())
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
    if (!next) return undefined
    return new Date(next.scheduled_at).toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: 'numeric', month: 'long', year: 'numeric',
    }) + ' a las ' +
    new Date(next.scheduled_at).toLocaleTimeString('es-MX', {
      timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  if (linkLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!link) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <UserCircle2 size={32} className="text-amber-400 mb-3" />
          <p className="font-bold text-gray-800">Aún no estás vinculado a ningún médico</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pacientes de <span className="font-semibold text-primary">{link.doctor?.full_name ?? 'médico'}</span>
            {!loading && <span className="ml-1 text-gray-400">· {patients.length} registrados</span>}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserCircle2 size={32} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">
              {search ? 'Sin resultados para tu búsqueda' : 'No hay pacientes aún'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <PatientCard
                key={p.id}
                patient={p}
                appointments={apptsByPatient.get(p.id) ?? []}
                doctorName={link.doctor?.full_name ?? 'el médico'}
                onWhatsApp={() => setWaPatient(p)}
              />
            ))}
          </div>
        )}
      </div>

      {waPatient && (
        <WaModal
          patient={waPatient}
          doctorName={link.doctor?.full_name ?? 'el médico'}
          nextAppt={waNextAppt(waPatient.id)}
          onClose={() => setWaPatient(null)}
        />
      )}
    </DashboardLayout>
  )
}
