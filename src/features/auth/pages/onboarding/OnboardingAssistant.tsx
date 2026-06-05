import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCircle2, CheckCircle2, Clock, Mail } from 'lucide-react'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import Button from '@/shared/components/ui/Button'
import { getPendingInvitationsForMe, acceptInvitation, type DoctorAssistant } from '@/shared/lib/queries/assistants'
import { saveOnboardingStep } from '@/shared/lib/queries/profile'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const STEPS = ['Rol', 'Información', 'Contacto', 'Vinculación', 'Legal', 'Listo']

export default function OnboardingAssistant() {
  const navigate = useNavigate()
  const [invitations, setInvitations] = useState<DoctorAssistant[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())

  useEffect(() => {
    getPendingInvitationsForMe()
      .then(data => { setInvitations(data); setLoading(false) })
      .catch(err => { logger.error('OnboardingAssistant:load', err); setLoading(false) })
  }, [])

  const handleAccept = async (invite: DoctorAssistant) => {
    setAccepting(invite.id)
    const result = await acceptInvitation(invite.id)
    if (result.ok) {
      setAccepted(prev => new Set([...prev, invite.id]))
      showToast(`Vinculado con Dr. ${invite.doctor?.full_name ?? 'médico'}`, 'success')
    } else {
      showToast(result.error ?? 'Error al aceptar invitación', 'error')
    }
    setAccepting(null)
  }

  const handleContinue = async () => {
    try {
      await saveOnboardingStep('done')
      navigate('/onboarding/legal')
    } catch (err) {
      logger.error('OnboardingAssistant:continue', err)
      navigate('/onboarding/legal')
    }
  }

  return (
    <OnboardingLayout
      title="Vincula tu cuenta"
      description="Acepta la invitación del médico al que asistirás"
    >
      <Stepper currentStep={4} totalSteps={6} steps={STEPS} />

      <div className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          /* No pending invitations */
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <Mail size={32} className="text-amber-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-amber-800 mb-1">Sin invitaciones pendientes</p>
            <p className="text-xs text-amber-600 max-w-xs mx-auto">
              Pide al médico que te agregue desde su panel de <strong>Configuración → Asistentes</strong>. Una vez que lo haga, regresa aquí o inicia sesión de nuevo.
            </p>
          </div>
        ) : (
          /* Invitation list */
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {invitations.length === 1
                ? 'Tienes una invitación pendiente:'
                : `Tienes ${invitations.length} invitaciones pendientes:`}
            </p>
            {invitations.map(invite => {
              const isAccepted = accepted.has(invite.id)
              return (
                <div
                  key={invite.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-colors ${
                    isAccepted
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {invite.doctor?.avatar_url ? (
                      <img src={invite.doctor.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <UserCircle2 size={22} className="text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {invite.doctor?.full_name ?? 'Médico'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{invite.doctor?.email}</p>
                  </div>
                  {isAccepted ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                      <CheckCircle2 size={16} /> Aceptado
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleAccept(invite)}
                      disabled={accepting === invite.id}
                    >
                      {accepting === invite.id ? (
                        <Clock size={14} className="animate-spin" />
                      ) : 'Aceptar'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/onboarding/contact')}>
            Atrás
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleContinue}
            disabled={loading}
          >
            {accepted.size > 0 ? 'Continuar' : 'Continuar sin vincular'}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  )
}
