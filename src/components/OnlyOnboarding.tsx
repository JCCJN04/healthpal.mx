import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkOnboardingStatus()
  }, [user, profile])

  const checkOnboardingStatus = async () => {
    if (!user) {
      setChecking(false)
      return
    }

    // If profile hasn't loaded yet, wait
    if (!profile && authLoading) {
      return
    }

    // If onboarding is already complete, redirect to dashboard
    if (profile?.onboarding_completed) {
      setChecking(false)
      return
    }

    // Otherwise, allow access to onboarding
    setChecking(false)
  }

  // Show loading state
  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#33C7BE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando perfil...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, this will be handled by RequireAuth
  if (!user) {
    return <>{children}</>
  }

  // If onboarding is complete, redirect to dashboard (prevent going back to onboarding)
  if (profile?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />
  }

  // Allow access to onboarding pages
  return <>{children}</>
}
