export function isAppHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return host.startsWith('app.') || host.startsWith('staging.')
}

export function isLandingHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return host === 'healthpal.mx' || host === 'www.healthpal.mx'
}

export function getAppUrl(path = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined' && isLandingHost()) {
    return `https://app.healthpal.mx${cleanPath}`
  }
  return cleanPath
}

export function getLandingUrl(path = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined' && isAppHost()) {
    return `https://healthpal.mx${cleanPath === '/' ? '' : cleanPath}`
  }
  return cleanPath
}
