import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleCalendarEvent {
  title: string
  description?: string
  location?: string
  startDateTime: string   // ISO 8601 e.g. "2024-03-15T09:00:00"
  endDateTime: string
  timeZone?: string
}

export interface GoogleCalendarTokens {
  id: string
  user_id: string
  access_token: string
  refresh_token: string | null
  expires_at: string
  calendar_id: string
  created_at: string
  updated_at: string
}

// ─── Deep-link (no OAuth required) ───────────────────────────────────────────

/**
 * Builds a Google Calendar "Add to Calendar" deep-link URL.
 * Opens in a new tab with all fields pre-filled — no OAuth needed.
 */
export function buildAddToGoogleCalendarUrl(event: GoogleCalendarEvent): string {
  const fmt = (iso: string) =>
    iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(event.startDateTime)}/${fmt(event.endDateTime)}`,
    ...(event.description && { details: event.description }),
    ...(event.location && { location: event.location }),
    ...(event.timeZone && { ctz: event.timeZone }),
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Open Google Calendar event creation in a new tab.
 */
export function openAddToGoogleCalendar(event: GoogleCalendarEvent): void {
  window.open(buildAddToGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer')
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

/**
 * Initiates Google OAuth 2.0 flow with PKCE.
 * Stores the code_verifier in sessionStorage before redirect.
 */
export async function initiateGoogleOAuth(): Promise<void> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = `${window.location.origin}/auth/gcal/callback`

  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID no está configurado')
  }

  // Save access token now — Supabase may clear its session storage when it
  // mistakenly tries to exchange the Google ?code= as its own PKCE callback.
  const { data: { session: currentSession } } = await supabase.auth.getSession()
  if (!currentSession?.access_token) {
    throw new Error('No hay sesión activa')
  }
  localStorage.setItem('google_oauth_access_token', currentSession.access_token)

  // PKCE code verifier + challenge
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = generateState()

  localStorage.setItem('google_oauth_verifier', verifier)
  localStorage.setItem('google_oauth_state', state)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// ─── Token management ─────────────────────────────────────────────────────────

/** Returns stored tokens for the current user, or null if not connected. */
export async function getGoogleCalendarTokens(): Promise<GoogleCalendarTokens | null> {
  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error('getGoogleCalendarTokens', error)
    }
    return null
  }

  return data as GoogleCalendarTokens
}

/**
 * Refreshes the access token using the stored refresh_token via the Edge Function.
 * Updates the DB row and returns the updated tokens, or null on failure.
 */
export async function refreshGoogleCalendarToken(): Promise<GoogleCalendarTokens | null> {
  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'google-calendar-auth',
      { body: { action: 'refresh' } }
    )

    if (fnError || !fnData?.success) {
      logger.error('refreshGoogleCalendarToken', fnData?.error ?? fnError?.message)
      return null
    }

    // Re-fetch the updated row from DB
    return await getGoogleCalendarTokens()
  } catch (err) {
    logger.error('refreshGoogleCalendarToken', err)
    return null
  }
}

/**
 * Returns valid tokens for the current user, auto-refreshing if expired.
 * Returns null if not connected or refresh fails (user must reconnect).
 */
export async function getValidGoogleCalendarTokens(): Promise<GoogleCalendarTokens | null> {
  const tokens = await getGoogleCalendarTokens()
  if (!tokens) return null
  if (isTokenValid(tokens)) return tokens
  return await refreshGoogleCalendarToken()
}

/** Disconnects Google Calendar for the current user (deletes stored tokens). */
export async function disconnectGoogleCalendar(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    logger.error('disconnectGoogleCalendar', error)
    throw error
  }
}

/** True if access token is still valid (with 60s buffer). */
export function isTokenValid(tokens: GoogleCalendarTokens): boolean {
  const expiresAt = new Date(tokens.expires_at).getTime()
  return Date.now() < expiresAt - 60_000
}

// ─── Google Calendar API ──────────────────────────────────────────────────────

/**
 * Creates a Google Calendar event for an appointment via Edge Function.
 * The edge function handles token retrieval, auto-refresh, and DB update server-side.
 * Returns the event ID on success, null if doctor has no calendar connected or on error.
 */
export async function createAppointmentCalendarEvent(
  appointmentId: string,
  event: GoogleCalendarEvent
): Promise<{ id: string; htmlLink: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'google-calendar-create-event',
      {
        body: {
          appointmentId,
          title: event.title,
          description: event.description ?? '',
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          timeZone: event.timeZone ?? 'America/Mexico_City',
        },
      }
    )

    if (error) {
      logger.error('createAppointmentCalendarEvent:invoke', error)
      return null
    }

    if (!data?.success || data?.skipped) return null

    return { id: data.eventId, htmlLink: data.htmlLink }
  } catch (err) {
    logger.error('createAppointmentCalendarEvent', err)
    return null
  }
}

// ─── Delete calendar event ────────────────────────────────────────────────────

/**
 * Deletes the Google Calendar event linked to an appointment.
 * Uses a server-side Edge Function so it can access the doctor's tokens
 * regardless of whether the caller is the doctor or the patient.
 * Non-fatal — silently ignores errors.
 */
export async function deleteAppointmentCalendarEvent(appointmentId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke(
      'google-calendar-delete-event',
      { body: { appointmentId } }
    )
    if (error) logger.error('deleteAppointmentCalendarEvent', error)
  } catch (err) {
    logger.error('deleteAppointmentCalendarEvent', err)
  }
}

// ─── Doctor availability ──────────────────────────────────────────────────────

export interface BusyInterval {
  start: string  // ISO 8601
  end: string
}

/**
 * Returns the doctor's busy intervals for a given date by querying their
 * Google Calendar via a secure Edge Function.
 * Returns empty array if doctor has no calendar connected or on error.
 */
export async function getDoctorBusySlots(
  doctorId: string,
  date: string   // 'YYYY-MM-DD'
): Promise<BusyInterval[]> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'google-calendar-availability',
      { body: { doctorId, date } }
    )
    if (error) {
      logger.error('getDoctorBusySlots', error)
      return []
    }
    return (data?.busy ?? []) as BusyInterval[]
  } catch (err) {
    logger.error('getDoctorBusySlots', err)
    return []
  }
}

// ─── PKCE utilities ───────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}
