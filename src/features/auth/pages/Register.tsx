import { useState, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import Tabs from '@/shared/components/ui/Tabs'
import GoogleIcon from '@/features/auth/components/GoogleIcon'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

type UserRole = 'doctor' | 'patient'

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
}

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialRole = (location.state as { role?: string })?.role === 'doctor' ? 'doctor' : 'patient'
  const [role, setRole] = useState<UserRole>(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  const handleTabChange = (index: number) => {
    setRole(index === 0 ? 'doctor' : 'patient')
    // Clear form on role change
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setErrors({})
  }

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
        // Mensajes de error más descriptivos
        if (error.message.includes('rate limit')) {
          showToast('Límite de registros alcanzado. Por favor contacta al administrador o intenta más tarde.', 'error')
        } else if (error.message.includes('already registered')) {
          showToast('Este correo ya está registrado. Intenta iniciar sesión.', 'error')
        } else {
          showToast(error.message || 'Error al registrarse', 'error')
        }
        setLoading(false)
        return
      }

      if (data.user) {
        if (data.session) {
          // Supabase devolvió sesión → auto-confirm activo (dev) → onboarding directo
          showToast('Registro exitoso. Redirigiendo...', 'success')
          navigate('/onboarding/role')
        } else {
          // session = null → Supabase requiere confirmación de email
          navigate('/verify-email', { state: { email }, replace: true })
        }
      }
    } catch (error: any) {
      logger.error('register', error)
      showToast('Error inesperado al registrarse. Por favor intenta de nuevo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding/role`,
        },
      })
      
      if (error) throw error
    } catch (error: any) {
      showToast(error.message || 'Error al registrarse con Google', 'error')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Register Form */}
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

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
              autoComplete="new-password"
            />

            {/* Confirm Password Input */}
            <Input
              type="password"
              label="Confirmar contraseña"
              placeholder="Contraseña123"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined })
              }}
              onClear={() => setConfirmPassword('')}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            {/* Submit Button */}
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? 'Creando cuenta...' : 'crear cuenta'}
            </Button>

            {/* Google Register */}
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={handleGoogleRegister}
              className="flex items-center justify-center gap-3"
            >
              <GoogleIcon />
              <span>Registrate con Google</span>
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-8 text-center text-sm text-gray-600">
            Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-dark font-medium hover:underline"
            >
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-[55%] relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/doctores.png')` }}
        />
      </div>
    </div>
  )
}
