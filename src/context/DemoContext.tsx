import { createContext, useContext, useEffect } from 'react'
import { DEMO_DOCTOR_EMAIL, DEMO_DOCTOR_ID } from '@/data/demoConfig'

export const demoDoctorUser = {
  id: DEMO_DOCTOR_ID,
  email: DEMO_DOCTOR_EMAIL,
  user_metadata: {
    full_name: 'Pedro Garcia',
    role: 'doctor',
    especialidad: 'Medicina General',
    avatar_url: null,
  },
}

const DEMO_MODE_STORAGE_KEY = 'healthpal:demo-mode'

type DemoContextValue = {
  enabled: boolean
}

const DemoContext = createContext<DemoContextValue>({ enabled: false })

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false

  if (window.location.pathname.startsWith('/demo/doctor')) {
    return true
  }

  return window.sessionStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'doctor'
}

export function enableDemoMode(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(DEMO_MODE_STORAGE_KEY, 'doctor')
}

export function disableDemoMode(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(DEMO_MODE_STORAGE_KEY)
}

export function mapDashboardPath(path: string): string {
  if (!isDemoMode()) return path

  if (path === '/dashboard') return '/demo/doctor'
  if (path.startsWith('/dashboard/')) {
    return `/demo/doctor/${path.slice('/dashboard/'.length)}`
  }

  return path
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    enableDemoMode()
  }, [])

  return (
    <DemoContext.Provider value={{ enabled: true }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemoContext() {
  return useContext(DemoContext)
}
