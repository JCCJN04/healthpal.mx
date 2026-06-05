import { useEffect, useState, useRef } from 'react'
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
function getOnboardingRedirect(p: Profile): string {
  if (p.onboarding_step === 'basic')     return '/onboarding/basic'
  if (p.onboarding_step === 'contact')   return '/onboarding/contact'
  if (p.onboarding_step === 'assistant') return '/onboarding/assistant'
  if (p.onboarding_step === 'details')   return p.role === 'doctor' ? '/onboarding/doctor' : '/onboarding/patient'
  if (p.onboarding_step === 'done')      return '/onboarding/done'
  return '/onboarding/role'
}

export default function RequireOnboarding({ children }: RequireOnboardingProps) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState<Profile | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const fetchingRef = useRef(false)

  // Eager fetch when auth is done but AuthContext profile hasn't arrived yet
  useEffect(() => {
    if (authLoading || !user || profile || fetchingRef.current) return
    fetchingRef.current = true
    getMyProfile()
      .then(p => {
        setFetchedProfile(p)
        refreshProfile().catch(() => {/* best-effort */})
      })
      .catch(err => {
        logger.error('RequireOnboarding:eagerFetch', err)
        setFetchError(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, profile])

  // Auth still initializing
  if (authLoading) return <Spinner />

  // No user — RequireAuth handles redirect
  if (!user) return <>{children}</>

  // Use whichever profile arrived first
  const resolvedProfile = profile ?? fetchedProfile

  // Profile not yet available — show spinner
  if (!resolvedProfile && !fetchError) return <Spinner />

  // Profile fetch failed
  if (fetchError && !resolvedProfile) {
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

  // Onboarding not complete — redirect synchronously
  if (resolvedProfile && !resolvedProfile.onboarding_completed) {
    return <Navigate to={getOnboardingRedirect(resolvedProfile)} replace />
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
