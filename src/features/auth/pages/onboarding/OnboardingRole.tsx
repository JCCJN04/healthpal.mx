import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import Button from '@/shared/components/ui/Button'
import { updateMyProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { User2, Stethoscope } from 'lucide-react'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Listo']

export default function OnboardingRole() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRole) {
      showToast('Por favor selecciona un rol', 'error')
      return
    }

    setLoading(true)
    try {
      await updateMyProfile({ role: selectedRole })
      
      await saveOnboardingStep('basic')
      
      showToast('Rol guardado exitosamente', 'success')
      
      // Wait briefly for Supabase to process (prevent abort signal)
      await new Promise(resolve => setTimeout(resolve, 50))
      
      navigate('/onboarding/basic')
    } catch (error: any) {
      logger.error('OnboardingRole.submit', error)
      const errorMessage = error?.message || error?.toString() || 'Error al guardar rol'
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingLayout
      title="¿Cómo quieres usar Healthpal?"
      description="Selecciona tu rol para personalizar tu experiencia"
    >
      <Stepper currentStep={1} totalSteps={5} steps={STEPS} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Patient Option */}
          <button
            type="button"
            onClick={() => setSelectedRole('patient')}
            className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
              selectedRole === 'patient'
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-gray-200 hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  selectedRole === 'patient'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <User2 size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Soy Paciente
              </h3>
              <p className="text-sm text-gray-600">
                Quiero gestionar mi salud y conectar con doctores
              </p>
            </div>
          </button>

          {/* Doctor Option */}
          <button
            type="button"
            onClick={() => setSelectedRole('doctor')}
            className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
              selectedRole === 'doctor'
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-gray-200 hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  selectedRole === 'doctor'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Stethoscope size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Soy Doctor
              </h3>
              <p className="text-sm text-gray-600">
                Quiero atender pacientes y gestionar consultas
              </p>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedRole || loading}
          >
            {loading ? 'Guardando...' : 'Continuar'}
          </Button>
        </div>
      </form>
    </OnboardingLayout>
  )
}
