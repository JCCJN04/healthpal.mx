// @ts-nocheck
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import { SelectField } from '@/shared/components/ui/FormField'
import Button from '@/shared/components/ui/Button'
import { getMyProfile, getPatientProfile, upsertPatientProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

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

export default function OnboardingPatient() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [formData, setFormData] = useState({
    blood_type: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const profile = await getMyProfile()
      setUserId(profile.id)

      const patientProfile = await getPatientProfile(profile.id)
      if (patientProfile) {
        setFormData({
          blood_type: patientProfile.blood_type || '',
        })
      }
    } catch (error) {
      logger.error('Error loading patient profile:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)

    try {
      await upsertPatientProfile(userId, {
        blood_type: formData.blood_type || null,
      })
      await saveOnboardingStep('done')

      showToast('Perfil de paciente guardado exitosamente', 'success')

      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))

      navigate('/onboarding/done')
    } catch (error: any) {
      logger.error('Error saving patient profile:', error)
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
            <strong>Privacidad reforzada:</strong> La información médica sensible ahora se protege con cifrado y ya no se captura en texto plano durante onboarding.
          </p>
        </div>

        <SelectField
          label="Tipo de Sangre"
          value={formData.blood_type}
          onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
          options={BLOOD_TYPES}
          helpText="Opcional - Importante para emergencias"
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
