import { useState } from 'react'
import {
  Stethoscope, BadgeCheck, Building2, MapPin, Clock,
  DollarSign, FileText, Pencil, X, Save, Loader2,
} from 'lucide-react'
import { DoctorProfile } from '@/shared/types/database'
import { upsertDoctorProfile } from '@/shared/lib/queries/profile'
import { geocodeAddress } from '@/shared/lib/geocoding'
import { logger } from '@/shared/lib/logger'
import { SPECIALTIES, formatSpecialty } from '@/shared/lib/specialties'

interface DoctorVerificationCardProps {
  doctorProfile: DoctorProfile | null
  userId: string
  isLoading?: boolean
  onSaved?: (updated: DoctorProfile) => void
}

export default function DoctorVerificationCard({
  doctorProfile,
  userId,
  isLoading = false,
  onSaved,
}: DoctorVerificationCardProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState({
    specialty: doctorProfile?.specialty ?? '',
    professional_license: doctorProfile?.professional_license ?? '',
    clinic_name: doctorProfile?.clinic_name ?? '',
    address_text: doctorProfile?.address_text ?? '',
    years_experience: doctorProfile?.years_experience?.toString() ?? '',
    consultation_price_mxn: doctorProfile?.consultation_price_mxn?.toString() ?? '',
    bio: doctorProfile?.bio ?? '',
  })

  const startEdit = () => {
    setForm({
      specialty: doctorProfile?.specialty ?? '',
      professional_license: doctorProfile?.professional_license ?? '',
      clinic_name: doctorProfile?.clinic_name ?? '',
      address_text: doctorProfile?.address_text ?? '',
      years_experience: doctorProfile?.years_experience?.toString() ?? '',
      consultation_price_mxn: doctorProfile?.consultation_price_mxn?.toString() ?? '',
      bio: doctorProfile?.bio ?? '',
    })
    setSaveError(null)
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      let location: { lat: number; lng: number } | null =
        (doctorProfile?.location as { lat: number; lng: number } | null) ?? null

      const addressChanged = form.address_text.trim() !== (doctorProfile?.address_text ?? '')
      if (addressChanged && form.address_text.trim()) {
        const geo = await geocodeAddress(form.address_text.trim())
        if (geo) location = { lat: geo.lat, lng: geo.lng }
        else location = null
      }

      const updated = await upsertDoctorProfile(userId, {
        specialty: form.specialty || null,
        professional_license: form.professional_license.trim() || null,
        clinic_name: form.clinic_name.trim() || null,
        address_text: form.address_text.trim() || null,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        consultation_price_mxn: form.consultation_price_mxn
          ? parseFloat(form.consultation_price_mxn)
          : null,
        bio: form.bio.trim() || null,
        location: location as any,
      })

      onSaved?.(updated as unknown as DoctorProfile)
      setEditing(false)
    } catch (err: any) {
      logger.error('DoctorVerificationCard:save', err)
      setSaveError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-6" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-36" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Perfil médico</h3>
        </div>
        {!editing ? (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Guardar
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-5">
        {editing ? (
          /* ── EDIT FORM ── */
          <div className="space-y-4">
            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {saveError}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Specialty */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Especialidad
                </label>
                <select
                  value={form.specialty}
                  onChange={set('specialty')}
                  className="w-full text-sm rounded-xl border border-gray-200 px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  <option value="">— Sin especificar —</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Professional license */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Cédula Profesional
                </label>
                <input
                  type="text"
                  value={form.professional_license}
                  onChange={set('professional_license')}
                  placeholder="Ej. 1853421"
                  className="w-full text-sm rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-gray-300"
                />
              </div>

              {/* Clinic name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Consultorio / Clínica
                </label>
                <input
                  type="text"
                  value={form.clinic_name}
                  onChange={set('clinic_name')}
                  placeholder="Nombre del consultorio"
                  className="w-full text-sm rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-gray-300"
                />
              </div>

              {/* Years of experience */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Años de experiencia
                </label>
                <input
                  type="number"
                  min="0"
                  max="70"
                  value={form.years_experience}
                  onChange={set('years_experience')}
                  placeholder="Ej. 10"
                  className="w-full text-sm rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-gray-300"
                />
              </div>

              {/* Consultation price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Precio de consulta (MXN)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.consultation_price_mxn}
                  onChange={set('consultation_price_mxn')}
                  placeholder="Ej. 500"
                  className="w-full text-sm rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-gray-300"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Dirección del consultorio
                </label>
                <input
                  type="text"
                  value={form.address_text}
                  onChange={set('address_text')}
                  placeholder="Calle, colonia, ciudad"
                  className="w-full text-sm rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-gray-300"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Se usará para mostrar el mapa en tu perfil público.
                </p>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Descripción / Bio
              </label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={set('bio')}
                placeholder="Describe tu experiencia, enfoque y lo que te diferencia como médico…"
                className="w-full text-sm rounded-xl border border-gray-200 px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-gray-300"
              />
            </div>
          </div>
        ) : (
          /* ── READ-ONLY VIEW ── */
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {[
                { icon: <BadgeCheck className="w-4 h-4 text-primary" />, label: 'Cédula profesional', value: doctorProfile?.professional_license },
                { icon: <Stethoscope className="w-4 h-4 text-primary" />, label: 'Especialidad', value: formatSpecialty(doctorProfile?.specialty) },
                { icon: <Building2 className="w-4 h-4 text-primary" />, label: 'Consultorio / Clínica', value: doctorProfile?.clinic_name },
                { icon: <MapPin className="w-4 h-4 text-primary" />, label: 'Dirección', value: doctorProfile?.address_text },
                { icon: <Clock className="w-4 h-4 text-primary" />, label: 'Años de experiencia', value: doctorProfile?.years_experience != null ? `${doctorProfile.years_experience} años` : null },
                { icon: <DollarSign className="w-4 h-4 text-primary" />, label: 'Precio de consulta', value: doctorProfile?.consultation_price_mxn != null ? `$${doctorProfile.consultation_price_mxn.toLocaleString('es-MX')} MXN` : null },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-800">
                      {value ?? <span className="text-gray-400 font-normal">Sin registrar</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {(doctorProfile?.bio || doctorProfile === null) && (
              <div className="flex items-start gap-2.5 pt-1">
                <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Descripción / Bio</p>
                  {doctorProfile?.bio ? (
                    <p className="text-sm text-gray-700 leading-relaxed">{doctorProfile.bio}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Sin registrar</p>
                  )}
                </div>
              </div>
            )}

            {!doctorProfile && (
              <p className="text-sm text-gray-400 text-center py-2">
                No se encontró información de perfil médico.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
