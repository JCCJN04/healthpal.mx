import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import { PhoneField } from '@/shared/components/ui/FormField'
import Button from '@/shared/components/ui/Button'
import { getMyProfile, updateMyProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { supabase } from '@/shared/lib/supabase'

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`

      // Check if this phone belongs to a pre-registered WhatsApp account.
      // If so, merge the current session into that account so the patient
      // can access documents they sent before creating an account.
      const { data: mergeResult, error: mergeErr } = await supabase.functions.invoke<{
        merged: boolean
        token_hash?: string
        merged_user_id?: string
      }>('merge-preregistered-account', { body: { phone: fullPhone } })

      if (mergeErr) {
        logger.error('merge-preregistered-account error:', mergeErr)
        // Non-fatal: continue normal onboarding flow
      }

      if (mergeResult?.merged && mergeResult.token_hash) {
        // Re-authenticate as the pre-registered account (UUID_A) which owns the documents
        const { error: otpErr } = await supabase.auth.verifyOtp({
          token_hash: mergeResult.token_hash,
          type: 'email',
        })
        if (otpErr) {
          logger.error('verifyOtp after merge failed:', otpErr)
          // Non-fatal: user stays as UUID_B, loses pre-registered docs link
        } else {
          showToast('Cuenta vinculada. Tus documentos de WhatsApp están disponibles.', 'success')
          await new Promise(resolve => setTimeout(resolve, 100))
          if (role === 'doctor') {
            navigate('/onboarding/doctor')
          } else if (role === 'patient') {
            navigate('/onboarding/patient')
          } else {
            navigate('/onboarding/done')
          }
          return
        }
      }

      // Normal flow: no pre-registered account found (or merge failed non-fatally)
      await updateMyProfile({ phone: fullPhone })
      await saveOnboardingStep('details')

      showToast('Teléfono guardado exitosamente', 'success')
      await new Promise(resolve => setTimeout(resolve, 50))

      if (role === 'doctor') {
        navigate('/onboarding/doctor')
      } else if (role === 'patient') {
        navigate('/onboarding/patient')
      } else {
        navigate('/onboarding/done')
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Error saving contact:', error)
      const isPhoneTaken =
        error?.code === '23505' ||
        (typeof error?.message === 'string' && error.message.includes('profiles_phone_unique'))
      if (isPhoneTaken) {
        setError('Este número de teléfono ya está registrado en otra cuenta.')
      } else {
        showToast(error.message || 'Error al guardar teléfono', 'error')
      }
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
