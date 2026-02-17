import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import { InputField, SelectField } from '@/shared/components/ui/FormField'
import Button from '@/shared/components/ui/Button'
import { getMyProfile, updateMyProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Listo']

export default function OnboardingBasic() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    sex: '' as 'male' | 'female' | 'other' | 'unspecified' | '',
    birthdate: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const profile = await getMyProfile()
      setFormData({
        full_name: profile.full_name || '',
        sex: profile.sex || '',
        birthdate: profile.birthdate || '',
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre completo es requerido'
    }

    if (!formData.sex) {
      newErrors.sex = 'Por favor selecciona tu sexo'
    }

    if (!formData.birthdate) {
      newErrors.birthdate = 'La fecha de nacimiento es requerida'
    } else {
      const age = new Date().getFullYear() - new Date(formData.birthdate).getFullYear()
      if (age < 18) {
        newErrors.birthdate = 'Debes ser mayor de 18 años'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      await updateMyProfile({
        full_name: formData.full_name,
        sex: formData.sex as any,
        birthdate: formData.birthdate,
      })
      await saveOnboardingStep('contact')

      showToast('Información guardada exitosamente', 'success')
      
      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))
      
      navigate('/onboarding/contact')
    } catch (error: any) {
      console.error('Error saving basic info:', error)
      showToast(error.message || 'Error al guardar información', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingLayout
      title="Información Básica"
      description="Ayúdanos a conocerte mejor"
    >
      <Stepper currentStep={2} totalSteps={5} steps={STEPS} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          label="Nombre Completo"
          type="text"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          error={errors.full_name}
          placeholder="Ej: Juan Pérez García"
        />

        <SelectField
          label="Sexo"
          required
          value={formData.sex}
          onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
          error={errors.sex}
          options={[
            { value: 'male', label: 'Masculino' },
            { value: 'female', label: 'Femenino' },
            { value: 'other', label: 'Otro' },
            { value: 'unspecified', label: 'Prefiero no especificar' },
          ]}
        />

        <InputField
          label="Fecha de Nacimiento"
          type="date"
          required
          value={formData.birthdate}
          onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
          error={errors.birthdate}
          max={new Date().toISOString().split('T')[0]}
        />

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/onboarding/role')}
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
