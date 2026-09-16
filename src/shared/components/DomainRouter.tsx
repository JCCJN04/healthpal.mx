import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { isLandingHost } from '@/shared/lib/domain'

const PUBLIC_LANDING_PATHS = new Set(['/', '/privacidad', '/politicas', '/legal'])

export function DomainRouter({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  useEffect(() => {
    if (
      isLandingHost() &&
      !PUBLIC_LANDING_PATHS.has(location.pathname) &&
      !location.pathname.startsWith('/solicitud/')
    ) {
      window.location.href = `https://app.healthpal.mx${location.pathname}${location.search}`
    }
  }, [location.pathname, location.search])

  return <>{children}</>
}

export default DomainRouter
