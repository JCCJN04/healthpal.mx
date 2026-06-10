/**
 * NOM-024-SSA3-2012 §6.6.3 — Autenticación multi-factor
 * Shown after successful password login when the user has TOTP enrolled.
 * Completes the AAL2 (Authenticator Assurance Level 2) challenge.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { useCrypto } from '@/context/CryptoContext'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

interface LocationState {
  password?: string
  userId?: string
}

export default function MfaVerify() {
  const navigate = useNavigate()
  const location = useLocation()
  const { initializeCrypto } = useCrypto()
  const state = (location.state as LocationState) ?? {}

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [loadingChallenge, setLoadingChallenge] = useState(true)

  const startChallenge = useCallback(async () => {
    setLoadingChallenge(true)
    setError(null)
    try {
      const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors()
      if (listErr) throw listErr

      const totp = factors?.totp?.[0]
      if (!totp) {
        // No TOTP enrolled — shouldn't reach this page; go to dashboard
        navigate('/dashboard', { replace: true })
        return
      }

      setFactorId(totp.id)

      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: totp.id,
      })
      if (challengeErr) throw challengeErr
      setChallengeId(challenge.id)
    } catch (err) {
      logger.error('MfaVerify:startChallenge', err)
      setError('No se pudo iniciar el desafío MFA. Por favor intenta de nuevo.')
    } finally {
      setLoadingChallenge(false)
    }
  }, [navigate])

  useEffect(() => {
    startChallenge()
  }, [startChallenge])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId || !challengeId) return
    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      })
      if (verifyErr) {
        if (verifyErr.message.includes('Invalid')) {
          setError('Código incorrecto. Verifica el código en tu app de autenticación.')
        } else {
          setError(verifyErr.message || 'Error al verificar el código')
        }
        return
      }

      // Initialize E2E crypto now that auth is complete
      if (state.password && data.user?.id) {
        initializeCrypto(state.password, data.user.id).catch(() => {/* safe to ignore */})
      }

      showToast('Verificación exitosa', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      logger.error('MfaVerify:verify', err)
      setError('Error inesperado. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col min-h-screen relative font-sans items-center justify-center px-4"
      style={{ backgroundImage: `url('/monterrey.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/60 z-0" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/logograndenofondo.png" alt="HealthPal.mx" className="h-20" />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6 text-[#33C7BE]" />
            <h1 className="text-xl font-bold text-gray-900">Verificación de dos pasos</h1>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Ingresa el código de 6 dígitos de tu app de autenticación.
          </p>

          {loadingChallenge ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#33C7BE]" />
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de verificación
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''))
                    setError(null)
                  }}
                  autoFocus
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border border-gray-200 rounded-lg outline-none focus:border-[#33C7BE] transition-colors"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-[#33C7BE] text-white rounded-lg h-12 font-semibold transition-colors hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar'}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
