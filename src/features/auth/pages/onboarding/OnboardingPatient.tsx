import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import { InputField, PhoneField, SelectField, MultiSelectField } from '@/shared/components/ui/FormField'
import Button from '@/shared/components/ui/Button'
import { getMyProfile, getPatientProfile, upsertPatientProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Listo']

const BLOOD_TYPES = [
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
]

const COMMON_ALLERGIES = [
  { value: 'penicilina', label: 'Penicilina' },
  { value: 'aspirina', label: 'Aspirina' },
  { value: 'ibuprofeno', label: 'Ibuprofeno' },
  { value: 'latex', label: 'Látex' },
  { value: 'polen', label: 'Polen' },
  { value: 'polvo', label: 'Polvo' },
  { value: 'acaros', label: 'Ácaros' },
  { value: 'mascotas', label: 'Mascotas (pelo)' },
  { value: 'lactosa', label: 'Lactosa' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'mariscos', label: 'Mariscos' },
  { value: 'nueces', label: 'Nueces' },
  { value: 'soya', label: 'Soya' },
  { value: 'huevo', label: 'Huevo' },
]

export default function OnboardingPatient() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [formData, setFormData] = useState({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_type: '',
  })
  const [countryCode, setCountryCode] = useState('+52')
  const [allergies, setAllergies] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const profile = await getMyProfile()
      setUserId(profile.id)

      const patientProfile = await getPatientProfile(profile.id)
      if (patientProfile) {
        const cleanPhone = patientProfile.emergency_contact_phone?.replace('+52', '').trim() || ''
        setFormData({
          emergency_contact_name: patientProfile.emergency_contact_name || '',
          emergency_contact_phone: cleanPhone,
          blood_type: patientProfile.blood_type || '',
        })
        // Parse allergies from comma-separated string
        if (patientProfile.allergies) {
          const allergyList = patientProfile.allergies.split(',').map(a => a.trim())
          setAllergies(allergyList)
        }
      }
    } catch (error) {
      console.error('Error loading patient profile:', error)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.emergency_contact_name.trim()) {
      newErrors.emergency_contact_name = 'El nombre del contacto de emergencia es requerido'
    }

    if (!formData.emergency_contact_phone.trim()) {
      newErrors.emergency_contact_phone = 'El teléfono de contacto de emergencia es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      const fullPhone = `${countryCode}${formData.emergency_contact_phone.replace(/\D/g, '')}`
      const allergiesString = allergies.length > 0 ? allergies.join(', ') : null
      
      await upsertPatientProfile(userId, {
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: fullPhone,
        blood_type: formData.blood_type || null,
        allergies: allergiesString,
      })
      await saveOnboardingStep('done')

      showToast('Perfil de paciente guardado exitosamente', 'success')
      
      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))
      
      navigate('/onboarding/done')
    } catch (error: any) {
      console.error('Error saving patient profile:', error)
      showToast(error.message || 'Error al guardar perfil', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingLayout
      title="Información de Salud"
      description="Datos importantes para tu atención médica"
    >
      <Stepper currentStep={4} totalSteps={5} steps={STEPS} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Contacto de emergencia:</strong> Esta persona será contactada en caso de emergencia médica
          </p>
        </div>

        <InputField
          label="Nombre del Contacto de Emergencia"
          type="text"
          required
          value={formData.emergency_contact_name}
          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
          error={errors.emergency_contact_name}
          placeholder="Ej: María García (Mamá)"
        />

        <PhoneField
          label="Teléfono de Contacto de Emergencia"
          required
          value={formData.emergency_contact_phone}
          onChange={(value) => setFormData({ ...formData, emergency_contact_phone: value })}
          countryCode={countryCode}
          onCountryChange={setCountryCode}
          error={errors.emergency_contact_phone}
          helpText="Número de teléfono a 10 dígitos"
        />

        <SelectField
          label="Tipo de Sangre"
          value={formData.blood_type}
          onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
          options={BLOOD_TYPES}
          helpText="Opcional - Importante para emergencias"
        />

        <MultiSelectField
          label="Alergias"
          options={COMMON_ALLERGIES}
          value={allergies}
          onChange={setAllergies}
          helpText="Opcional - Selecciona todas las que apliquen"
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
