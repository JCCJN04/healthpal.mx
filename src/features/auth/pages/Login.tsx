import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import Checkbox from '@/shared/components/ui/Checkbox'
import Tabs from '@/shared/components/ui/Tabs'
import GoogleIcon from '@/features/auth/components/GoogleIcon'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'

type UserRole = 'doctor' | 'patient'

export default function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [loading, setLoading] = useState(false)

  const handleTabChange = (index: number) => {
    setRole(index === 0 ? 'doctor' : 'patient')
    // Clear form on role change
    setEmail('')
    setPassword('')
    setErrors({})
  }

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

    // Clear any previous errors
    setErrors({})
    
    setLoading(true)
    
    try {
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        let errorMessage = 'Error al iniciar sesión'
        
        // Mensajes de error más descriptivos
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
        return // setLoading(false) happens in finally
      }

      if (!data.user) {
        const errorMessage = 'Error inesperado: no se pudo completar el inicio de sesión'
        showToast(errorMessage, 'error')
        setErrors({ general: errorMessage })
        return // setLoading(false) happens in finally
      }

      // Success
      showToast('Inicio de sesión exitoso', 'success')
      navigate('/dashboard')
      
      // Note: setLoading will be false after navigation completes,
      // but we won't see it since we're leaving the page
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Error inesperado al iniciar sesión. Por favor intenta de nuevo.'
      showToast(errorMessage, 'error')
      setErrors({ general: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
      
      if (error) throw error
    } catch (error: any) {
      showToast(error.message || 'Error al iniciar sesión con Google', 'error')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo/Title */}
          <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-12">
            Healthpal.mx
          </h1>

          {/* Role Tabs */}
          <div className="flex justify-center mb-8">
            <Tabs
              options={['Doctor', 'Paciente']}
              selectedIndex={role === 'doctor' ? 0 : 1}
              onChange={handleTabChange}
            />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* General Error Display */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">Error de autenticación</p>
                  <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrors({ ...errors, general: undefined })}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Email Input */}
            <Input
              type="email"
              label="Correo Electronico"
              placeholder="paciente@ejemplo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: undefined })
              }}
              onClear={() => setEmail('')}
              error={errors.email}
              autoComplete="email"
            />

            {/* Password Input */}
            <Input
              type="password"
              label="Contraseña"
              placeholder="Contraseña123"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: undefined })
              }}
              onClear={() => setPassword('')}
              error={errors.password}
              autoComplete="current-password"
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <Checkbox
                label="Recordar Contraseña"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Link
                to="/forgot"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Olvide mis credenciales
              </Link>
            </div>

            {/* Submit Button */}
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'iniciar sesion'}
            </Button>

            {/* Google Login */}
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3"
            >
              <GoogleIcon />
              <span>Inicia Sesion con Google</span>
            </Button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-sm text-gray-600">
            No tienes cuenta?{' '}
            <Link
              to="/register"
              className="text-primary hover:text-primary-dark font-medium hover:underline"
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-[55%] relative">
        {/* TODO: Replace with actual image at /public/login-doctors.jpg */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/login-doctors.jpg')`,
            backgroundColor: '#f0f0f0' // Fallback color
          }}
        >
          {/* Placeholder overlay if image is missing */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
            <div className="text-center text-gray-600 p-8">
              <p className="text-lg font-medium">Imagen de doctores</p>
              <p className="text-sm mt-2">Agregar imagen en /public/login-doctors.jpg</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
