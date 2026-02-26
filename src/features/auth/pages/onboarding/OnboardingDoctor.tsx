// @ts-nocheck
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import { InputField, TextareaField } from '@/shared/components/ui/FormField'
import Button from '@/shared/components/ui/Button'
import SearchableSelect from '@/shared/components/ui/SearchableSelect'
import AddressAutocomplete from '@/shared/components/ui/AddressAutocomplete'
import { getMyProfile, getDoctorProfile, upsertDoctorProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { SPECIALTIES } from '@/shared/lib/specialties'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Listo']

export default function OnboardingDoctor() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [formData, setFormData] = useState({
    specialty: '',
    professional_license: '',
    years_experience: '',
    clinic_name: '',
    address_text: '',
    bio: '',
  })
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const profile = await getMyProfile()
      setUserId(profile.id)

      const doctorProfile = await getDoctorProfile(profile.id)
      if (doctorProfile) {
        setFormData({
          specialty: doctorProfile.specialty || '',
          professional_license: doctorProfile.professional_license || '',
          years_experience: doctorProfile.years_experience?.toString() || '',
          clinic_name: doctorProfile.clinic_name || '',
          address_text: doctorProfile.address_text || '',
          bio: doctorProfile.bio || '',
        })
        if (doctorProfile.location) {
          const loc = doctorProfile.location as { lat: number; lng: number }
          if (loc.lat && loc.lng) setLocation(loc)
        }
      }
    } catch (error) {
      logger.error('Error loading doctor profile:', error)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.specialty) {
      newErrors.specialty = 'La especialidad es requerida'
    }

    if (!formData.professional_license.trim()) {
      newErrors.professional_license = 'La cédula profesional es requerida'
    }

    if (!formData.years_experience) {
      newErrors.years_experience = 'Los años de experiencia son requeridos'
    } else if (parseInt(formData.years_experience) < 0) {
      newErrors.years_experience = 'Los años de experiencia no pueden ser negativos'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      // If the user typed a custom address but didn't pick a suggestion,
      // attempt a one-shot geocode so coordinates are still saved when possible.
      let finalLocation = location
      if (formData.address_text.trim() && !finalLocation) {
        try {
          const { geocodeAddress } = await import('@/shared/lib/geocoding')
          const geo = await geocodeAddress(formData.address_text)
          if (geo) finalLocation = { lat: geo.lat, lng: geo.lng }
        } catch {
          // Non-blocking — coordinates are optional
        }
      }

      await upsertDoctorProfile(userId, {
        specialty: formData.specialty,
        professional_license: formData.professional_license.trim(),
        years_experience: parseInt(formData.years_experience),
        clinic_name: formData.clinic_name.trim() || null,
        address_text: formData.address_text.trim() || null,
        bio: formData.bio.trim() || null,
        location: finalLocation,
      })
      await saveOnboardingStep('done')

      showToast('Perfil de doctor guardado exitosamente', 'success')

      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))

      navigate('/onboarding/done')
    } catch (error: any) {
      logger.error('Error saving doctor profile:', error)
      showToast(error.message || 'Error al guardar perfil', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingLayout
      title="Perfil Profesional"
      description="Información sobre tu práctica médica"
    >
      <Stepper currentStep={4} totalSteps={5} steps={STEPS} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Specialty (searchable) ── */}
        <SearchableSelect
          label="Especialidad"
          required
          value={formData.specialty}
          onChange={(val) => {
            setFormData({ ...formData, specialty: val })
            if (errors.specialty) setErrors({ ...errors, specialty: '' })
          }}
          options={SPECIALTIES}
          grouped
          searchPlaceholder="Buscar especialidad..."
          placeholder="Seleccionar especialidad..."
          error={errors.specialty}
        />

        {/* ── Professional license ── */}
        <InputField
          label="Cédula Profesional"
          type="text"
          required
          value={formData.professional_license}
          onChange={(e) => {
            setFormData({ ...formData, professional_license: e.target.value })
            if (errors.professional_license) setErrors({ ...errors, professional_license: '' })
          }}
          error={errors.professional_license}
          placeholder="1234567"
        />

        {/* ── Years of experience ── */}
        <InputField
          label="Años de Experiencia"
          type="number"
          required
          min="0"
          max="70"
          value={formData.years_experience}
          onChange={(e) => {
            setFormData({ ...formData, years_experience: e.target.value })
            if (errors.years_experience) setErrors({ ...errors, years_experience: '' })
          }}
          error={errors.years_experience}
          placeholder="5"
        />

        {/* ── Clinic name (optional → null if empty) ── */}
        <InputField
          label="Nombre de Clínica/Consultorio"
          type="text"
          value={formData.clinic_name}
          onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
          placeholder="Hospital ABC"
          helpText="Opcional"
        />

        {/* ── Address with autocomplete (optional → null if empty) ── */}
        <AddressAutocomplete
          label="Dirección de Consultorio"
          value={formData.address_text}
          onChange={(addr) => setFormData({ ...formData, address_text: addr })}
          onCoordinatesChange={setLocation}
          placeholder="Escribe una dirección..."
          helpText="Opcional — Comienza a escribir y selecciona una sugerencia"
        />

        {/* ── Bio (optional → null if empty) ── */}
        <TextareaField
          label="Biografía Profesional"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Cuéntanos sobre tu experiencia y enfoque médico..."
          helpText="Opcional — Esto será visible para tus pacientes"
        />

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/onboarding/contact')}
          >
            Atrás
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Continuar'}
          </Button>
        </div>
      </form>
    </OnboardingLayout>
  )
}
