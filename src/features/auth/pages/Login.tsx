import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { useAuth } from '@/app/providers/AuthContext'
import { useCrypto } from '@/context/CryptoContext'

export default function Login() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { initializeCrypto } = useCrypto()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.includes('@')) {
      newErrors.email = 'Por favor ingresa un correo válido'
    }

    if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setErrors({})
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        let errorMessage = 'Error al iniciar sesión'

        if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Por favor confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Correo o contraseña incorrectos'
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Demasiados intentos. Por favor espera unos minutos e intenta de nuevo.'
        } else {
          errorMessage = error.message || 'Error al iniciar sesión'
        }

        showToast(errorMessage, 'error')
        setErrors({ general: errorMessage })
        return 
      }

      if (!data.user) {
        const errorMessage = 'Error inesperado: no se pudo completar el inicio de sesión'
        showToast(errorMessage, 'error')
        setErrors({ general: errorMessage })
        return 
      }

      // NOM-024 §6.6.3: check if user has TOTP enrolled (AAL2 required)
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal?.currentLevel === 'aal1') {
        // Redirect to MFA verification — pass password via router state for crypto init
        navigate('/auth/mfa', { state: { password, userId: data.user.id } })
        return
      }

      showToast('Inicio de sesión exitoso', 'success')
      // Initialize E2E encryption keys in memory (non-blocking — failure is safe)
      initializeCrypto(password, data.user.id).catch(() => {/* silently ignore */})
      navigate('/dashboard')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMessage = error?.message || 'Error inesperado al iniciar sesión. Por favor intenta de nuevo.'
      showToast(errorMessage, 'error')
      setErrors({ general: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="flex flex-col min-h-screen relative font-sans"
      style={{ backgroundImage: `url('/monterrey.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Back button */}
      <Link to="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/80 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium hidden sm:inline">Regresar</span>
      </Link>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <Link to="/" className="mb-4">
          <img src="/logograndenofondo.png" alt="HealthPal.mx" className="h-24 md:h-32 hover:opacity-80 transition-opacity" />
        </Link>
        <h1 className="text-white text-xl md:text-2xl mb-8 font-medium">Bienvenido a tu portal</h1>
        
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* General Error Display */}
            {errors.general && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 flex items-start gap-3 backdrop-blur-sm">
                <svg className="w-5 h-5 text-red-200 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-100">{errors.general}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrors({ ...errors, general: undefined })}
                  className="text-red-200 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Email Input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-white/70" />
                </div>
                <input 
                  type="email"
                  placeholder="Ingresa tu correo..."
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors({ ...errors, email: undefined })
                  }}
                  className={`w-full bg-white/20 border-0 rounded-full h-12 pl-12 pr-4 text-white placeholder:text-white/70 focus:ring-2 focus:ring-primary backdrop-blur-md outline-none transition-all ${errors.email ? 'ring-2 ring-red-400' : ''}`}
                />
              </div>
              {errors.email && <p className="text-red-300 text-xs mt-1.5 ml-4">{errors.email}</p>}
            </div>

            {/* Password Input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-white/70" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors({ ...errors, password: undefined })
                  }}
                  className={`w-full bg-white/20 border-0 rounded-full h-12 pl-12 pr-12 text-white placeholder:text-white/70 focus:ring-2 focus:ring-primary backdrop-blur-md outline-none transition-all ${errors.password ? 'ring-2 ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/70 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-300 text-xs mt-1.5 ml-4">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-12 mt-2 font-semibold text-base transition-colors disabled:opacity-70 flex justify-center items-center shadow-lg"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Ingresar'}
            </button>

            {/* Helpers Links */}
            <div className="flex justify-between items-center pt-2 pb-2 text-xs md:text-sm text-white font-semibold tracking-wide px-2">
              <Link to="/forgot" className="hover:text-gray-300 transition-colors">¿OLVIDASTE TU CONTRASEÑA?</Link>
              <Link to="/ayuda" className="hover:text-gray-300 transition-colors">AYUDA</Link>
            </div>
          </form>
          
          {/* Register Link */}
          <div className="mt-4 text-center text-sm text-white font-medium">
             ¿No tienes cuenta?{' '}
             <Link
               to="/register"
               className="text-primary hover:text-primary/80 font-bold ml-1 transition-colors"
             >
               Regístrate aquí
             </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col md:flex-row justify-between items-center p-6 md:px-12 md:py-8 text-white text-xs md:text-sm font-medium">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-4 md:mb-0">
          <Link to="/legal" className="hover:text-gray-300 transition-colors">AVISO LEGAL</Link>
          <Link to="/privacidad" className="hover:text-gray-300 transition-colors">AVISO DE PRIVACIDAD</Link>
          <Link to="/politicas" className="hover:text-gray-300 transition-colors">POLÍTICAS DE PRIVACIDAD</Link>
        </div>
        <div className="text-center">
          © {new Date().getFullYear()} <span className="text-primary">HealthPal.mx</span>. Todos los Derechos Reservados.
        </div>
      </footer>
    </div>
  )
}
