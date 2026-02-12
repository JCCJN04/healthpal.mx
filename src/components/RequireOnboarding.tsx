import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface RequireOnboardingProps {
  children: React.ReactNode
}

/**
 * Guard that ensures user has completed onboarding before accessing protected routes.
 * If onboarding is incomplete, redirects to the appropriate onboarding step.
 * 
 * OPTIMIZED: Uses profile from AuthContext instead of refetching
 */
export default function RequireOnboarding({ children }: RequireOnboardingProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)

  useEffect(() => {
    checkOnboarding()
  }, [user, profile])

  const checkOnboarding = async () => {
    if (!user) {
      setChecking(false)
      return
    }

    // If profile hasn't loaded yet, wait (but don't block)
    if (!profile && authLoading) {
      return
    }
    
    // If no profile after auth loaded, still allow (profile will load async)
    if (!profile) {
      setChecking(false)
      return
    }

    try {
      // If onboarding is complete, allow access
      if (profile.onboarding_completed) {
        setOnboardingComplete(true)
        setChecking(false)
        return
      }

      // Determine redirect based strictly on saved onboarding_step
      let targetRoute = '/onboarding/role'

      if (profile.onboarding_step === 'basic') {
        targetRoute = '/onboarding/basic'
      } else if (profile.onboarding_step === 'contact') {
        targetRoute = '/onboarding/contact'
      } else if (profile.onboarding_step === 'details') {
        if (profile.role === 'doctor') {
          targetRoute = '/onboarding/doctor'
        } else if (profile.role === 'patient') {
          targetRoute = '/onboarding/patient'
        }
      } else if (profile.onboarding_step === 'done') {
        targetRoute = '/onboarding/done'
      }

      setRedirectTo(targetRoute)
      setChecking(false)
    } catch (error) {
      console.error('Error checking onboarding:', error)
      setRedirectTo('/onboarding/role')
      setChecking(false)
    }
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

  // If onboarding incomplete, redirect to appropriate onboarding step
  if (!onboardingComplete && redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  // If onboarding incomplete but no redirect determined, go to role selection
  if (!onboardingComplete) {
    return <Navigate to="/onboarding/role" replace />
  }

  // Allow access
  return <>{children}</>
}
