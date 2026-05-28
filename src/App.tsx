import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from '@/app/providers/AuthContext'
import { CryptoProvider } from '@/context/CryptoContext'
import RequireAuth from '@/features/auth/components/RequireAuth'
import RequireOnboarding from '@/features/auth/components/RequireOnboarding'
import RequireRole from '@/features/auth/components/RequireRole'
import OnlyOnboarding from '@/features/auth/components/OnlyOnboarding'
import { ToastContainer } from '@/shared/components/ui/Toast'

// Eager load critical pages (small, needed immediately)
import Landing from '@/features/landing/Landing'
import Login from '@/features/auth/pages/Login'
import ForgotPassword from '@/features/auth/pages/ForgotPassword'
import ResetPassword from '@/features/auth/pages/ResetPassword'
import Register from '@/features/auth/pages/Register'
import VerifyEmail from '@/features/auth/pages/VerifyEmail'

// Lazy load dashboard pages (large, only needed after auth)
const Dashboard = lazy(() => import('@/features/shared/pages/Dashboard'))
const Documentos = lazy(() => import('@/features/shared/pages/Documentos'))
const DocumentDetail = lazy(() => import('@/features/shared/pages/DocumentDetail'))
const Busqueda = lazy(() => import('@/features/shared/pages/Busqueda'))
const Configuracion = lazy(() => import('@/features/shared/pages/Configuracion'))
const Doctores = lazy(() => import('@/features/patient/pages/Doctores'))
const DoctorDetail = lazy(() => import('@/features/patient/pages/DoctorDetail'))
const Pacientes = lazy(() => import('@/features/doctor/pages/Pacientes'))
const PatientDetail = lazy(() => import('@/features/doctor/pages/PatientDetail'))
const Consultas = lazy(() => import('@/features/patient/pages/Consultas'))
const NuevaConsulta = lazy(() => import('@/features/patient/pages/NuevaConsulta'))
const Agenda = lazy(() => import('@/features/doctor/pages/Agenda'))

// Public pages (no auth required)
const SolicitudDocumento = lazy(() => import('@/features/public/pages/SolicitudDocumento'))

const DemoDoctor = lazy(() => import('@/pages/DemoDoctor'))
const Privacidad = lazy(() => import('@/pages/Privacidad'))
const Legal = lazy(() => import('@/pages/Legal'))

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

  return (
    <CryptoProvider>
    <AuthProvider>
      <Analytics />
      <ToastContainer />
      <Routes>
        {/* Landing & Auth Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Demo doctor route (direct URL access only) */}
        <Route path="/demo/doctor/*" element={<Suspense fallback={<PageLoader />}><DemoDoctor /></Suspense>} />

        <Route path="/solicitud/:token" element={<Suspense fallback={<PageLoader />}><SolicitudDocumento /></Suspense>} />
        <Route path="/privacidad" element={<Suspense fallback={<PageLoader />}><Privacidad /></Suspense>} />
        <Route path="/politicas" element={<Suspense fallback={<PageLoader />}><Privacidad /></Suspense>} />
        <Route path="/legal" element={<Suspense fallback={<PageLoader />}><Legal /></Suspense>} />

        {/* Onboarding Routes */}
        <Route path="/onboarding/role" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingRole /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/basic" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingBasic /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/contact" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingContact /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/doctor" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingDoctor /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/patient" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingPatient /></Suspense></OnlyOnboarding></RequireAuth>} />
        <Route path="/onboarding/done" element={<RequireAuth><OnlyOnboarding><Suspense fallback={<PageLoader />}><OnboardingDone /></Suspense></OnlyOnboarding></RequireAuth>} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/documentos" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Documentos /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/documentos/:id" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><DocumentDetail /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/buscar" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Busqueda /></Suspense></RequireOnboarding></RequireAuth>} />
        {/* Patient-only routes */}
        <Route path="/dashboard/doctores" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['patient']}><Suspense fallback={<PageLoader />}><Doctores /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/doctores/:id" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['patient']}><Suspense fallback={<PageLoader />}><DoctorDetail /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        {/* Doctor-only routes */}
        <Route path="/dashboard/pacientes" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['doctor']}><Suspense fallback={<PageLoader />}><Pacientes /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/pacientes/:id" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['doctor']}><Suspense fallback={<PageLoader />}><PatientDetail /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/consultas" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['patient']}><Suspense fallback={<PageLoader />}><Consultas /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/consultas/nueva" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['patient']}><Suspense fallback={<PageLoader />}><NuevaConsulta /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/agenda" element={<RequireAuth><RequireOnboarding><RequireRole allowedRoles={['doctor']}><Suspense fallback={<PageLoader />}><Agenda /></Suspense></RequireRole></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/configuracion" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Configuracion /></Suspense></RequireOnboarding></RequireAuth>} />
      </Routes>
    </AuthProvider>
    </CryptoProvider>
  )
}

export default App
