import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import type { UserRole } from '@/shared/types/database'

interface RequireRoleProps {
  children: React.ReactNode
  /** Roles allowed to access this route */
  allowedRoles: UserRole[]
  /** Where to redirect if role doesn't match (default: /dashboard) */
  redirectTo?: string
}

/**
 * Route guard that restricts access based on user role.
 * Must be used INSIDE RequireAuth and RequireOnboarding so that
 * `profile` is guaranteed to exist when role check runs.
 *
 * Usage:
 *   <RequireRole allowedRoles={['doctor']}>
 *     <Pacientes />
 *   </RequireRole>
 */
export default function RequireRole({
  children,
  allowedRoles,
  redirectTo = '/dashboard',
}: RequireRoleProps) {
  const { profile, loading: authLoading } = useAuth()

  // While auth or profile is loading, show spinner
  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#33C7BE] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // If the user's role is not in the allowed list, redirect
  if (!allowedRoles.includes(profile.role)) {
    console.warn(
      `[RequireRole] Acceso denegado: rol "${profile.role}" intentó acceder a ruta restringida a [${allowedRoles.join(', ')}]`
    )
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
