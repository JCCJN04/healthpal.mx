import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu,
  X,
  FileText,
  FolderOpen,
  HeartPulse,
  ArrowRight,
  Stethoscope,
  Users,
  ChevronRight,
  CloudUpload,
  Smartphone,
  Share2,
  ClipboardList,
  Calendar,
  Lock,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import Button from '@/shared/components/ui/Button'

/* ─────────────────────────────────────────────
   Scroll-reveal hook
   Fires once when the element enters the viewport.
───────────────────────────────────────────── */
function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          ob.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [delay])

  return { ref, visible }
}

/* ─────────────────────────────────────────────
   Landing
───────────────────────────────────────────── */
export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 overflow-x-hidden">

      {/* ══ NAV ══ */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between">
          <Link to="/" className="flex-shrink-0">
            <img src="/logo.png" alt="HealthPal.mx" className="h-48" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-gray-500">
            <button onClick={() => scrollTo('pacientes')} className="hover:text-gray-900 transition-colors cursor-pointer">
              Pacientes
            </button>
            <button onClick={() => scrollTo('doctores')} className="hover:text-gray-900 transition-colors cursor-pointer">
              Doctores
            </button>
            <button onClick={() => scrollTo('como-funciona')} className="hover:text-gray-900 transition-colors cursor-pointer">
              Cómo funciona
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
            >
              Iniciar sesión
            </Link>
            <Link to="/register">
              <Button variant="primary" className="text-[13px] px-5 py-2 rounded-full">
                Empieza gratis
              </Button>
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 cursor-pointer"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-gray-100 bg-white/95 px-4 pb-5 pt-3 space-y-0.5">
            <button onClick={() => scrollTo('pacientes')} className="flex w-full py-3 text-sm font-medium text-gray-700 hover:text-primary transition-colors cursor-pointer">
              Pacientes
            </button>
            <button onClick={() => scrollTo('doctores')} className="flex w-full py-3 text-sm font-medium text-gray-700 hover:text-primary transition-colors cursor-pointer">
              Doctores
            </button>
            <button onClick={() => scrollTo('como-funciona')} className="flex w-full py-3 text-sm font-medium text-gray-700 hover:text-primary transition-colors cursor-pointer">
              Cómo funciona
            </button>
            <div className="pt-3 flex gap-3">
              <Link to="/login" className="flex-1">
                <Button variant="secondary" fullWidth className="text-sm py-2.5">Iniciar sesión</Button>
              </Link>
              <Link to="/register" className="flex-1">
                <Button variant="primary" fullWidth className="text-sm py-2.5">Regístrate</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex items-center pt-16 pb-16 landing-dot-bg overflow-hidden">
        {/* Subtle glow, not a blob */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 70% 40%, rgba(51,199,190,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-16 items-center">

            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-primary uppercase tracking-[0.14em] mb-8 border border-primary/30 rounded-full px-3.5 py-1.5 bg-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Expediente clínico electrónico · México
              </div>

              <h1 className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] xl:text-[4.4rem] font-black tracking-[-0.03em] leading-[1.06] text-gray-900">
                Tu historial<br />
                médico,{' '}
                <span className="text-primary">siempre</span><br />
                contigo.
              </h1>

              <p className="mt-7 text-gray-500 text-[1.05rem] leading-relaxed max-w-[480px]">
                Centraliza estudios, recetas y diagnósticos. Compártelos
                con tu doctor en segundos. Sin papeles, sin WhatsApp.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link to="/register" state={{ role: 'patient' }}>
                  <Button
                    variant="primary"
                    className="px-7 py-3.5 text-[15px] rounded-full flex items-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <Users size={16} />
                    Soy Paciente
                    <ArrowRight size={14} />
                  </Button>
                </Link>
                <Link
                  to="/register"
                  state={{ role: 'doctor' }}
                  className="flex items-center gap-2 text-[14px] font-semibold text-gray-600 hover:text-primary transition-colors group cursor-pointer"
                >
                  <Stethoscope size={15} />
                  Soy Doctor
                  <ChevronRight size={13} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <p className="mt-5 text-xs text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-primary flex-shrink-0" />
                Sin tarjeta de crédito · Plan básico gratis para siempre
              </p>

              {/* Stats strip */}
              <div className="mt-12 pt-8 border-t border-gray-200/70 grid grid-cols-3 gap-4 max-w-sm">
                {[
                  { n: '100%', sub: 'Privado y encriptado' },
                  { n: 'NOM-024', sub: 'Cumplimiento SSA' },
                  { n: '< 5 min', sub: 'Para empezar' },
                ].map(({ n, sub }) => (
                  <div key={sub}>
                    <p className="text-lg font-black text-gray-900 tracking-tight">{n}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Mockup */}
            <div className="hidden lg:block">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROBLEMA ══ */}
      <ProblemSection />

      {/* ══ PACIENTES ══ */}
      <section id="pacientes" className="py-24 md:py-32">
        <PatientsSection />
      </section>

      {/* ══ DOCTORES ══ */}
      <section id="doctores" className="bg-[#f6fffe] py-24 md:py-32">
        <DoctorsSection />
      </section>

      {/* ══ CÓMO FUNCIONA ══ */}
      <section id="como-funciona" className="py-24 md:py-32">
        <HowItWorksSection />
      </section>

      {/* ══ SEGURIDAD ══ */}
      <SecuritySection />

      {/* ══ CTA FINAL ══ */}
      <CtaSection />

      {/* ══ FOOTER ══ */}
      <footer className="bg-white text-gray-500 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
            <div className="max-w-xs">
              <Link to="/" className="inline-block mb-4">
                <img src="/logo.png" alt="HealthPal.mx" className="h-48 brightness-0 invert" />
              </Link>
              <p className="text-sm leading-relaxed">
                Expedientes médicos digitales para pacientes y doctores en México.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-sm">
              <div>
                <p className="text-gray-300 font-semibold mb-3 text-[13px] uppercase tracking-wider">Plataforma</p>
                <ul className="space-y-2.5">
                  <li>
                    <button onClick={() => scrollTo('pacientes')} className="hover:text-primary transition-colors cursor-pointer">
                      Para Pacientes
                    </button>
                  </li>
                  <li>
                    <button onClick={() => scrollTo('doctores')} className="hover:text-primary transition-colors cursor-pointer">
                      Para Doctores
                    </button>
                  </li>
                  <li>
                    <button onClick={() => scrollTo('como-funciona')} className="hover:text-primary transition-colors cursor-pointer">
                      Cómo Funciona
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-gray-300 font-semibold mb-3 text-[13px] uppercase tracking-wider">Legal</p>
                <ul className="space-y-2.5">
                  <li><a href="#" className="hover:text-primary transition-colors">Aviso de Privacidad</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Términos y Condiciones</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Política de Cookies</a></li>
                </ul>
              </div>
              <div>
                <p className="text-gray-300 font-semibold mb-3 text-[13px] uppercase tracking-wider">Contacto</p>
                <ul className="space-y-2.5">
                  <li>
                    <a href="mailto:healthpalmx@gmail.com" className="hover:text-primary transition-colors">
                      healthpalmx@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>© {new Date().getFullYear()} HealthPal.mx — Todos los derechos reservados.</p>
            <p className="flex items-center gap-1.5">
              Hecho con <HeartPulse size={11} className="text-primary mx-0.5" /> en México
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Dashboard Mockup (hero)
───────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="relative lp-float">
      {/* Main card */}
      <div className="bg-white rounded-[1.5rem] shadow-2xl shadow-gray-300/40 border border-gray-100 p-5 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <HeartPulse className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium leading-none">Expediente</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">María García López</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold bg-green-50 text-green-600 px-2 py-1 rounded-full">
            Activo
          </span>
        </div>

        {/* Document rows */}
        <div className="space-y-1.5">
          {[
            { icon: FileText,     label: 'Análisis de sangre',   date: 'hace 2 días',   color: 'text-blue-500',   bg: 'bg-blue-50' },
            { icon: ClipboardList,label: 'Receta médica',        date: 'hace 1 sem',    color: 'text-green-500',  bg: 'bg-green-50' },
            { icon: FolderOpen,   label: 'Radiografía de tórax', date: 'hace 3 sem',    color: 'text-violet-500', bg: 'bg-violet-50' },
            { icon: HeartPulse,   label: 'Electrocardiograma',   date: 'hace 2 meses',  color: 'text-rose-500',   bg: 'bg-rose-50' },
          ].map(({ icon: Icon, label, date, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                <p className="text-[11px] text-gray-400">{date}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 group-hover:text-gray-500 transition-colors" />
            </div>
          ))}
        </div>

        {/* Upload area */}
        <button className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-primary/25 text-primary text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
          <CloudUpload className="w-3.5 h-3.5" />
          Subir documento
        </button>
      </div>

      {/* Badge: top-right */}
      <div className="absolute -top-5 -right-5 lp-float-alt bg-white rounded-2xl shadow-xl border border-gray-100 px-3.5 py-2.5 flex items-center gap-2.5 z-20">
        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-900 leading-none">Compartido</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Dr. Ramírez · ahora</p>
        </div>
      </div>

      {/* Badge: bottom-left */}
      <div className="absolute -bottom-5 -left-5 lp-float-rev bg-white rounded-2xl shadow-xl border border-gray-100 px-3.5 py-2.5 flex items-center gap-2.5 z-20">
        <Lock className="w-4 h-4 text-primary flex-shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-gray-900 leading-none">AES-256</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Encriptado</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Problem Section  —  editorial numbered list
───────────────────────────────────────────── */
function ProblemSection() {
  const { ref, visible } = useReveal()

  const items = [
    { n: '01', text: 'Llegas a la consulta sin los estudios de tu cita anterior.' },
    { n: '02', text: 'Tu doctor vuelve a preguntarte lo mismo porque no ve tu historial completo.' },
    { n: '03', text: 'Tus análisis están repartidos entre fotos, WhatsApp y archivos, y luego no los encuentras.' },
  ]

  return (
    <section className="bg-[#f3fffe] py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.16em] text-center mb-14">
          ¿Te suena familiar?
        </p>

        <div ref={ref} className="divide-y divide-primary/10">
          {items.map(({ n, text }, i) => (
            <div
              key={n}
              className="flex items-start sm:items-center gap-6 sm:gap-10 py-8 transition-all duration-700 ease-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-24px)',
                transitionDelay: `${i * 90}ms`,
              }}
            >
              <span className="text-[2.8rem] font-black tabular-nums text-primary-dark leading-none flex-shrink-0 w-14 select-none">
                {n}
              </span>
              <p className="text-lg sm:text-xl text-gray-700 leading-relaxed font-light">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Patients Section  —  bento grid
───────────────────────────────────────────── */
function PatientsSection() {
  const { ref, visible } = useReveal()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Heading: split layout */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-10 items-start mb-12">
        <div className="lg:w-[38%]">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.14em]">
            Para Pacientes
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-[-0.025em] text-gray-900 leading-tight">
            Tu historial<br />en tu bolsillo.
          </h2>
        </div>
        <div className="lg:w-[62%] lg:pt-10">
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl">
            Nunca más llegues a una consulta con estudios incompletos o recetas perdidas.
          </p>
        </div>
      </div>

      {/* Bento grid */}
      <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Large card — spans 2 cols on lg */}
        <div
          className="lg:col-span-2 rounded-3xl p-8 flex flex-col gap-5 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-white to-teal-50 border border-primary/15 shadow-sm"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transitionDelay: '0ms' }}
        >
          <FolderOpen className="w-7 h-7 text-primary" />
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Expediente Digital Completo</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Estudios, recetas, análisis de laboratorio y diagnósticos en un solo lugar,
              organizados por fecha y categoría. Siempre disponibles.
            </p>
          </div>
          <div className="mt-auto space-y-2">
            {['Análisis de sangre', 'Receta médica', 'Radiografía de tórax'].map((doc) => (
              <div key={doc} className="flex items-center gap-2.5 bg-white/80 rounded-lg px-3 py-2 border border-primary/10">
                <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs text-gray-700">{doc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card: dispositivo */}
        <div
          className="bg-primary/5 border border-primary/12 rounded-3xl p-7 transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transitionDelay: '80ms' }}
        >
          <Smartphone className="w-7 h-7 text-primary mb-5" />
          <h3 className="font-bold text-gray-900 mb-2 leading-snug">Desde cualquier dispositivo</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Teléfono, tablet o computadora. Sin instalar nada extra.
          </p>
        </div>

        {/* Card: comparte */}
        <div
          className="bg-white border border-gray-100 shadow-sm rounded-3xl p-7 transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transitionDelay: '160ms' }}
        >
          <Share2 className="w-7 h-7 text-primary mb-5" />
          <h3 className="font-bold text-gray-900 mb-2 leading-snug">Comparte con tu Doctor</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Envía documentos de forma segura antes o durante la consulta.
          </p>
        </div>

        {/* Card: historial */}
        <div
          className="bg-white border border-gray-100 shadow-sm rounded-3xl p-7 transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transitionDelay: '240ms' }}
        >
          <HeartPulse className="w-7 h-7 text-primary mb-5" />
          <h3 className="font-bold text-gray-900 mb-2 leading-snug">Historial Cronológico</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            La evolución de tu salud en una línea de tiempo clara.
          </p>
        </div>

        {/* Card: CTA pill */}
        <div
          className="bg-primary rounded-3xl p-7 flex flex-col justify-between transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transitionDelay: '320ms' }}
        >
          <h3 className="text-lg font-bold text-white leading-tight">
            Empieza<br />en minutos
          </h3>
          <Link to="/register" state={{ role: 'patient' }}>
            <button className="mt-6 w-full bg-white text-primary font-semibold text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer">
              Crear cuenta gratis →
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Doctors Section  —  2-col: heading left, list right
───────────────────────────────────────────── */
function DoctorsSection() {
  const { ref, visible } = useReveal()

  const features = [
    { icon: FileText,      title: 'Expediente Clínico Electrónico', desc: 'Crea y gestiona el historial completo de cada paciente: notas, diagnósticos, evolución clínica.' },
    { icon: CloudUpload,   title: 'Sube Estudios y Recetas',        desc: 'Digitaliza y comparte documentos directamente con el paciente en segundos.' },
    { icon: Calendar,      title: 'Agenda Integrada',               desc: 'Citas y seguimientos vinculados al expediente de cada paciente.' },
    { icon: ClipboardList, title: 'Sin Papel, Sin Desorden',        desc: 'Accede al historial completo antes de cada consulta, desde donde estés.' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-20 items-start">

        {/* Left: sticky heading */}
        <div className="lg:sticky lg:top-24">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.14em]">
            Para Doctores
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-[-0.025em] text-gray-900 leading-tight">
            El expediente de<br />
            cada paciente,{' '}
            <span className="text-primary">siempre listo.</span>
          </h2>
          <p className="mt-5 text-gray-500 text-base leading-relaxed">
            Llega a cada consulta con el historial completo. Sin papeles, sin desorden.
          </p>
          <Link
            to="/register"
            state={{ role: 'doctor' }}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all cursor-pointer"
          >
            Crear cuenta de Doctor <ArrowRight size={14} />
          </Link>
        </div>

        {/* Right: feature list */}
        <div ref={ref} className="space-y-3">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="flex items-start gap-5 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-default"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(28px)',
                transitionDuration: '600ms',
                transitionDelay: `${i * 80}ms`,
                transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   How it works  —  oversized decorative numbers
───────────────────────────────────────────── */
function HowItWorksSection() {
  const { ref, visible } = useReveal()

  const steps = [
    { icon: UserPlus,    title: 'Crea tu cuenta gratis',       desc: 'Solo tu correo y datos básicos. Sin tarjeta de crédito, en menos de 2 minutos.' },
    { icon: CloudUpload, title: 'Sube tus documentos',          desc: 'Arrastra estudios, recetas e imágenes. Los organizamos por fecha y categoría.' },
    { icon: Smartphone,  title: 'Accede desde cualquier lugar', desc: 'Tu historial completo, seguro y listo para compartir con tu doctor.' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.14em]">
          Cómo funciona
        </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-[-0.025em] text-gray-900">
          Empieza en 3 pasos
        </h2>
      </div>

      <div ref={ref} className="grid md:grid-cols-3 gap-8 lg:gap-14">
        {steps.map(({ icon: Icon, title, desc }, i) => (
          <div
            key={title}
            className="relative"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(36px)',
              transitionDuration: '700ms',
              transitionDelay: `${i * 110}ms`,
              transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Decorative large number */}
            <span
              className="absolute -top-2 -left-1 text-[5.5rem] font-black leading-none select-none pointer-events-none text-gray-100 z-0"
              aria-hidden
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            {/* Content */}
            <div className="relative z-10 pt-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/15">
                <Icon className="w-5 h-5 text-primary-dark" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Security  —  minimal dark, no gradient band
───────────────────────────────────────────── */
function SecuritySection() {
  const { ref, visible } = useReveal()

  return (
    <section className="bg-white py-16 md:py-20">
      <div
        ref={ref}
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ease-out"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)' }}
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-7 border border-primary/15">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
          Tu información está protegida
        </h2>
        <p className="text-gray-600 mb-10 max-w-sm mx-auto text-[15px] leading-relaxed">
          Aplicamos los más altos estándares de seguridad para tu historial médico.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
          {[
            { icon: ShieldCheck, label: 'Encriptación AES-256' },
            { icon: CheckCircle2, label: 'Cumple NOM-024-SSA3' },
            { icon: Lock, label: 'Acceso solo con tu cuenta' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-gray-700">
              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   CTA Final  —  single dark card
───────────────────────────────────────────── */
function CtaSection() {
  const { ref, visible } = useReveal()

  return (
    <section className="py-24 md:py-32 bg-[#f8fffe]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="rounded-[2rem] px-8 py-14 md:px-16 md:py-20 text-center transition-all duration-700 ease-out bg-gradient-to-br from-white via-[#f3fffe] to-primary/10 border border-primary/15 shadow-xl shadow-primary/10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.97)',
          }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-[1.1] tracking-[-0.03em] mb-5">
            Empieza hoy.
            <br />
            <span className="text-primary">Es gratis.</span>
          </h2>
          <p className="text-gray-600 text-[1.05rem] mb-10 max-w-sm mx-auto leading-relaxed">
            Únete como paciente o como doctor. Tu cuenta básica no tiene costo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" state={{ role: 'patient' }}>
              <Button
                variant="primary"
                className="px-8 py-3.5 text-[15px] rounded-full flex items-center gap-2"
              >
                <Users size={16} />
                Soy Paciente
              </Button>
            </Link>
            <Link
              to="/register"
              state={{ role: 'doctor' }}
              className="px-8 py-3.5 text-[15px] rounded-full border border-primary/20 text-gray-700 hover:border-primary hover:text-primary transition-colors font-semibold flex items-center gap-2 cursor-pointer bg-white/80"
            >
              <Stethoscope size={16} />
              Soy Doctor
            </Link>
          </div>
          <p className="mt-8 text-xs text-gray-500">
            Sin tarjeta de crédito · Configura tu cuenta en menos de 5 minutos
          </p>
        </div>
      </div>
    </section>
  )
}
