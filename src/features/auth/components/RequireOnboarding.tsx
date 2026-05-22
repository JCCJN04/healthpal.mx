import { useEffect, useState, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import { getMyProfile } from '@/shared/lib/queries/profile'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface RequireOnboardingProps {
  children: React.ReactNode
}

/**
 * Guard that ensures user has completed onboarding before accessing protected routes.
 *
 * Sequence on page refresh:
 *  1. AuthContext sets loading=true → we show spinner
 *  2. Auth resolves: user is set, loading=false, profile may still be null (background fetch)
 *  3. We wait for profile (profile=null + not resolved → spinner)
 *  4. Profile arrives → check onboarding_completed → render children or redirect
 *
 * Edge cases handled:
 *  - Profile fetch fails: retry directly after 6s, then show error (NOT redirect to onboarding)
 *  - onAuthStateChange fires (TOKEN_REFRESHED): resolvedRef prevents spurious re-checks
 */
export default function RequireOnboarding({ children }: RequireOnboardingProps) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const [resolved, setResolved] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const resolvedRef = useRef(false)

  const resolveOnboarding = useCallback((p: Profile) => {
    if (resolvedRef.current && onboardingComplete) return
    resolvedRef.current = true

    if (p.onboarding_completed) {
      setOnboardingComplete(true)
      setResolved(true)
      return
    }

    let targetRoute = '/onboarding/role'
    if (p.onboarding_step === 'basic') {
      targetRoute = '/onboarding/basic'
    } else if (p.onboarding_step === 'contact') {
      targetRoute = '/onboarding/contact'
    } else if (p.onboarding_step === 'details') {
      targetRoute = p.role === 'doctor' ? '/onboarding/doctor' : '/onboarding/patient'
    } else if (p.onboarding_step === 'done') {
      targetRoute = '/onboarding/done'
    }

    setRedirectTo(targetRoute)
    setResolved(true)
  }, [onboardingComplete])

  // Main check: runs when auth state or profile changes
  useEffect(() => {
    if (authLoading) return
    if (!user) return
    if (!profile) return
    resolveOnboarding(profile)
  }, [user, profile, authLoading, resolveOnboarding])

  // Safety timeout: if profile doesn't arrive in 6s, fetch directly
  // (AuthContext background fetch swallows errors silently — we need a fallback)
  useEffect(() => {
    if (!user || profile || authLoading) return

    const timeout = setTimeout(async () => {
      logger.warn('RequireOnboarding: profile not loaded in 6s, fetching directly')
      try {
        const directProfile = await getMyProfile()
        resolveOnboarding(directProfile)
        // Update AuthContext in background so rest of app has profile
        refreshProfile().catch(() => {/* best-effort */})
      } catch (err) {
        logger.error('RequireOnboarding:manualFetch', err)
        setFetchError(true)
        setResolved(true)
      }
    }, 6000)

    return () => clearTimeout(timeout)
  }, [user, profile, authLoading, resolveOnboarding, refreshProfile])

  // Still initializing auth
  if (authLoading) {
    return <Spinner />
  }

  // User not logged in — RequireAuth handles this
  if (!user) {
    return <>{children}</>
  }

  // Profile hasn't arrived yet — keep spinner, don't redirect prematurely
  if (!profile && !resolved) {
    return <Spinner />
  }

  // Profile fetch failed after timeout — show error with retry
  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 mb-1">Error al cargar tu perfil</p>
          <p className="text-sm text-gray-500 mb-4">Verifica tu conexión e intenta de nuevo.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Redirect to the appropriate onboarding step
  if (resolved && !onboardingComplete && redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  // Still resolving (shouldn't normally reach here)
  if (!resolved) {
    return <Spinner />
  }

  return <>{children}</>
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#33C7BE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Verificando perfil...</p>
      </div>
    </div>
  )
}
