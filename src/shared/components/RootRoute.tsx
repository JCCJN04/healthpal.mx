import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import { isAppHost } from '@/shared/lib/domain'
import PageLoader from '@/shared/components/PageLoader'

const Landing = lazy(() => import('@/features/landing/Landing'))

export function RootRoute() {
  const { user, profile, loading } = useAuth()

  // On app.healthpal.mx or staging.healthpal.mx: root is login or dashboard
  if (isAppHost()) {
    if (loading) {
      return <PageLoader />
    }

    if (!user) {
      return <Navigate to="/login" replace />
    }

    // Role-based redirect if onboarding is pending
    if (profile && !profile.onboarding_completed) {
      if (profile.role === 'patient') return <Navigate to="/onboarding/patient" replace />
      if (profile.role === 'doctor') return <Navigate to="/onboarding/doctor" replace />
      if (profile.role === 'assistant') return <Navigate to="/onboarding/assistant" replace />
      return <Navigate to="/onboarding/role" replace />
    }

    return <Navigate to="/dashboard" replace />
  }

  // On healthpal.mx / www.healthpal.mx / localhost: render landing page
  return (
    <Suspense fallback={<PageLoader />}>
      <Landing />
    </Suspense>
  )
}

export default RootRoute
