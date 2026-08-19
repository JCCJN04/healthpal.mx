import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { getMyProfile } from '@/shared/lib/queries/profile'
import { logger } from '@/shared/lib/logger'
import { auditLog } from '@/shared/lib/audit'
import type { Database } from '@/shared/types/database'
import { isDemoMode, demoDoctorUser, disableDemoMode } from '@/context/DemoContext'
import { demoDoctorProfile } from '@/data/demoData'
import { DEMO_DOCTOR_EMAIL, DEMO_DOCTOR_PASSWORD } from '@/data/demoConfig'

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
// JWT refresh interval: 50 minutes (tokens expire in 60 minutes)
const JWT_REFRESH_INTERVAL = 50 * 60 * 1000
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
    if (isDemoMode()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProfile(demoDoctorProfile as any)
      return
    }

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

  // Refresh JWT token periodically
  const setupJWTRefresh = useCallback(() => {
    if (jwtRefreshTimerRef.current) {
      clearInterval(jwtRefreshTimerRef.current)
    }

    if (session) {
      jwtRefreshTimerRef.current = setInterval(async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            logger.error('refreshSession', error)
            await signOut()
          } else if (data.session) {
            logger.debug('JWT token refreshed')
          }
        } catch (err) {
          logger.error('jwtRefresh', err)
        }
      }, JWT_REFRESH_INTERVAL)
    }
  }, [session])

  // Setup activity listeners for inactivity timeout
  useEffect(() => {
    if (isDemoMode()) return
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

  // Setup JWT refresh
  useEffect(() => {
    if (isDemoMode()) return
    setupJWTRefresh()

    return () => {
      if (jwtRefreshTimerRef.current) {
        clearInterval(jwtRefreshTimerRef.current)
      }
    }
  }, [setupJWTRefresh])

  // Validate session age when the app becomes visible again (handles phone lock/background)
  useEffect(() => {
    if (isDemoMode()) return
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

    if (isDemoMode()) {
      const bootstrapDemoAuth = async () => {
        try {
          const expectedEmail = DEMO_DOCTOR_EMAIL.toLowerCase()
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession()

          let demoSession = currentSession
          const currentEmail = currentSession?.user?.email?.toLowerCase() || ''
          const shouldRelogin = !currentSession || currentEmail !== expectedEmail

          if (shouldRelogin) {
            if (currentSession) {
              await supabase.auth.signOut()
            }

            const emailCandidates = [DEMO_DOCTOR_EMAIL]
            const passwordCandidates = [DEMO_DOCTOR_PASSWORD]

            let signedIn = false
            let lastError: Error | null = null

            for (const email of emailCandidates) {
              if (signedIn) break

              for (const password of passwordCandidates) {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                })

                if (!signInError && data.session) {
                  demoSession = data.session
                  signedIn = true
                  break
                }

                if (signInError) {
                  logger.warn('demo:signInWithPassword failed', {
                    email,
                    error: signInError.message,
                  })
                  lastError = signInError
                }
              }
            }

            if (!signedIn) {
              if (lastError) {
                logger.error('demo:signInWithPassword', lastError)
                throw lastError
              }

              throw new Error('No se pudo autenticar el usuario demo')
            }
          }

          if (!mounted) return

          setSession(demoSession ?? null)
          setUser((demoSession?.user as User) || (demoDoctorUser as unknown as User))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProfile(demoDoctorProfile as any)
        } catch (err) {
          logger.error('demo:bootstrapAuth', err)
          if (!mounted) return

          // Fallback to local demo identity when auth bootstrap is unavailable.
          setSession(null)
          setUser(demoDoctorUser as unknown as User)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProfile(demoDoctorProfile as any)
        } finally {
          if (mounted) {
            setLoading(false)
          }
        }
      }

      bootstrapDemoAuth()
      return () => {
        mounted = false
      }
    }

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
          // Check MFA assurance level
          supabase.auth.mfa
            .getAuthenticatorAssuranceLevel()
            .then(({ data: aal }) => {
              if (mounted) {
                setMfaRequired(aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2')
              }
            })
            .catch(() => {})

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
        supabase.auth.mfa
          .getAuthenticatorAssuranceLevel()
          .then(({ data: aal }) => {
            if (mounted) {
              setMfaRequired(aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2')
            }
          })
          .catch(() => {})

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

    if (isDemoMode()) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        logger.warn('demo:signOut', err)
      }

      disableDemoMode()
      setUser(null)
      setSession(null)
      setProfile(null)
      window.location.href = '/'
      return
    }

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
