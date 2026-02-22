import { useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { MailCheck, RefreshCw, ArrowLeft, HeartPulse } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import Button from '@/shared/components/ui/Button'

export default function VerifyEmail() {
  const location = useLocation()
  const email = (location.state as { email?: string })?.email

  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  // If user landed here without an email in state, send them to register
  if (!email) {
    return <Navigate to="/register" replace />
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding/role`,
        },
      })
      if (error) throw error
      setResent(true)
      showToast('Correo reenviado. Revisa tu bandeja de entrada.', 'success')
    } catch (err: any) {
      showToast(err.message || 'No se pudo reenviar el correo. Intenta más tarde.', 'error')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <HeartPulse className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-primary">
              HealthPal<span className="text-gray-400 font-normal">.mx</span>
            </span>
          </div>

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MailCheck className="w-8 h-8 text-primary" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verifica tu correo
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-1">
            Enviamos un enlace de confirmación a:
          </p>
          <p className="font-semibold text-gray-800 mb-6 break-all">{email}</p>

          <p className="text-gray-400 text-xs leading-relaxed mb-8">
            Haz clic en el enlace del correo para activar tu cuenta y continuar
            con el registro. Si no lo ves, revisa tu carpeta de spam.
          </p>

          {/* Resend button */}
          <Button
            variant="primary"
            fullWidth
            onClick={handleResend}
            disabled={resending || resent}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Reenviando...' : resent ? 'Correo reenviado ✓' : 'Reenviar correo'}
          </Button>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Volver al inicio de sesión
          </Link>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-gray-400 mt-4">
          ¿Problemas? Escríbenos a{' '}
          <a href="mailto:healthpalmx@gmail.com" className="text-primary hover:underline">
            healthpalmx@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}
