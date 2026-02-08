import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import RequireOnboarding from './components/RequireOnboarding'
import OnlyOnboarding from './components/OnlyOnboarding'
import { ToastContainer } from './components/Toast'

// Eager load critical auth pages (small, needed immediately)
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Register from './pages/Register'

// Lazy load dashboard pages (large, only needed after auth)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Documentos = lazy(() => import('./pages/Documentos'))
const DocumentDetail = lazy(() => import('./pages/DocumentDetail'))
const Consultas = lazy(() => import('./pages/Consultas'))
const ConsultaDetail = lazy(() => import('./pages/ConsultaDetail'))
const NuevaConsulta = lazy(() => import('./pages/NuevaConsulta'))
const Mensajes = lazy(() => import('./pages/Mensajes'))
const Doctores = lazy(() => import('./pages/Doctores'))
const DoctorDetail = lazy(() => import('./pages/DoctorDetail'))
const Calendario = lazy(() => import('./pages/Calendario'))
const Configuracion = lazy(() => import('./pages/Configuracion'))

// Lazy load onboarding pages
const OnboardingRole = lazy(() => import('./pages/onboarding/OnboardingRole'))
const OnboardingBasic = lazy(() => import('./pages/onboarding/OnboardingBasic'))
const OnboardingContact = lazy(() => import('./pages/onboarding/OnboardingContact'))
const OnboardingDoctor = lazy(() => import('./pages/onboarding/OnboardingDoctor'))
const OnboardingPatient = lazy(() => import('./pages/onboarding/OnboardingPatient'))
const OnboardingDone = lazy(() => import('./pages/onboarding/OnboardingDone'))

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
        <Route path="/dashboard/consultas/:id" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><ConsultaDetail /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/consultas/nueva" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><NuevaConsulta /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/mensajes" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Mensajes /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/doctores" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Doctores /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/doctores/:id" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><DoctorDetail /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/calendario" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Calendario /></Suspense></RequireOnboarding></RequireAuth>} />
        <Route path="/dashboard/configuracion" element={<RequireAuth><RequireOnboarding><Suspense fallback={<PageLoader />}><Configuracion /></Suspense></RequireOnboarding></RequireAuth>} />
      </Routes>
    </AuthProvider>
  )
}

export default App
