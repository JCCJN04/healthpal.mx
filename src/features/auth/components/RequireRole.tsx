import { useState, useEffect } from 'react'
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
  const { user, profile, loading: authLoading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  // Safety fallback: prevent infinite skeleton if profile never arrives
  useEffect(() => {
    if (authLoading || profile) return
    const timer = setTimeout(() => {
      logger.warn('[RequireRole] Timeout esperando perfil del usuario, redirigiendo')
      setTimedOut(true)
    }, 3500)
    return () => clearTimeout(timer)
  }, [authLoading, profile])

  // While auth or profile is loading, render skeleton
  if (authLoading || (!profile && !timedOut)) {
    return <DashboardPageSkeleton />
  }

  // Not authenticated — let RequireAuth or login handle it
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Profile missing or timed out — safely redirect to avoid infinite skeleton
  if (!profile || timedOut) {
    return <Navigate to={redirectTo} replace />
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
