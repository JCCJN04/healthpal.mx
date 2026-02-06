import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '../../components/Stepper'
import Button from '../../components/Button'
import { completeOnboarding } from '../../lib/queries/profile'
import { showToast } from '../../components/Toast'
import { CheckCircle } from 'lucide-react'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Listo']

export default function OnboardingDone() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    setLoading(true)

    try {
      await completeOnboarding()
      showToast('¡Perfil completado exitosamente!', 'success')
      
      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))
      
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
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
      <Stepper currentStep={5} totalSteps={5} steps={STEPS} />

      <div className="text-center py-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          ¡Bienvenido a Healthpal!
        </h3>

        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Has completado tu perfil exitosamente. Ahora puedes acceder a todas las funciones de la plataforma.
        </p>

        {/* Features List */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
          <h4 className="font-semibold text-gray-900 mb-3">Ahora puedes:</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>Gestionar tus documentos médicos</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>Programar y administrar consultas</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>Comunicarte con tu equipo médico</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>Ver tu calendario de citas</span>
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
