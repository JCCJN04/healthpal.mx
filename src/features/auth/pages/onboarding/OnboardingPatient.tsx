import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import { SelectField } from '@/shared/components/ui/FormField'
import Button from '@/shared/components/ui/Button'
import { getMyProfile, getPatientProfile, upsertPatientProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { getMyInsurances, upsertInsurance, INSURANCE_PROVIDERS, HOLDER_RELATIONSHIPS } from '@/shared/lib/queries/insurance'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Legal', 'Listo']

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

const INSURANCE_OPTIONS = [
  { value: '', label: 'Sin seguro / No especificado' },
  ...INSURANCE_PROVIDERS.map((p) => ({ value: p, label: p })),
]

export default function OnboardingPatient() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [insurance, setInsurance] = useState({
    provider_name: '',
    provider_other: '',
    policy_number: '',
    holder_name: '',
    holder_relationship: 'self',
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
        setBloodType(patientProfile.blood_type || '')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prov = (patientProfile as any).insurance_provider as string | null
        if (prov) {
          const isKnown = INSURANCE_PROVIDERS.includes(prov as typeof INSURANCE_PROVIDERS[number])
          setInsurance(prev => ({
            ...prev,
            provider_name: isKnown ? prov : 'Otro',
            provider_other: isKnown ? '' : prov,
          }))
        }
      }

      // Load existing insurance record
      const existingInsurances = await getMyInsurances(profile.id)
      if (existingInsurances.length > 0) {
        const primary = existingInsurances[0]
        setInsurance({
          provider_name: primary.provider_name,
          provider_other: primary.provider_other || '',
          policy_number: primary.policy_number || '',
          holder_name: primary.holder_name || '',
          holder_relationship: primary.holder_relationship || 'self',
        })
      }
    } catch (error) {
      logger.error('OnboardingPatient.loadProfile', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Save blood type to patient_profiles
      await upsertPatientProfile(userId, {
        blood_type: bloodType || null,
        insurance_provider: insurance.provider_name === 'Otro'
          ? (insurance.provider_other || null)
          : (insurance.provider_name || null),
      })

      // Save insurance details to patient_insurances if provider selected
      if (insurance.provider_name) {
        await upsertInsurance(userId, {
          provider_name: insurance.provider_name,
          provider_other: insurance.provider_name === 'Otro' ? insurance.provider_other || null : null,
          policy_number: insurance.policy_number || null,
          holder_name: insurance.holder_name || null,
          holder_relationship: insurance.holder_relationship,
          is_primary: true,
        })
      }

      await saveOnboardingStep('done')
      showToast('Perfil de paciente guardado', 'success')
      await new Promise(resolve => setTimeout(resolve, 50))
      navigate('/onboarding/legal')
    } catch (error: unknown) {
      logger.error('OnboardingPatient.submit', error)
      showToast((error as Error).message || 'Error al guardar perfil', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showInsuranceDetails = !!insurance.provider_name

  return (
    <OnboardingLayout
      title="Información de Salud"
      description="Datos importantes para tu atención médica"
    >
      <Stepper currentStep={4} totalSteps={6} steps={STEPS} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6 text-sm text-blue-800 leading-relaxed shadow-sm">
          <strong>Privacidad y Cifrado Activo:</strong><br />Tus campos paramétricos sensibles (como alergias y condiciones) se configurarán de forma encriptada (<span className="opacity-90">End-to-End</span>) en tu primera consulta con tu médico autorizado.
        </div>

        <SelectField
          label="Tipo de Sangre"
          value={bloodType}
          onChange={(e) => setBloodType(e.target.value)}
          options={BLOOD_TYPES}
          helpText="Opcional - Importante para emergencias"
        />

        {/* Insurance */}
        <div className="space-y-4">
          <SelectField
            label="Seguro médico"
            value={insurance.provider_name}
            onChange={(e) => setInsurance(prev => ({ ...prev, provider_name: e.target.value }))}
            options={INSURANCE_OPTIONS}
            helpText="Opcional - Facilita la gestión de coberturas con tu médico"
          />

          {insurance.provider_name === 'Otro' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de tu aseguradora</label>
              <input
                type="text"
                value={insurance.provider_other}
                onChange={(e) => setInsurance(prev => ({ ...prev, provider_other: e.target.value }))}
                placeholder="Nombre de la aseguradora"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]"
              />
            </div>
          )}

          {showInsuranceDetails && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalles del seguro (opcional)</p>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Número de póliza</label>
                <input
                  type="text"
                  value={insurance.policy_number}
                  onChange={(e) => setInsurance(prev => ({ ...prev, policy_number: e.target.value }))}
                  placeholder="Ej: GNP-12345678"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del titular</label>
                <input
                  type="text"
                  value={insurance.holder_name}
                  onChange={(e) => setInsurance(prev => ({ ...prev, holder_name: e.target.value }))}
                  placeholder="Nombre completo del titular"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Relación con el titular</label>
                <select
                  value={insurance.holder_relationship}
                  onChange={(e) => setInsurance(prev => ({ ...prev, holder_relationship: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]"
                >
                  {HOLDER_RELATIONSHIPS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

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
