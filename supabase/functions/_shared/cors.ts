export const ALLOWED_ORIGINS = new Set(['https://healthpal.mx', 'https://www.healthpal.mx'])

export function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.has(origin)) return true
  if (
    origin === 'http://localhost:3000' ||
    origin === 'http://localhost:5173' ||
    origin === 'http://127.0.0.1:3000' ||
    origin === 'http://127.0.0.1:5173'
  ) {
    return true
  }

  try {
    const url = new URL(origin)
    if (
      url.hostname.endsWith('.vercel.app') &&
      (url.protocol === 'https:' || url.protocol === 'http:')
    ) {
      return true
    }
  } catch (e) {
    // invalid URL
  }

  return false
}

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  }

  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}
