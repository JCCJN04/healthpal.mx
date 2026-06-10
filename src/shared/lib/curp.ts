/**
 * NOM-024-SSA3-2012 §6.5.1 — Validación de CURP
 *
 * La CURP es el atributo de identificación única de personas para
 * intercambio de información en salud. Los SIRES NO deben autogenerar la CURP.
 *
 * Formato: 18 posiciones alfanuméricas (RENAPO)
 *   [1-4]   Letras (consonantes/vocales de apellidos y nombre)
 *   [5-10]  Fecha nacimiento AAMMDD
 *   [11]    Sexo: H (Hombre) | M (Mujer)
 *   [12-13] Clave entidad federativa nacimiento (INEGI)
 *   [14-16] Consonantes internas de apellidos y nombre
 *   [17]    Homoclave asignada por RENAPO
 *   [18]    Dígito verificador
 */

// Valid 2-char INEGI state codes used in CURP positions 12-13
const CURP_STATE_CODES = new Set([
  'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH',
  'DF', 'DG', 'GT', 'GR', 'HG', 'JC', 'MC', 'MN',
  'MS', 'NT', 'NL', 'OC', 'PL', 'QT', 'QR', 'SP',
  'SL', 'SR', 'TC', 'TS', 'TL', 'VZ', 'YN', 'ZS',
  'NE', // Nacido en el Extranjero
])

const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]{2}$/

export interface CurpValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a CURP string against RENAPO format rules.
 * Does NOT validate against the RENAPO web service (would require server call).
 */
export function validateCurp(value: string): CurpValidationResult {
  if (!value) {
    return { valid: false, error: 'La CURP es requerida' }
  }

  const normalized = value.trim().toUpperCase()

  if (normalized.length !== 18) {
    return { valid: false, error: 'La CURP debe tener exactamente 18 caracteres' }
  }

  if (!CURP_REGEX.test(normalized)) {
    return { valid: false, error: 'Formato de CURP inválido' }
  }

  const stateCode = normalized.substring(11, 13)
  if (!CURP_STATE_CODES.has(stateCode)) {
    return { valid: false, error: 'Clave de entidad federativa inválida en CURP' }
  }

  return { valid: true }
}

/**
 * Normalizes a CURP to uppercase trimmed string.
 * Returns null if input is empty/null.
 */
export function normalizeCurp(value: string | null | undefined): string | null {
  if (!value) return null
  return value.trim().toUpperCase()
}

/**
 * INEGI 2-char state codes with display names (EDONAC per NOM-024 §6.5)
 */
export const INEGI_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Aguascalientes' },
  { code: '02', name: 'Baja California' },
  { code: '03', name: 'Baja California Sur' },
  { code: '04', name: 'Campeche' },
  { code: '05', name: 'Coahuila de Zaragoza' },
  { code: '06', name: 'Colima' },
  { code: '07', name: 'Chiapas' },
  { code: '08', name: 'Chihuahua' },
  { code: '09', name: 'Ciudad de México' },
  { code: '10', name: 'Durango' },
  { code: '11', name: 'Guanajuato' },
  { code: '12', name: 'Guerrero' },
  { code: '13', name: 'Hidalgo' },
  { code: '14', name: 'Jalisco' },
  { code: '15', name: 'Estado de México' },
  { code: '16', name: 'Michoacán de Ocampo' },
  { code: '17', name: 'Morelos' },
  { code: '18', name: 'Nayarit' },
  { code: '19', name: 'Nuevo León' },
  { code: '20', name: 'Oaxaca' },
  { code: '21', name: 'Puebla' },
  { code: '22', name: 'Querétaro' },
  { code: '23', name: 'Quintana Roo' },
  { code: '24', name: 'San Luis Potosí' },
  { code: '25', name: 'Sinaloa' },
  { code: '26', name: 'Sonora' },
  { code: '27', name: 'Tabasco' },
  { code: '28', name: 'Tamaulipas' },
  { code: '29', name: 'Tlaxcala' },
  { code: '30', name: 'Veracruz de Ignacio de la Llave' },
  { code: '31', name: 'Yucatán' },
  { code: '32', name: 'Zacatecas' },
  { code: 'NE', name: 'Nacido en el Extranjero' },
  { code: '00', name: 'No disponible' },
]
