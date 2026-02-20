/**
 * Secure Error Handling Utilities
 *
 * Provides user-safe error messages that never expose:
 * - Internal table/column names
 * - Supabase/Postgres error hints
 * - Stack traces
 * - PII or tokens
 */

/** Generic error messages for user-facing display */
const USER_MESSAGES: Record<string, string> = {
  'auth/invalid-credentials': 'Correo o contraseña incorrectos.',
  'auth/session-expired': 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  'auth/not-authenticated': 'Debes iniciar sesión para continuar.',
  'network-error': 'Error de conexión. Verifica tu internet e intenta de nuevo.',
  'permission-denied': 'No tienes permiso para realizar esta acción.',
  'not-found': 'El recurso solicitado no fue encontrado.',
  'upload-failed': 'Error al subir el archivo. Intenta nuevamente.',
  'update-failed': 'Error al actualizar. Intenta nuevamente.',
  'delete-failed': 'Error al eliminar. Intenta nuevamente.',
  'create-failed': 'Error al crear. Intenta nuevamente.',
  default: 'Ocurrió un error inesperado. Intenta nuevamente.',
}

/**
 * Converts any error into a safe, user-facing message.
 * Never exposes technical details.
 */
export function getUserMessage(error: unknown, fallbackKey = 'default'): string {
  // If it's a known key, return mapped message
  if (typeof error === 'string' && USER_MESSAGES[error]) {
    return USER_MESSAGES[error]
  }

  // Check for network errors
  if (error instanceof TypeError && error.message?.includes('fetch')) {
    return USER_MESSAGES['network-error']
  }

  // Check for Supabase auth errors
  if (isSupabaseError(error)) {
    const status = (error as any).status || (error as any).code
    if (status === 401 || status === 403) {
      return USER_MESSAGES['permission-denied']
    }
    if (status === 404 || (error as any).code === 'PGRST116') {
      return USER_MESSAGES['not-found']
    }
  }

  // Return the fallback message
  return USER_MESSAGES[fallbackKey] || USER_MESSAGES.default
}

/**
 * Type guard to check if an error is from Supabase
 */
function isSupabaseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'status' in error || 'message' in error)
  )
}

/**
 * File validation constants
 */
export const FILE_LIMITS = {
  /** Max document size: 10 MB */
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024,
  /** Max avatar size: 2 MB */
  MAX_AVATAR_SIZE: 2 * 1024 * 1024,
  /** Allowed document MIME types */
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ],
  /** Allowed avatar MIME types */
  ALLOWED_AVATAR_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
} as const

/**
 * Validates a file before upload. Returns null if valid, error message if not.
 */
export function validateFile(
  file: File,
  type: 'document' | 'avatar'
): string | null {
  const maxSize = type === 'document'
    ? FILE_LIMITS.MAX_DOCUMENT_SIZE
    : FILE_LIMITS.MAX_AVATAR_SIZE

  const allowedTypes = type === 'document'
    ? FILE_LIMITS.ALLOWED_DOCUMENT_TYPES
    : FILE_LIMITS.ALLOWED_AVATAR_TYPES

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return `El archivo excede el tamaño máximo permitido (${maxMB} MB).`
  }

  if (!allowedTypes.includes(file.type as any)) {
    return `Tipo de archivo no permitido. Formatos aceptados: ${allowedTypes
      .map((t) => t.split('/')[1]?.toUpperCase())
      .join(', ')}.`
  }

  return null
}

/**
 * Sanitizes a filename to prevent path traversal and special character issues.
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/\.{2,}/g, '.') // No double dots (path traversal)
    .replace(/^\.+/, '') // No leading dots
    .substring(0, 255) // Limit length
}
