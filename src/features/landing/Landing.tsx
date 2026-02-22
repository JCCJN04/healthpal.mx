import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu,
  X,
  CalendarCheck,
  FileText,
  Search,
  ClipboardList,
  CloudUpload,
  ShieldCheck,
  UserPlus,
  Settings,
  HeartPulse,
  ArrowRight,
  Stethoscope,
  Users,
  ChevronRight,} from 'lucide-react'
import Button from '@/shared/components/ui/Button'

/* ------------------------------------------------------------------ */
/*  Landing Page – HealthPal.mx                                       */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 scroll-smooth">
      {/* ===== HEADER / NAV ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-primary tracking-tight">
              HealthPal<span className="text-gray-400 font-normal">.mx</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <button onClick={() => scrollTo('pacientes')} className="hover:text-primary transition-colors">
              Para Pacientes
            </button>
            <button onClick={() => scrollTo('doctores')} className="hover:text-primary transition-colors">
              Para Doctores
            </button>
            <button onClick={() => scrollTo('beneficios')} className="hover:text-primary transition-colors">
              Beneficios
            </button>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="secondary" className="text-sm px-4 py-2">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" className="text-sm px-4 py-2">
                Regístrate
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Menú"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
            <button onClick={() => scrollTo('pacientes')} className="block w-full text-left py-2 text-sm text-gray-700 hover:text-primary">
              Para Pacientes
            </button>
            <button onClick={() => scrollTo('doctores')} className="block w-full text-left py-2 text-sm text-gray-700 hover:text-primary">
              Para Doctores
            </button>
            <button onClick={() => scrollTo('beneficios')} className="block w-full text-left py-2 text-sm text-gray-700 hover:text-primary">
              Beneficios
            </button>
            <hr className="border-gray-100" />
            <div className="flex gap-3 pt-1">
              <Link to="/login" className="flex-1">
                <Button variant="secondary" fullWidth className="text-sm py-2">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/register" className="flex-1">
                <Button variant="primary" fullWidth className="text-sm py-2">
                  Regístrate
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <ShieldCheck size={14} />
            Plataforma segura y confiable
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
            Tu salud y la de tus <br className="hidden sm:inline" />
            pacientes, <span className="text-primary">en un solo lugar</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Expediente clínico electrónico, agenda inteligente y comunicación
            directa entre pacientes y doctores — todo en una plataforma segura.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" state={{ role: 'patient' }}>
              <Button variant="primary" className="px-8 py-3.5 text-base flex items-center gap-2">
                <Users size={18} />
                Soy Paciente
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/register" state={{ role: 'doctor' }}>
              <Button variant="secondary" className="px-8 py-3.5 text-base flex items-center gap-2">
                <Stethoscope size={18} />
                Soy Doctor
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>


        </div>
      </section>

      {/* ===== PARA PACIENTES ===== */}
      <section id="pacientes" className="bg-gray-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section heading */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              Para Pacientes
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Todo lo que necesitas para cuidar tu salud
            </h2>
            <p className="mt-4 text-gray-500 text-lg">
              Desde encontrar al especialista ideal hasta tener tu historial
              médico siempre a la mano.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureCard
              icon={<CalendarCheck className="w-6 h-6 text-primary" />}
              title="Agenda citas fácilmente"
              description="Busca disponibilidad y agenda con tu doctor en segundos. Recibe recordatorios automáticos."
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6 text-primary" />}
              title="Historial médico digital"
              description="Accede a tus expedientes, recetas y resultados desde cualquier dispositivo, siempre disponibles."
            />
            <FeatureCard
              icon={<Search className="w-6 h-6 text-primary" />}
              title="Encuentra especialistas"
              description="Busca doctores por especialidad, ubicación y disponibilidad. Lee opiniones de otros pacientes."
            />
          </div>
        </div>
      </section>

      {/* ===== PARA DOCTORES ===== */}
      <section id="doctores" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              Para Doctores
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Herramientas que potencian tu práctica
            </h2>
            <p className="mt-4 text-gray-500 text-lg">
              Optimiza tu tiempo, mantén expedientes organizados y ofrece una
              mejor experiencia a tus pacientes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureCard
              icon={<ClipboardList className="w-6 h-6 text-primary" />}
              title="Agenda inteligente"
              description="Gestiona tu calendario con confirmaciones automáticas, evitando huecos y mejorando tu productividad."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6 text-primary" />}
              title="Expedientes seguros"
              description="Historial clínico completo de cada paciente: notas, documentos y evolución en un solo lugar."
            />
            <FeatureCard
              icon={<CloudUpload className="w-6 h-6 text-primary" />}
              title="Documentos en la nube"
              description="Sube y organiza estudios, recetas e imágenes. Comparte documentos con tus pacientes de forma segura."
            />
          </div>
        </div>
      </section>

      {/* ===== BENEFICIOS / CÓMO FUNCIONA ===== */}
      <section id="beneficios" className="bg-gray-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              Cómo Funciona
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Comienza en 3 sencillos pasos
            </h2>
            <p className="mt-4 text-gray-500 text-lg">
              Sin complicaciones, sin papeleos — tu salud digital lista en
              minutos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <StepCard
              step={1}
              icon={<UserPlus className="w-7 h-7 text-primary" />}
              title="Crea tu cuenta"
              description="Regístrate como paciente o doctor. Solo necesitas tu correo y unos datos básicos."
            />
            <StepCard
              step={2}
              icon={<Settings className="w-7 h-7 text-primary" />}
              title="Personaliza tu perfil"
              description="Completa tu información médica o profesional para una experiencia personalizada."
            />
            <StepCard
              step={3}
              icon={<HeartPulse className="w-7 h-7 text-primary" />}
              title="¡Listo!"
              description="Agenda citas, gestiona expedientes y comunícate de forma segura desde un solo lugar."
            />
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            ¿Listo para transformar tu experiencia de salud?
          </h2>
          <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
            Únete a HealthPal.mx y descubre una forma más inteligente de
            gestionar tu salud o tu consulta médica.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" className="px-8 py-3.5 text-base flex items-center gap-2">
                Crear mi cuenta gratis
                <ChevronRight size={18} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="px-8 py-3.5 text-base">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <HeartPulse className="w-6 h-6 text-primary" />
                <span className="text-lg font-bold text-white">
                  HealthPal<span className="text-gray-500 font-normal">.mx</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed">
                Plataforma integral de salud que conecta pacientes y doctores de
                forma segura y eficiente.
              </p>
            </div>

            {/* Links: Producto */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Producto</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button onClick={() => scrollTo('pacientes')} className="hover:text-primary transition-colors">
                    Para Pacientes
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('doctores')} className="hover:text-primary transition-colors">
                    Para Doctores
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('beneficios')} className="hover:text-primary transition-colors">
                    Cómo Funciona
                  </button>
                </li>
              </ul>
            </div>

            {/* Links: Legal */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Aviso de Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Términos y Condiciones
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Política de Cookies
                  </a>
                </li>
              </ul>
            </div>

            {/* Links: Contacto */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Contacto</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="mailto:contacto@healthpal.mx" className="hover:text-primary transition-colors">
                    contacto@healthpal.mx
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Twitter / X
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>&copy; {new Date().getFullYear()} HealthPal.mx — Todos los derechos reservados.</p>
            <p className="flex items-center gap-1">
              Hecho con <HeartPulse size={12} className="text-primary" /> en México
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="relative text-center">
      {/* Step number */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5 relative">
        {icon}
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-sm">
          {step}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{description}</p>

      {/* Connector line (hidden on last) */}
      {step < 3 && (
        <div className="hidden md:block absolute top-7 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px border-t-2 border-dashed border-gray-200" />
      )}
    </div>
  )
}
