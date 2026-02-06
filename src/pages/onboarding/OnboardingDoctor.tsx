import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '../../components/Stepper'
import { InputField, SelectField, TextareaField } from '../../components/FormField'
import Button from '../../components/Button'
import { getMyProfile, getDoctorProfile, upsertDoctorProfile, saveOnboardingStep } from '../../lib/queries/profile'
import { showToast } from '../../components/Toast'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Listo']

const SPECIALTIES = [
  { value: 'medicina_general', label: 'Medicina General' },
  { value: 'pediatria', label: 'Pediatría' },
  { value: 'ginecologia', label: 'Ginecología' },
  { value: 'cardiologia', label: 'Cardiología' },
  { value: 'dermatologia', label: 'Dermatología' },
  { value: 'traumatologia', label: 'Traumatología' },
  { value: 'psiquiatria', label: 'Psiquiatría' },
  { value: 'neurologia', label: 'Neurología' },
  { value: 'oftalmologia', label: 'Oftalmología' },
  { value: 'otorrinolaringologia', label: 'Otorrinolaringología' },
  { value: 'otro', label: 'Otra especialidad' },
]

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
      }
    } catch (error) {
      console.error('Error loading doctor profile:', error)
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
      await upsertDoctorProfile(userId, {
        specialty: formData.specialty,
        professional_license: formData.professional_license,
        years_experience: parseInt(formData.years_experience),
        clinic_name: formData.clinic_name || null,
        address_text: formData.address_text || null,
        bio: formData.bio || null,
      })
      await saveOnboardingStep('done')

      showToast('Perfil de doctor guardado exitosamente', 'success')
      
      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))
      
      navigate('/onboarding/done')
    } catch (error: any) {
      console.error('Error saving doctor profile:', error)
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
        <SelectField
          label="Especialidad"
          required
          value={formData.specialty}
          onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
          error={errors.specialty}
          options={SPECIALTIES}
        />

        <InputField
          label="Cédula Profesional"
          type="text"
          required
          value={formData.professional_license}
          onChange={(e) => setFormData({ ...formData, professional_license: e.target.value })}
          error={errors.professional_license}
          placeholder="1234567"
        />

        <InputField
          label="Años de Experiencia"
          type="number"
          required
          min="0"
          value={formData.years_experience}
          onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
          error={errors.years_experience}
          placeholder="5"
        />

        <InputField
          label="Nombre de Clínica/Consultorio"
          type="text"
          value={formData.clinic_name}
          onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
          placeholder="Hospital ABC"
          helpText="Opcional"
        />

        <InputField
          label="Dirección de Consultorio"
          type="text"
          value={formData.address_text}
          onChange={(e) => setFormData({ ...formData, address_text: e.target.value })}
          placeholder="Av. Reforma 123, CDMX"
          helpText="Opcional - Podrás agregar ubicación exacta después"
        />

        <TextareaField
          label="Biografía Profesional"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Cuéntanos sobre tu experiencia y enfoque médico..."
          helpText="Opcional - Esto será visible para tus pacientes"
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
