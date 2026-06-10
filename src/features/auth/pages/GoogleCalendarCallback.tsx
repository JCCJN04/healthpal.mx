import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

type Status = 'loading' | 'success' | 'error'

const INVOKE_TIMEOUT_MS = 15_000

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
      // Call Edge Function to exchange code for tokens
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No hay sesión activa')

      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), INVOKE_TIMEOUT_MS)

      let fnData: { success?: boolean; error?: string } | null = null
      let fnError: Error | null = null
      try {
        const result = await supabase.functions.invoke(
          'google-calendar-auth',
          {
            body: {
              code,
              verifier,
              redirectUri: `${window.location.origin}/auth/gcal/callback`,
            },
            signal: abortController.signal,
          }
        )
        fnData = result.data
        fnError = result.error
      } finally {
        clearTimeout(timeoutId)
      }

      if (abortController.signal.aborted) {
        throw new Error('Tiempo de espera agotado al conectar Google Calendar')
      }

      if (fnError || !fnData?.success) {
        throw new Error(fnData?.error ?? fnError?.message ?? 'Error al conectar Google Calendar')
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
