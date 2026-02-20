import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { getMyProfile } from '@/shared/lib/queries/profile'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: AuthError | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Inactivity timeout: 15 minutes
const INACTIVITY_TIMEOUT = 15 * 60 * 1000
// JWT refresh interval: 50 minutes (tokens expire in 60 minutes)
const JWT_REFRESH_INTERVAL = 50 * 60 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const jwtRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchProfile = async () => {
    try {
      return await getMyProfile()
    } catch (err) {
      logger.error('fetchProfile', err)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile()
      setProfile(profileData)
    }
  }

  // Handle user activity for inactivity timeout
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    if (user) {
      inactivityTimerRef.current = setTimeout(async () => {
        logger.info('Session expired due to inactivity')
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
    if (!user) return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']

    const handleActivity = () => {
      resetInactivityTimer()
    }

    // Add listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Initialize timer
    resetInactivityTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [user, resetInactivityTimer])

  // Setup JWT refresh
  useEffect(() => {
    setupJWTRefresh()

    return () => {
      if (jwtRefreshTimerRef.current) {
        clearInterval(jwtRefreshTimerRef.current)
      }
    }
  }, [setupJWTRefresh])

  useEffect(() => {
    let mounted = true

    // Inicializar autenticación
    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          setError(sessionError)
          setLoading(false)
          return
        }

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        // Solo buscar perfil si hay usuario (en background, no bloqueante)
        if (currentSession?.user) {
          // Fetch profile in background without blocking
          fetchProfile().then(profileData => {
            if (mounted) {
              setProfile(profileData)
            }
          }).catch(err => {
            logger.error('loadProfile', err)
          })
        }

        // Set loading false immediately, don't wait for profile
        if (mounted) {
          setLoading(false)
        }
      } catch (err: any) {
        logger.error('initAuth', err)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          // Fetch profile in background
          fetchProfile().then(profileData => {
            if (mounted) {
              setProfile(profileData)
            }
          }).catch(err => {
            logger.error('authStateChange', err)
          })
        } else {
          setProfile(null)
        }

        // Always set loading to false
        if (mounted) {
          setLoading(false)
        }
      }
    )

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
