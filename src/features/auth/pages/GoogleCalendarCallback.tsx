import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { logger } from '@/shared/lib/logger'

type Status = 'loading' | 'success' | 'error'

const INVOKE_TIMEOUT_MS = 15_000

/**
 * Read the Supabase access token directly from localStorage, bypassing
 * supabase.auth.getSession() which can deadlock when the URL contains
 * ?code= (Supabase's internal lock waits for a PKCE exchange that never
 * completes for a Google OAuth code).
 */
function getStoredAccessToken(): string | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { access_token?: string }
    return parsed?.access_token ?? null
  } catch {
    return null
  }
}

export default function GoogleCalendarCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true
    handleCallback()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const errorParam = params.get('error')

    // User denied access
    if (errorParam) {
      setStatus('error')
      setErrorMsg('Acceso denegado a Google Calendar')
      setTimeout(() => navigate('/dashboard/configuracion'), 3000)
      return
    }

    // Validate state to prevent CSRF
    const savedState = sessionStorage.getItem('google_oauth_state')
    const verifier = sessionStorage.getItem('google_oauth_verifier')
    sessionStorage.removeItem('google_oauth_state')
    sessionStorage.removeItem('google_oauth_verifier')

    if (!code || !state || state !== savedState || !verifier) {
      setStatus('error')
      setErrorMsg('Parámetros de autenticación inválidos')
      setTimeout(() => navigate('/dashboard/configuracion'), 3000)
      return
    }

    try {
      // Read token directly from localStorage — avoids supabase.auth.getSession()
      // which deadlocks when ?code= is present in the URL (internal PKCE lock).
      const accessToken = getStoredAccessToken()
      if (!accessToken) throw new Error('No hay sesión activa')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), INVOKE_TIMEOUT_MS)

      let res: Response
      try {
        res = await fetch(
          `${supabaseUrl}/functions/v1/google-calendar-auth`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': anonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              verifier,
              redirectUri: `${window.location.origin}/auth/gcal/callback`,
            }),
            signal: abortController.signal,
          }
        )
      } finally {
        clearTimeout(timeoutId)
      }

      if (abortController.signal.aborted) {
        throw new Error('Tiempo de espera agotado al conectar Google Calendar')
      }

      const fnData = await res.json() as { success?: boolean; error?: string }

      if (!res.ok || !fnData?.success) {
        throw new Error(fnData?.error ?? `Error del servidor (${res.status})`)
      }

      setStatus('success')
      setTimeout(() => navigate('/dashboard/configuracion'), 2000)
    } catch (err: unknown) {
      logger.error('GoogleCalendarCallback', err)
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado')
      setTimeout(() => navigate('/dashboard/configuracion'), 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-[#33C7BE] animate-spin mx-auto" />
            <p className="text-gray-700 font-semibold">Conectando Google Calendar...</p>
            <p className="text-sm text-gray-500">Esto tomará un momento</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-gray-900 font-semibold">¡Google Calendar conectado!</p>
            <p className="text-sm text-gray-500">Redirigiendo a configuración...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-gray-900 font-semibold">Error al conectar</p>
            <p className="text-sm text-red-600">{errorMsg}</p>
            <p className="text-sm text-gray-500">Redirigiendo a configuración...</p>
          </>
        )}
      </div>
    </div>
  )
}
