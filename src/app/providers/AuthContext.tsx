import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { getMyProfile } from '@/shared/lib/queries/profile'
import { logger } from '@/shared/lib/logger'
import { auditLog } from '@/shared/lib/audit'
import type { Database } from '@/shared/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: AuthError | null
  mfaRequired: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
export type { AuthContextType, Profile }

// Inactivity timeout: 15 minutes
const INACTIVITY_TIMEOUT = 15 * 60 * 1000
// localStorage key to persist the last-activity timestamp across device sleep/restart
const LAST_ACTIVE_KEY = 'healthpal:session:last_active'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const [mfaRequired, setMfaRequired] = useState(false)

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jwtRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoggedToken = useRef<string | null>(null)

  const fetchProfile = async (userId?: string) => {
    try {
      return await getMyProfile(userId)
    } catch (err) {
      logger.error('fetchProfile', err)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  // Handle user activity for inactivity timeout
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    if (user) {
      // Persist timestamp to localStorage so we can detect idle time after device sleep/restart
      try {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
      } catch {
        /* storage unavailable */
      }

      inactivityTimerRef.current = setTimeout(async () => {
        logger.info('Session expired due to inactivity')
        try {
          localStorage.removeItem(LAST_ACTIVE_KEY)
        } catch {
          /* ignore */
        }
        await signOut()
      }, INACTIVITY_TIMEOUT)
    }
  }, [user])

  // Refresh JWT token periodically (Disabled: Supabase autoRefreshToken handles this internally)
  const setupJWTRefresh = useCallback(() => {
    if (jwtRefreshTimerRef.current) {
      clearInterval(jwtRefreshTimerRef.current)
    }
    // We let supabase.auth handle the refresh automatically to prevent lock deadlocks
  }, [])

  // Setup activity listeners for inactivity timeout
  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']

    const handleActivity = () => {
      resetInactivityTimer()
    }

    // Add listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity)
    })

    // Initialize timer
    resetInactivityTimer()

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [user, resetInactivityTimer])

  // Setup initial refresh interval
  useEffect(() => {
    setupJWTRefresh()

    const interval = jwtRefreshTimerRef.current
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [setupJWTRefresh])

  // Validate session age when the app becomes visible again (handles phone lock/background)
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const lastActive = localStorage.getItem(LAST_ACTIVE_KEY)
        if (lastActive) {
          const elapsed = Date.now() - parseInt(lastActive, 10)
          if (elapsed > INACTIVITY_TIMEOUT) {
            logger.info('Session invalidated: app returned from background after long inactivity')
            try {
              localStorage.removeItem(LAST_ACTIVE_KEY)
            } catch {
              /* ignore */
            }
            await signOut()
          }
        } else {
          // No timestamp means the timer never started (e.g. fresh session before any activity)
          // Treat as active — let the inactivity timer start normally on first interaction
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  useEffect(() => {
    let mounted = true

    // Inicializar autenticación
    const initAuth = async () => {
      // Safety net: ensure loading is NEVER stuck on true regardless of network stalls
      const safetyTimeout = setTimeout(() => {
        if (mounted) {
          logger.warn('AuthContext: initAuth safety timeout reached')
          setLoading(false)
        }
      }, 3500)

      try {
        const lastActive = localStorage.getItem(LAST_ACTIVE_KEY)
        if (lastActive) {
          const elapsed = Date.now() - parseInt(lastActive, 10)
          if (elapsed > INACTIVITY_TIMEOUT) {
            logger.info('Session invalidated: device was inactive too long')
            try {
              localStorage.removeItem(LAST_ACTIVE_KEY)
            } catch {
              /* ignore */
            }
            setUser(null)
            setSession(null)
            setProfile(null)
            setLoading(false)
            clearTimeout(safetyTimeout)
            supabase.auth.signOut().catch(() => {})
            return
          }
        }

        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          setError(sessionError)
          setLoading(false)
          clearTimeout(safetyTimeout)
          return
        }

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          // Check MFA assurance level synchronously before attempting profile load
          let isMfaNeeded = false
          try {
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
            isMfaNeeded = aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2'
          } catch (mfaErr) {
            logger.warn('initAuth:mfaCheck', mfaErr)
          }

          if (mounted) {
            setMfaRequired(isMfaNeeded)
          }

          if (isMfaNeeded) {
            if (mounted) {
              setProfile(null)
              setLoading(false)
            }
            return
          }

          // Fetch profile synchronously with a fast timeout (2s) so profile is ready for guards
          try {
            const profileData = await Promise.race([
              fetchProfile(currentSession.user.id),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
            ])
            if (mounted && profileData) {
              setProfile(profileData)
            } else if (mounted) {
              // If race timeout triggered, continue fetching in background
              fetchProfile(currentSession.user.id).then((p) => {
                if (mounted && p) setProfile(p)
              })
            }
          } catch (err) {
            logger.error('initAuth:fetchProfile', err)
          }
        } else {
          if (mounted) {
            setProfile(null)
            setMfaRequired(false)
          }
        }
      } catch (err: unknown) {
        logger.error('initAuth', err)
      } finally {
        clearTimeout(safetyTimeout)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listener de cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return

      // NOM-024 §6.6: log authentication events — deduplicate by access_token
      if (_event === 'SIGNED_IN' && currentSession?.access_token) {
        if (currentSession.access_token !== lastLoggedToken.current) {
          lastLoggedToken.current = currentSession.access_token
          auditLog.login()
        }
      }

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        let isMfaNeeded = false
        try {
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          isMfaNeeded = aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2'
        } catch (mfaErr) {
          logger.warn('authStateChange:mfaCheck', mfaErr)
        }

        if (mounted) {
          setMfaRequired(isMfaNeeded)
        }

        if (isMfaNeeded) {
          if (mounted) {
            setProfile(null)
            setLoading(false)
          }
          return
        }

        // Fetch profile with user id
        fetchProfile(currentSession.user.id)
          .then((profileData) => {
            if (mounted && profileData) {
              setProfile(profileData)
            }
          })
          .catch((err) => {
            logger.error('authStateChange', err)
          })
      } else {
        setProfile(null)
        setMfaRequired(false)
      }

      // Always set loading to false
      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    // Clear timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    if (jwtRefreshTimerRef.current) {
      clearInterval(jwtRefreshTimerRef.current)
    }
    // Always remove the activity timestamp so the next session starts clean
    try {
      localStorage.removeItem(LAST_ACTIVE_KEY)
    } catch {
      /* ignore */
    }

    // NOM-024 §6.6: log logout before session is destroyed
    auditLog.logout()

    // Notify CryptoContext to clear in-memory keys (avoids circular import)
    window.dispatchEvent(new Event('healthpal:signout'))

    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      logger.error('signOut', signOutError)
      throw signOutError
    }
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const value = {
    user,
    session,
    profile,
    loading,
    error,
    mfaRequired,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
