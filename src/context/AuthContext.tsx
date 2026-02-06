import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name, email, onboarding_completed, onboarding_step')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return null
      }

      return data
    } catch (err) {
      console.error('Error in fetchProfile:', err)
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
      inactivityTimerRef.current = setTimeout(async () => {
        console.log('Session expired due to inactivity')
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
            console.error('Error refreshing token:', error)
            await signOut()
          } else if (data.session) {
            console.log('JWT token refreshed successfully')
          }
        } catch (err) {
          console.error('Error in JWT refresh:', err)
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
          fetchProfile(currentSession.user.id).then(profileData => {
            if (mounted) {
              setProfile(profileData)
            }
          }).catch(err => {
            console.error('Error cargando perfil:', err)
          })
        }
        
        // Set loading false immediately, don't wait for profile
        if (mounted) {
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Error en initAuth:', err.message)
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
          fetchProfile(currentSession.user.id).then(profileData => {
            if (mounted) {
              setProfile(profileData)
            }
          }).catch(err => {
            console.error('Error en auth change:', err)
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
      console.error('Error signing out:', signOutError)
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
