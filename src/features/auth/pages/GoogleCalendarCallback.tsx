import { useEffect, useRef, useState } from 'react'
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

type Status = 'loading' | 'success' | 'error'

const INVOKE_TIMEOUT_MS = 15_000

function getStoredItem(key: string): string | null {
  return sessionStorage.getItem(key) || localStorage.getItem(key) || null
}

function removeStoredItem(key: string): void {
  sessionStorage.removeItem(key)
  localStorage.removeItem(key)
}

export default function GoogleCalendarCallback() {
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [debugStep, setDebugStep] = useState('Iniciando vinculación...')
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      setDebugStep('Leyendo parámetros de autenticación...')

      // Try reading params captured by index.html script or from current URL
      const urlParams = new URLSearchParams(window.location.search)
      const code = getStoredItem('hp_gcal_code') || urlParams.get('code')
      const state = getStoredItem('hp_gcal_state') || urlParams.get('state')
      const errorParam = getStoredItem('hp_gcal_error') || urlParams.get('error')

      // Clean up intercepted params from storage
      removeStoredItem('hp_gcal_code')
      removeStoredItem('hp_gcal_state')
      removeStoredItem('hp_gcal_error')

      // User denied access
      if (errorParam) {
        setStatus('error')
        setErrorMsg('Acceso denegado a Google Calendar en la pantalla de consentimiento.')
        setTimeout(() => {
          window.location.replace('/dashboard/configuracion')
        }, 3000)
        return
      }

      setDebugStep('Validando estado de seguridad...')
      const savedState = getStoredItem('google_oauth_state')
      const verifier = getStoredItem('google_oauth_verifier')
      const savedRedirectUri = getStoredItem('google_oauth_redirect_uri')
      const savedAccessToken = getStoredItem('google_oauth_access_token')

      // Clean up OAuth initiation state
      removeStoredItem('google_oauth_state')
      removeStoredItem('google_oauth_verifier')
      removeStoredItem('google_oauth_redirect_uri')
      removeStoredItem('google_oauth_access_token')

      if (!code || !state || !verifier) {
        setStatus('error')
        setErrorMsg(
          `Parámetros incompletos de Google: code=${!!code}, state=${!!state}, verifier=${!!verifier}`,
        )
        setTimeout(() => {
          window.location.replace('/dashboard/configuracion')
        }, 4000)
        return
      }

      if (savedState && state !== savedState) {
        setStatus('error')
        setErrorMsg('El estado de seguridad de Google no coincide (CSRF protection).')
        setTimeout(() => {
          window.location.replace('/dashboard/configuracion')
        }, 4000)
        return
      }

      setDebugStep('Verificando sesión activa...')
      // Get valid access token for Edge Function authorization
      let accessToken = savedAccessToken
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.access_token) {
          accessToken = data.session.access_token
        }
      } catch (sessionErr) {
        logger.warn('GoogleCalendarCallback:getSession', sessionErr)
      }

      if (!accessToken) {
        throw new Error('No hay sesión activa de usuario. Por favor inicia sesión nuevamente.')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
      const redirectUri = savedRedirectUri || `${window.location.origin}/auth/gcal/callback`

      setDebugStep('Guardando vinculación en el servidor...')
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), INVOKE_TIMEOUT_MS)

      let res: Response
      try {
        res = await fetch(`${supabaseUrl}/functions/v1/google-calendar-auth`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            verifier,
            redirectUri,
          }),
          signal: abortController.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (abortController.signal.aborted) {
        throw new Error('Tiempo de espera agotado al conectar Google Calendar.')
      }

      const fnData = (await res.json().catch(() => null)) as {
        success?: boolean
        error?: string
      } | null

      if (!res.ok || !fnData?.success) {
        throw new Error(fnData?.error ?? `Error del servidor al vincular cuenta (${res.status})`)
      }

      setStatus('success')
      setDebugStep('¡Listo!')
      setTimeout(() => {
        window.location.replace('/dashboard/configuracion')
      }, 1500)
    } catch (err: unknown) {
      logger.error('GoogleCalendarCallback', err)
      setStatus('error')
      setErrorMsg(
        err instanceof Error ? err.message : 'Error inesperado al conectar Google Calendar',
      )
      setTimeout(() => {
        window.location.replace('/dashboard/configuracion')
      }, 5000)
    }
  }

  const handleReturnNow = () => {
    window.location.replace('/dashboard/configuracion')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10 max-w-md w-full text-center space-y-5 border border-gray-100">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-[#33C7BE] animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Conectando Google Calendar...</h2>
            <p className="text-sm text-gray-500">{debugStep}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">¡Google Calendar conectado!</h2>
            <p className="text-sm text-gray-500">
              Tus citas se sincronizarán automáticamente. Redirigiendo a tu configuración...
            </p>
            <button
              onClick={handleReturnNow}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-[#2ab5ac] transition-colors"
            >
              Ir a Configuración ahora
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <XCircle className="w-14 h-14 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">No se pudo vincular</h2>
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3 text-left">{errorMsg}</p>
            <p className="text-xs text-gray-400">
              Redirigiendo a configuración en unos segundos...
            </p>
            <button
              onClick={handleReturnNow}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Configuración
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
