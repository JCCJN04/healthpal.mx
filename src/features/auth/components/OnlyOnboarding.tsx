import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'

interface OnlyOnboardingProps {
  children: React.ReactNode
}

/**
 * Guard that ensures ONLY users who HAVEN'T completed onboarding can access these routes.
 * If onboarding is complete, redirects to dashboard.
 * This prevents users from going back to onboarding pages after completion.
 */
export default function OnlyOnboarding({ children }: OnlyOnboardingProps) {
  const { user, profile, loading: authLoading } = useAuth()

  // While auth is resolving, show loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#33C7BE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando perfil...</p>
        </div>
      </div>
    )
  }

  // If onboarding is complete, redirect to dashboard (prevent going back to onboarding)
  if (user && profile?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />
  }

  // Allow access to onboarding pages
  return <>{children}</>
}
