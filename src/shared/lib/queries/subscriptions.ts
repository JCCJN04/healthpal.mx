import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

export interface Subscription {
  id: string
  doctor_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  plan: string
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing'
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

/** Get the current doctor's subscription */
export async function getMySubscription(): Promise<Subscription | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('getMySubscription', error)
    return null
  }

  return data as Subscription | null
}

/** Create a Stripe Checkout session and return the URL */
export async function createCheckoutSession(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  // Stripe opens in a new tab; redirect to landing page after payment
  // (new tab has no session, so dashboard routes won't work)
  const origin = window.location.origin
  const res = await supabase.functions.invoke('create-checkout-session', {
    body: { returnUrl: `${origin}/?stripe=done` },
  })

  if (res.error) {
    logger.error('createCheckoutSession', res.error)
    throw new Error('Error al crear sesión de pago')
  }

  return res.data.url
}

/** Open the Stripe Customer Portal */
export async function createPortalSession(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const res = await supabase.functions.invoke('create-portal-session', {
    body: {},
  })

  if (res.error) {
    logger.error('createPortalSession', res.error)
    throw new Error('Error al abrir portal de facturación')
  }

  return res.data.url
}
