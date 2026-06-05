import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import Button from '@/shared/components/ui/Button'
import { completeOnboarding } from '@/shared/lib/queries/profile'
import { useAuth } from '@/app/providers/AuthContext'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { CheckCircle } from 'lucide-react'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Legal', 'Listo']

export default function OnboardingDone() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { refreshProfile } = useAuth()

  const handleComplete = async () => {
    setLoading(true)

    try {
      await completeOnboarding()
      await refreshProfile()
      showToast('¡Perfil completado exitosamente!', 'success')
      
      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))
      
      navigate('/dashboard')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Error completing onboarding:', error)
      showToast(error.message || 'Error al completar onboarding', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingLayout
      title="¡Todo Listo!"
      description="Tu perfil ha sido configurado exitosamente"
    >
      <Stepper currentStep={6} totalSteps={6} steps={STEPS} />

      <div className="text-center py-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          ¡Bienvenido a HealthPal!
        </h3>

        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Tu perfil está listo. Ya puedes empezar a usar la plataforma.
        </p>

        {/* Features List */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
          <h4 className="font-semibold text-gray-900 mb-3">Ahora puedes:</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>Subir y gestionar tus documentos médicos</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>Compartir documentos de forma segura</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>Buscar y conectar con médicos o pacientes</span>
            </li>
          </ul>
        </div>

        {/* Complete Button */}
        <Button
          variant="primary"
          onClick={handleComplete}
          disabled={loading}
          className="px-12"
        >
          {loading ? 'Completando...' : 'Ir al Dashboard'}
        </Button>
      </div>
    </OnboardingLayout>
  )
}
