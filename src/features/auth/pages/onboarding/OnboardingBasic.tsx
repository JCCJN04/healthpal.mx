import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import { InputField, SelectField } from '@/shared/components/ui/FormField'
import Button from '@/shared/components/ui/Button'
import { getMyProfile, updateMyProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { validateCurp, normalizeCurp, INEGI_STATES } from '@/shared/lib/curp'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Legal', 'Listo']

export default function OnboardingBasic() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    primer_apellido: '',
    segundo_apellido: '',
    full_name: '',
    sex: '' as 'male' | 'female' | 'other' | 'unspecified' | '',
    birthdate: '',
    curp: '',
    estado_nacimiento: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const profile = await getMyProfile()
      setFormData({
        primer_apellido: profile.primer_apellido || '',
        segundo_apellido: profile.segundo_apellido || '',
        full_name: profile.full_name || '',
        sex: profile.sex || '',
        birthdate: profile.birthdate || '',
        curp: profile.curp || '',
        estado_nacimiento: profile.estado_nacimiento || '',
      })
    } catch (error) {
      logger.error('Error loading profile:', error)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.primer_apellido.trim()) {
      newErrors.primer_apellido = 'El primer apellido es requerido'
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre(s) es requerido'
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

    if (!formData.estado_nacimiento) {
      newErrors.estado_nacimiento = 'El estado de nacimiento es requerido'
    }

    // CURP is optional during onboarding (user may not have it at hand)
    // but must be valid if provided
    if (formData.curp.trim()) {
      const curpResult = validateCurp(formData.curp)
      if (!curpResult.valid) {
        newErrors.curp = curpResult.error!
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
      const normalizedCurp = normalizeCurp(formData.curp) ?? undefined

      // Compose full_name from apellidos + nombre for display purposes
      const fullName = [
        formData.primer_apellido.trim(),
        formData.segundo_apellido.trim(),
        formData.full_name.trim(),
      ]
        .filter(Boolean)
        .join(' ')

      await updateMyProfile({
        full_name: fullName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sex: formData.sex as any,
        birthdate: formData.birthdate,
        primer_apellido: formData.primer_apellido.trim() || null,
        segundo_apellido: formData.segundo_apellido.trim() || null,
        estado_nacimiento: formData.estado_nacimiento || null,
        curp: normalizedCurp ?? null,
      })
      await saveOnboardingStep('contact')

      showToast('Información guardada exitosamente', 'success')

      // Wait briefly for Supabase to process
      await new Promise(resolve => setTimeout(resolve, 50))

      navigate('/onboarding/contact')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Error saving basic info:', error)
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
      <Stepper currentStep={2} totalSteps={6} steps={STEPS} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Primer Apellido"
            type="text"
            required
            value={formData.primer_apellido}
            onChange={(e) => setFormData({ ...formData, primer_apellido: e.target.value })}
            error={errors.primer_apellido}
            placeholder="Ej: García"
          />
          <InputField
            label="Segundo Apellido"
            type="text"
            value={formData.segundo_apellido}
            onChange={(e) => setFormData({ ...formData, segundo_apellido: e.target.value })}
            error={errors.segundo_apellido}
            placeholder="Ej: López"
          />
        </div>

        <InputField
          label="Nombre(s)"
          type="text"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          error={errors.full_name}
          placeholder="Ej: Juan Carlos"
        />

        <SelectField
          label="Sexo"
          required
          value={formData.sex}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        <SelectField
          label="Estado de Nacimiento"
          required
          value={formData.estado_nacimiento}
          onChange={(e) => setFormData({ ...formData, estado_nacimiento: e.target.value })}
          error={errors.estado_nacimiento}
          options={INEGI_STATES.map(s => ({ value: s.code, label: s.name }))}
        />

        <InputField
          label="CURP (opcional)"
          type="text"
          value={formData.curp}
          onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
          error={errors.curp}
          placeholder="Ej: GARC850101HDFRZN09"
          maxLength={18}
          helperText="18 caracteres. Puedes completarla después en tu perfil."
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
