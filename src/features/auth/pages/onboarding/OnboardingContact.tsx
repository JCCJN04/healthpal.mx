import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import { PhoneField } from '@/shared/components/ui/FormField'
import Button from '@/shared/components/ui/Button'
import { getMyProfile, updateMyProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Listo']

export default function OnboardingContact() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+52')
  const [error, setError] = useState('')
  const [role, setRole] = useState<'patient' | 'doctor' | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const profile = await getMyProfile()
      if (profile.phone) {
        // Si el número tiene +52, quitarlo
        const cleanPhone = profile.phone.replace('+52', '').trim()
        setPhone(cleanPhone)
      }
      setRole(profile.role as any)
    } catch (error) {
      logger.error('Error loading profile:', error)
    }
  }

  const validate = () => {
    if (!phone.trim()) {
      setError('El teléfono es requerido')
      return false
    }

    // Validar 10 dígitos para México
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10) {
      setError('El teléfono debe tener 10 dígitos')
      return false
    }

    setError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      // Guardar con código de país
      const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`
      await updateMyProfile({ phone: fullPhone })
      await saveOnboardingStep('details')

      showToast('Teléfono guardado exitosamente', 'success')
      
      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))

      // Navigate based on role
      if (role === 'doctor') {
        navigate('/onboarding/doctor')
      } else if (role === 'patient') {
        navigate('/onboarding/patient')
      } else {
        navigate('/onboarding/done')
      }
    } catch (error: any) {
      logger.error('Error saving contact:', error)
      showToast(error.message || 'Error al guardar teléfono', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingLayout
      title="Información de Contacto"
      description="¿Cómo podemos comunicarnos contigo?"
    >
      <Stepper currentStep={3} totalSteps={5} steps={STEPS} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PhoneField
          label="Número de Teléfono"
          required
          value={phone}
          onChange={setPhone}
          countryCode={countryCode}
          onCountryChange={setCountryCode}
          error={error}
          helpText="Ingresa tu número de teléfono a 10 dígitos"
        />

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/onboarding/basic')}
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
