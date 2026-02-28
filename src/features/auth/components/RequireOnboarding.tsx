import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import { logger } from '@/shared/lib/logger'

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
  const [checking, setChecking] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const [profileTimedOut, setProfileTimedOut] = useState(false)

  // Safety timeout: if profile doesn't load in 5 seconds, stop waiting
  useEffect(() => {
    if (!user || profile) return
    const timeout = setTimeout(() => {
      if (!profile) {
        logger.warn('RequireOnboarding: profile load timeout')
        setProfileTimedOut(true)
      }
    }, 5000)
    return () => clearTimeout(timeout)
  }, [user, profile])

  useEffect(() => {
    checkOnboarding()
  }, [user, profile, profileTimedOut])

  const checkOnboarding = async () => {
    if (!user) {
      setChecking(false)
      return
    }

    // If profile hasn't loaded yet and auth is still loading, stay in checking state
    if (!profile && authLoading) {
      return
    }

    // If no profile and haven't timed out yet, wait
    if (!profile && !profileTimedOut) {
      return
    }

    // If profile timed out or is still null, redirect to onboarding
    if (!profile) {
      setRedirectTo('/onboarding/role')
      setChecking(false)
      return
    }

    try {
      // If onboarding is marked as complete, we are good
      if (profile.onboarding_completed) {
        setOnboardingComplete(true)
        setChecking(false)
        return
      }

      // If we have a profile but onboarding is NOT completed, 
      // check if it's a "baseline" profile that hasn't even chosen a role yet
      // If it's a doctor or patient but hasn't finished the flow, then it needs onboarding

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
      logger.error('RequireOnboarding:checkOnboarding', error)
      setRedirectTo('/onboarding/role')
      setChecking(false)
    }
  }

  // Show loading state — only while genuinely checking (not forever)
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
