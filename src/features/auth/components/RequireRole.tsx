import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import type { UserRole } from '@/shared/types/database'
import { logger } from '@/shared/lib/logger'
import DashboardPageSkeleton from '@/shared/components/DashboardPageSkeleton'

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
 */
export default function RequireRole({
  children,
  allowedRoles,
  redirectTo = '/dashboard',
}: RequireRoleProps) {
  const { profile, loading: authLoading } = useAuth()

  // While auth or profile is loading, render skeleton instead of a blank screen
  if (authLoading || !profile) {
    return <DashboardPageSkeleton />
  }

  // If the user's role is not in the allowed list, redirect
  if (!allowedRoles.includes(profile.role)) {
    logger.warn(
      `[RequireRole] Acceso denegado: rol "${profile.role}" intentó acceder a ruta restringida a [${allowedRoles.join(', ')}]`,
    )
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
