import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, AlertTriangle, Loader2, ExternalLink, Crown } from 'lucide-react'
import {
  getMySubscription,
  createCheckoutSession,
  createPortalSession,
  type Subscription,
} from '@/shared/lib/queries/subscriptions'
import { logger } from '@/shared/lib/logger'

interface SubscriptionCardProps {
  onToast: (message: string, type: 'success' | 'error') => void
}

const PLAN_FEATURES = [
  'Gestión de pacientes',
  'Agenda y calendario',
  'Expediente clínico completo',
  'Recetas y prescripciones',
  'Documentos y archivos ilimitados',
  'Perfil público en directorio',
  'Mensajes con pacientes',
  'Notas clínicas con IA',
  'Llenado automático de consultas',
]

export default function SubscriptionCard({ onToast }: SubscriptionCardProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    getMySubscription()
      .then(setSubscription)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async () => {
    try {
      setActionLoading(true)
      const url = await createCheckoutSession()
      // Open Stripe in new tab — keeps current session alive
      const stripeWindow = window.open(url, '_blank')
      // Poll for subscription completion while Stripe tab is open
      const pollInterval = setInterval(async () => {
        try {
          const sub = await getMySubscription()
          if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
            clearInterval(pollInterval)
            setSubscription(sub)
            setActionLoading(false)
            onToast('¡Suscripción activada exitosamente!', 'success')
            if (stripeWindow && !stripeWindow.closed) stripeWindow.close()
          }
        } catch {
          /* keep polling */
        }
      }, 3000)
      // Stop polling after 10 minutes or if window closed without subscription
      setTimeout(() => {
        clearInterval(pollInterval)
        setActionLoading(false)
      }, 600000)
      // Also stop when Stripe window closes
      const checkClosed = setInterval(() => {
        if (stripeWindow && stripeWindow.closed) {
          clearInterval(checkClosed)
          // Give webhook a moment to process, then check once more
          setTimeout(async () => {
            const sub = await getMySubscription()
            if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
              setSubscription(sub)
              onToast('¡Suscripción activada exitosamente!', 'success')
            }
            clearInterval(pollInterval)
            setActionLoading(false)
          }, 3000)
        }
      }, 1000)
    } catch (err) {
      logger.error('SubscriptionCard:subscribe', err)
      onToast('Error al iniciar el pago. Intenta nuevamente.', 'error')
      setActionLoading(false)
    }
  }

  const handleManage = async () => {
    try {
      setActionLoading(true)
      const url = await createPortalSession()
      window.open(url, '_blank')
      setActionLoading(false)
    } catch (err) {
      logger.error('SubscriptionCard:manage', err)
      onToast('Error al abrir portal de facturación. Intenta nuevamente.', 'error')
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isPastDue = subscription?.status === 'past_due'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className={`px-6 py-4 ${isActive ? 'bg-gradient-to-r from-[#33C7BE]/10 to-[#33C7BE]/5' : 'bg-gradient-to-r from-gray-50 to-white'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-[#33C7BE]/20' : 'bg-gray-100'}`}
            >
              <Crown className={`w-5 h-5 ${isActive ? 'text-[#33C7BE]' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Suscripción</h3>
              <p className="text-xs text-gray-500">Plan HealthPal Pro</p>
            </div>
          </div>
          {isActive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
              <CheckCircle className="w-3.5 h-3.5" />
              Activa
            </span>
          )}
          {isPastDue && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle className="w-3.5 h-3.5" />
              Pago pendiente
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {isActive ? (
          /* Active subscription view */
          <div className="space-y-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">$549</span>
              <span className="text-sm text-gray-500">MXN +IVA /mes</span>
            </div>

            {subscription?.current_period_end && (
              <p className="text-sm text-gray-500">
                {subscription.cancel_at_period_end
                  ? `Tu plan se cancela el ${new Date(subscription.current_period_end).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : `Próxima facturación: ${new Date(subscription.current_period_end).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </p>
            )}

            <button
              onClick={handleManage}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Administrar suscripción
            </button>
          </div>
        ) : (
          /* No subscription / inactive view */
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">$549</span>
                <span className="text-sm text-gray-500">MXN +IVA /mes</span>
              </div>
              <p className="text-sm text-gray-500">Acceso completo a todas las herramientas</p>
            </div>

            {/* Features list */}
            <ul className="space-y-2.5">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-[#33C7BE] flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={actionLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#33C7BE] text-white text-sm font-bold rounded-xl hover:bg-[#2ab5ac] transition-colors disabled:opacity-50 shadow-sm"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Suscribirme
                </>
              )}
            </button>

            {isPastDue && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-medium">
                  Tu último pago no se procesó. Actualiza tu método de pago para reactivar tu
                  cuenta.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
