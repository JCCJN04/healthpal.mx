import { useState, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { User, Lock, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import { useCrypto } from '@/context/CryptoContext'

type UserRole = 'doctor' | 'patient'

interface FormErrors {
  general?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setupCrypto } = useCrypto()
  const initialRole = (location.state as { role?: string })?.role === 'doctor' ? 'doctor' : 'patient'
  const [role, setRole] = useState<UserRole>(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!email.includes('@')) {
      newErrors.email = 'Por favor ingresa un correo válido'
    }

    if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Por favor confirma tu contraseña'
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/onboarding/role`,
        },
      })

      if (error) {
        if (error.message.includes('rate limit')) {
          setErrors({ general: 'Límite de registros alcanzado. Por favor contacta al administrador o intenta más tarde.' })
        } else if (error.message.includes('already registered')) {
          setErrors({ general: 'Este correo ya está registrado. Intenta iniciar sesión.' })
        } else {
          setErrors({ general: error.message || 'Error al registrarse' })
        }
        setLoading(false)
        return
      }

      if (data.user) {
        if (data.session) {
          showToast('Registro exitoso. Redirigiendo...', 'success')
          // Set up E2E encryption keypair for new user (non-blocking — failure is safe)
          setupCrypto(password, data.user.id).catch(() => {/* silently ignore */})
          navigate('/onboarding/role')
        } else {
          navigate('/verify-email', { state: { email }, replace: true })
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('register', error)
      setErrors({ general: 'Error inesperado al registrarse. Por favor intenta de nuevo.' })
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
        <h1 className="text-white text-xl md:text-2xl mb-6 font-medium">Crear cuenta en tu portal</h1>
        
        <div className="w-full max-w-sm">
          {/* Custom Role Selector for new design */}
          <div className="flex bg-black/30 rounded-full p-1 mb-6 backdrop-blur-sm gap-1">
            <button
              onClick={() => setRole('doctor')}
              type="button"
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${
                role === 'doctor' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Soy Doctor
            </button>
            <button
              onClick={() => setRole('patient')}
              type="button"
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${
                role === 'patient' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Soy Paciente
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* General Error */}
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
                  placeholder="Correo electrónico..."
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors({ ...errors, email: undefined })
                  }}
                  className={`w-full bg-white/20 border-0 rounded-full h-14 pl-12 pr-4 text-white placeholder:text-white/70 focus:ring-2 focus:ring-primary backdrop-blur-md outline-none transition-all ${errors.email ? 'ring-2 ring-red-400' : ''}`}
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
                  placeholder="Contraseña..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors({ ...errors, password: undefined })
                  }}
                  className={`w-full bg-white/20 border-0 rounded-full h-14 pl-12 pr-12 text-white placeholder:text-white/70 focus:ring-2 focus:ring-primary backdrop-blur-md outline-none transition-all ${errors.password ? 'ring-2 ring-red-400' : ''}`}
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

            {/* Confirm Password Input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <CheckCircle className="w-5 h-5 text-white/70" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirmar contraseña..."
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined })
                  }}
                  className={`w-full bg-white/20 border-0 rounded-full h-14 pl-12 pr-12 text-white placeholder:text-white/70 focus:ring-2 focus:ring-primary backdrop-blur-md outline-none transition-all ${errors.confirmPassword ? 'ring-2 ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/70 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-300 text-xs mt-1.5 ml-4">{errors.confirmPassword}</p>}
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
              ) : 'Crear cuenta'}
            </button>
          </form>
          
          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-white font-medium">
             ¿Ya tienes una cuenta?{' '}
             <Link
               to="/login"
               className="text-primary hover:text-primary/80 font-bold ml-1 transition-colors"
             >
               Inicia sesión
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
