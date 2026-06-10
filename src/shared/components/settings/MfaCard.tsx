/**
 * NOM-024-SSA3-2012 §6.6.3 — Autenticación multi-factor (TOTP)
 * Allows users (especially doctors) to enroll / unenroll TOTP MFA.
 * Uses Supabase native TOTP — no third-party library required.
 * The totp.qr_code returned by enroll() is a data URI (SVG).
 */
import { useState, useEffect, useCallback } from 'react'
import { Shield, ShieldCheck, ShieldOff, Loader2, AlertCircle, CheckCircle, Smartphone, Copy, Check } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

interface TotpFactor {
  id: string
  friendly_name?: string
  status: 'verified' | 'unverified'
}

export default function MfaCard() {
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [loadingFactors, setLoadingFactors] = useState(true)

  // Enrollment state
  const [enrolling, setEnrolling] = useState(false)
  const [qrUri, setQrUri] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  // Unenroll state
  const [unenrolling, setUnenrolling] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  const handleCopySecret = async () => {
    if (!secret) return
    await navigator.clipboard.writeText(secret)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  const loadFactors = useCallback(async () => {
    setLoadingFactors(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      setFactors((data?.totp ?? []) as TotpFactor[])
    } catch (err) {
      logger.error('MfaCard:loadFactors', err)
    } finally {
      setLoadingFactors(false)
    }
  }, [])

  useEffect(() => {
    loadFactors()
  }, [loadFactors])

  const handleStartEnroll = async () => {
    setEnrolling(true)
    setVerifyError(null)
    setVerifyCode('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'App de autenticación',
      })
      if (error) throw error
      setQrUri(data.totp.qr_code)
      setSecret(data.totp.secret)
      setPendingFactorId(data.id)
    } catch (err) {
      logger.error('MfaCard:enroll', err)
      showToast('No se pudo iniciar la configuración de MFA', 'error')
      setEnrolling(false)
    }
  }

  const handleVerifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingFactorId || verifyCode.length !== 6) {
      setVerifyError('El código debe tener 6 dígitos')
      return
    }

    setVerifying(true)
    setVerifyError(null)

    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: pendingFactorId,
      })
      if (challengeErr) throw challengeErr

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: challenge.id,
        code: verifyCode,
      })
      if (verifyErr) {
        setVerifyError('Código incorrecto. Verifica el código en tu app de autenticación.')
        return
      }

      showToast('MFA activado correctamente', 'success')
      setEnrolling(false)
      setQrUri(null)
      setSecret(null)
      setPendingFactorId(null)
      setVerifyCode('')
      await loadFactors()
    } catch (err) {
      logger.error('MfaCard:verifyEnroll', err)
      setVerifyError('Error al verificar. Intenta de nuevo.')
    } finally {
      setVerifying(false)
    }
  }

  const handleCancelEnroll = async () => {
    if (pendingFactorId) {
      // Clean up unverified factor
      await supabase.auth.mfa.unenroll({ factorId: pendingFactorId }).catch(() => {/* ignore */})
    }
    setEnrolling(false)
    setQrUri(null)
    setSecret(null)
    setPendingFactorId(null)
    setVerifyCode('')
    setVerifyError(null)
  }

  const handleUnenroll = async (factorId: string) => {
    setUnenrolling(factorId)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error
      showToast('MFA desactivado', 'success')
      await loadFactors()
    } catch (err) {
      logger.error('MfaCard:unenroll', err)
      showToast('No se pudo desactivar MFA', 'error')
    } finally {
      setUnenrolling(null)
    }
  }

  const verifiedFactors = factors.filter(f => f.status === 'verified')
  const isMfaActive = verifiedFactors.length > 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {isMfaActive
            ? <ShieldCheck className="w-5 h-5 text-green-500" />
            : <Shield className="w-5 h-5 text-[#33C7BE]" />
          }
          <h3 className="text-lg font-bold text-gray-900">Verificación en dos pasos</h3>
          {isMfaActive && (
            <span className="ml-auto text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Activa
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Agrega una capa extra de seguridad a tu cuenta médica.
        </p>
      </div>

      <div className="p-6">
        {loadingFactors ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !enrolling ? (
          <div className="space-y-4">
            {isMfaActive ? (
              <div className="space-y-3">
                {verifiedFactors.map(factor => (
                  <div key={factor.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {factor.friendly_name || 'App de autenticación'}
                        </p>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verificada
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnenroll(factor.id)}
                      disabled={unenrolling === factor.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {unenrolling === factor.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <ShieldOff className="w-4 h-4" />
                      }
                      Desactivar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>MFA no activada.</strong> Recomendado para profesionales de salud.
                Protege el acceso a información clínica de tus pacientes.
              </div>
            )}

            {!isMfaActive && (
              <button
                onClick={handleStartEnroll}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
              >
                Activar verificación en dos pasos
              </button>
            )}
          </div>
        ) : (
          /* Enrollment flow */
          <div className="space-y-5">
            {qrUri ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Paso 1 — Escanea el código QR</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Abre Google Authenticator, Authy u otra app TOTP y escanea el código.
                  </p>

                  {/* QR code — larger, centered, clean white background */}
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm inline-block">
                      <img
                        src={qrUri}
                        alt="Código QR para autenticación MFA"
                        className="w-52 h-52 block"
                      />
                    </div>
                  </div>

                  {/* Manual secret — copyable */}
                  {secret && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          ¿Sin cámara? Copia la clave
                        </span>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                          style={secretCopied
                            ? { background: '#dcfce7', color: '#16a34a' }
                            : { background: '#f1f5f9', color: '#475569' }
                          }
                        >
                          {secretCopied
                            ? <><Check className="w-3.5 h-3.5" /> Copiado</>
                            : <><Copy className="w-3.5 h-3.5" /> Copiar</>
                          }
                        </button>
                      </div>
                      <div className="px-4 py-3 bg-white">
                        <code className="text-sm font-mono text-gray-800 tracking-widest break-all select-all">
                          {secret}
                        </code>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleVerifyEnroll} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                      Paso 2 — Ingresa el código de 6 dígitos
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => {
                        setVerifyCode(e.target.value.replace(/\D/g, ''))
                        setVerifyError(null)
                      }}
                      className="w-full px-4 py-3 text-center text-xl font-mono tracking-[0.4em] border border-gray-200 rounded-lg outline-none focus:border-[#33C7BE] transition-colors"
                      placeholder="000000"
                      autoFocus
                    />
                    {verifyError && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {verifyError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEnroll}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={verifying || verifyCode.length !== 6}
                      className="flex-1 px-4 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar y activar'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex justify-center py-6">
                <Loader2 className="w-8 h-8 animate-spin text-[#33C7BE]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
