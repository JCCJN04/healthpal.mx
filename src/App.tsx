import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from '@/app/providers/AuthContext'
import RequireAuth from '@/features/auth/components/RequireAuth'
import RequireOnboarding from '@/features/auth/components/RequireOnboarding'
import RequireRole from '@/features/auth/components/RequireRole'
import OnlyOnboarding from '@/features/auth/components/OnlyOnboarding'
import { ToastContainer } from '@/shared/components/ui/Toast'

// Eager load critical auth pages (small, needed immediately)
import Login from '@/features/auth/pages/Login'
import ForgotPassword from '@/features/auth/pages/ForgotPassword'
import ResetPassword from '@/features/auth/pages/ResetPassword'
import Register from '@/features/auth/pages/Register'

// Lazy load dashboard pages (large, only needed after auth)
const Dashboard = lazy(() => import('@/features/shared/pages/Dashboard'))
const Documentos = lazy(() => import('@/features/shared/pages/Documentos'))
const DocumentDetail = lazy(() => import('@/features/shared/pages/DocumentDetail'))
const Consultas = lazy(() => import('@/features/shared/pages/Consultas'))
const ConsultaDetail = lazy(() => import('@/features/shared/pages/ConsultaDetail'))
const NuevaConsulta = lazy(() => import('@/features/shared/pages/NuevaConsulta'))
const ConsultasHistorial = lazy(() => import('@/features/shared/pages/ConsultasHistorial'))
const Mensajes = lazy(() => import('@/features/shared/pages/Mensajes'))
const Doctores = lazy(() => import('@/features/patient/pages/Doctores'))
const DoctorDetail = lazy(() => import('@/features/patient/pages/DoctorDetail'))
const Calendario = lazy(() => import('@/features/shared/pages/Calendario'))
const Configuracion = lazy(() => import('@/features/shared/pages/Configuracion'))
const Pacientes = lazy(() => import('@/features/doctor/pages/Pacientes'))
const PatientDetail = lazy(() => import('@/features/doctor/pages/PatientDetail'))
const Busqueda = lazy(() => import('@/features/shared/pages/Busqueda'))

// Lazy load onboarding pages
const OnboardingRole = lazy(() => import('@/features/auth/pages/onboarding/OnboardingRole'))
const OnboardingBasic = lazy(() => import('@/features/auth/pages/onboarding/OnboardingBasic'))
const OnboardingContact = lazy(() => import('@/features/auth/pages/onboarding/OnboardingContact'))
const OnboardingDoctor = lazy(() => import('@/features/auth/pages/onboarding/OnboardingDoctor'))
const OnboardingPatient = lazy(() => import('@/features/auth/pages/onboarding/OnboardingPatient'))
const OnboardingDone = lazy(() => import('@/features/auth/pages/onboarding/OnboardingDone'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-[#33C7BE] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-gray-600 text-sm">Cargando...</p>
    </div>
  </div>
)

function App() {
  console.log('✓ App rendering')

  return (
    <AuthProvider>
      <ToastContainer />
      <Routes>
        {/* Auth Routes - No lazy loading needed */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />

        {/* Onboarding Routes - Lazy loaded with Suspense */}
        {/* Protected with OnlyOnboarding to prevent access after completion */}
        <Route path="/onboarding/role" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingRole /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/basic" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingBasic /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/contact" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingContact /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/doctor" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingDoctor /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/patient" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingPatient /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/done" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingDone /></Suspense></OnlyOnboarding></RequireAuth>} />

        {/* Dashboard Routes - Lazy loaded with Suspense */}
        <Route path="/dashboard" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/documentos" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Documentos /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/documentos/:id" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><DocumentDetail /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/consultas" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Consultas /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/consultas/historial" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><ConsultasHistorial /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/consultas/:id" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><ConsultaDetail /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/consultas/nueva" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><NuevaConsulta /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/buscar" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Busqueda /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/mensajes" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Mensajes /></Suspense></RequireOnboarding></RequireAuth>} />
        {/* Patient-only routes */}
        <Route path="/dashboard/doctores" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['patient']}><Suspense fallback={<PageLoader />}><Doctores /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/doctores/:id" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['patient']}><Suspense fallback={<PageLoader />}><DoctorDetail /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        {/* Doctor-only routes */}
        <Route path="/dashboard/pacientes" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['doctor']}><Suspense fallback={<PageLoader />}><Pacientes /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/pacientes/:id" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['doctor']}><Suspense fallback={<PageLoader />}><PatientDetail /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/calendario" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Calendario /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/configuracion" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Configuracion /></Suspense></RequireOnboarding></RequireAuth>} />
      </Routes>
    </AuthProvider>
  )
}

export default App
