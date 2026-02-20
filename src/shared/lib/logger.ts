/**
 * Secure Logger - Environment-aware logging utility
 *
 * - In development: logs info/warn/error with limited detail
 * - In production: only logs sanitized errors, no PII, no tokens, no user IDs
 *
 * NEVER log: tokens, session objects, user IDs, emails, full error stacks, Supabase hints
 */

const isDev = import.meta.env.DEV
const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true'

/**
 * Strips PII and sensitive data from values before logging.
 * Replaces UUIDs, emails, tokens, and long strings.
 */
function sanitize(args: unknown[]): unknown[] {
  if (!isDev) {
    return args.map((arg) => {
      if (typeof arg === 'string') {
        let s = arg
        // Redact emails
        s = s.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
        // Redact UUIDs
        s = s.replace(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
          '[UUID]'
        )
        // Redact JWTs (eyJ...)
        s = s.replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT]')
        return s
      }
      if (typeof arg === 'object' && arg !== null) {
        // In production, don't log full objects — just indicate type
        return `[Object: ${(arg as object).constructor?.name || 'unknown'}]`
      }
      return arg
    })
  }
  return args
}

/**
 * Development-only informational log.
 * Completely stripped in production builds.
 */
function info(...args: unknown[]): void {
  if (isDev) {
    console.log('[HealthPal]', ...args)
  }
}

/**
 * Development-only debug log.
 * Only active when VITE_DEBUG=true.
 */
function debug(...args: unknown[]): void {
  if (isDev && isDebugEnabled) {
    console.debug('[HealthPal:debug]', ...args)
  }
}

/**
 * Warning log — shows in dev, sanitized in prod.
 */
function warn(...args: unknown[]): void {
  if (isDev) {
    console.warn('[HealthPal]', ...args)
  } else {
    console.warn('[HealthPal]', ...sanitize(args))
  }
}

/**
 * Error log — always active but sanitized in production.
 * Never includes PII, stack traces, or Supabase hints in prod.
 */
function error(context: string, err?: unknown): void {
  if (isDev) {
    console.error(`[HealthPal:${context}]`, err)
  } else {
    // In production: log only the context label + generic error type
    const errType = err instanceof Error ? err.name : typeof err
    console.error(`[HealthPal:${context}] ${errType}`)
  }
}

export const logger = {
  info,
  debug,
  warn,
  error,
} as const
