import { useState, useEffect, useMemo } from 'react'
import { X, Search, Loader2, UserPlus, ArrowLeft } from 'lucide-react'
import { listDoctorPatients, type PatientProfileLite } from '@/features/doctor/services/patients'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

interface PatientPickerModalProps {
  doctorId: string
  onSelect: (patient: PatientProfileLite) => void
  onClose: () => void
}

export default function PatientPickerModal({
  doctorId,
  onSelect,
  onClose,
}: PatientPickerModalProps) {
  const [patients, setPatients] = useState<PatientProfileLite[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showRegister, setShowRegister] = useState(false)

  // Register form fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regBirthdate, setRegBirthdate] = useState('')
  const [regSex, setRegSex] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  useEffect(() => {
    listDoctorPatients(doctorId).then((data) => {
      setPatients(data)
      setLoading(false)
    })
  }, [doctorId])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return patients
    return patients.filter((p) => (p.full_name ?? '').toLowerCase().includes(q))
  }, [patients, query])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regName.trim() || !regEmail.trim()) return
    setRegLoading(true)
    try {
      const { error: fnErr, data } = await supabase.functions.invoke('create-patient-direct', {
        body: {
          email: regEmail.trim().toLowerCase(),
          full_name: regName.trim(),
          phone: regPhone.trim() || undefined,
          birthdate: regBirthdate || undefined,
          sex: regSex || undefined,
        },
      })
      if (fnErr) {
        let detail = 'Error al registrar el paciente'
        try {
          const body = await (
            fnErr as { context?: { json?: () => Promise<unknown> } }
          ).context?.json?.()
          detail = (body as { error?: string } | null)?.error ?? detail
        } catch {
          /* ignore */
        }
        showToast(detail, 'error', 4000)
        return
      }
      const result = data as { patient_id: string; created: boolean; requires_consent?: boolean }
      if (result.requires_consent) {
        showToast(
          '📨 Este paciente ya tiene cuenta en HealthPal. Se le envió una solicitud de acceso — podrás agendar una cita cuando la apruebe.',
          'info',
          7000,
        )
        onClose()
        return
      }
      showToast(
        result.created ? '✅ Paciente registrado' : '✅ Paciente vinculado',
        'success',
        3000,
      )
      onSelect({
        id: result.patient_id,
        full_name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        avatar_url: null,
      })
    } catch (err) {
      logger.error('PatientPickerModal.register', err)
      showToast('Error inesperado al registrar', 'error', 4000)
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {showRegister ? (
            <button
              onClick={() => setShowRegister(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}
          <h2 className="text-base font-bold text-gray-900">
            {showRegister ? 'Registrar paciente' : '¿Para qué paciente?'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Patient list view ── */}
        {!showRegister && (
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#33C7BE] animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">
                  {patients.length === 0
                    ? 'No tienes pacientes con acceso aceptado.'
                    : 'Sin resultados.'}
                </p>
              ) : (
                filtered.map((patient) => {
                  const initials = (patient.full_name ?? 'P')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                  return (
                    <button
                      key={patient.id}
                      onClick={() => onSelect(patient)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-teal-50 transition-colors text-left"
                    >
                      {patient.avatar_url ? (
                        <img
                          src={patient.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {patient.full_name ?? 'Paciente'}
                        </p>
                        {patient.email && (
                          <p className="text-xs text-gray-400 truncate">{patient.email}</p>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Register new patient button */}
            <button
              onClick={() => setShowRegister(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#33C7BE]/50 rounded-xl text-sm font-semibold text-[#33C7BE] hover:bg-teal-50 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Registrar nuevo paciente
            </button>
          </div>
        )}

        {/* ── Register form view ── */}
        {showRegister && (
          <form onSubmit={handleRegister} className="p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Nombre completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Nombre del paciente"
                required
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Correo electrónico <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Teléfono <span className="text-gray-300">(opcional)</span>
              </label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Fecha nac. <span className="text-gray-300">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={regBirthdate}
                  onChange={(e) => setRegBirthdate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Sexo <span className="text-gray-300">(opcional)</span>
                </label>
                <select
                  value={regSex}
                  onChange={(e) => setRegSex(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/30 bg-white"
                >
                  <option value="">—</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={regLoading || !regName.trim() || !regEmail.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40 text-sm"
            >
              {regLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Registrar y agendar cita
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
