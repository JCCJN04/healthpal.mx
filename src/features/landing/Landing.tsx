import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { X, Menu, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import Lenis from 'lenis'

/* ─────────────────────────────────────────────
   Lenis smooth scroll (same config as HT)
───────────────────────────────────────────── */
function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.7,
      touchMultiplier: 2,
    })
    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])
}

/* ─────────────────────────────────────────────
   Word-reveal (HT's signature text animation)
   Each word slides up from overflow-hidden clip
───────────────────────────────────────────── */
interface WordRevealProps {
  children: string
  className?: string
  baseDelay?: number
  stagger?: number
  tag?: 'h1' | 'h2' | 'h3' | 'p'
}
function WordReveal({ children, className = '', baseDelay = 0, stagger = 70, tag: Tag = 'h2' }: WordRevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); ob.disconnect() } },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  const words = children.split(' ')

  return (
    <Tag ref={ref as React.RefObject<HTMLHeadingElement>} className={className} style={{ willChange: 'transform' }}>
      {words.map((word, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.05em' }}>
          <span
            style={{
              display: 'inline-block',
              transform: visible ? 'translateY(0) rotate(0deg)' : 'translateY(110%) rotate(2deg)',
              opacity: visible ? 1 : 0,
              transition: `transform 0.75s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease`,
              transitionDelay: `${baseDelay + i * stagger}ms`,
              willChange: 'transform',
            }}
          >
            {word}
          </span>
          {i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </Tag>
  )
}

/* ─────────────────────────────────────────────
   Fade-up reveal (for non-text elements)
───────────────────────────────────────────── */
function useFadeUp(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); ob.disconnect() } },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [])
  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(2rem)',
    transition: `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    willChange: 'transform',
  }
  return { ref, style, visible }
}

/* ─────────────────────────────────────────────
   Count-up hook
───────────────────────────────────────────── */
function useCountUp(target: number, visible: boolean, duration = 1800) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!visible) return
    let start = 0
    const steps = duration / 16
    const step = target / steps
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [visible, target, duration])
  return count
}

/* ─────────────────────────────────────────────
   Hero Ribbon — video (exact HT Cloudinary source)
───────────────────────────────────────────── */
function HeroRibbon() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" aria-hidden="true">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute w-full h-full object-cover"
        style={{ opacity: 0.85 }}
      >
        <source
          src="https://res.cloudinary.com/healthytogether/video/upload/v1670361640/htio/home/video/hero-waveform_VP9.webm"
          type="video/webm"
        />
        <source
          src="https://res.cloudinary.com/healthytogether/video/upload/v1670361640/htio/home/video/hero-waveform-1.mov"
          type="video/quicktime"
        />
      </video>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Page loader (HT has one)
───────────────────────────────────────────── */
function PageLoader() {
  const [fading, setFading] = useState(false)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 700)
    const t2 = setTimeout(() => setGone(true), 1100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  if (gone) return null
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: '#0f0e19',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }}
    >
      <div
        className="w-10 h-10 rounded-full border-2 border-transparent"
        style={{
          borderTopColor: '#ff3eb5',
          borderRightColor: '#8b3fff',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Announcement Bar (slides down on mount)
───────────────────────────────────────────── */
function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 200); return () => clearTimeout(t) }, [])
  if (dismissed) return null
  return (
    <div
      className="bg-[#ef6e74] text-white relative z-50 overflow-hidden"
      style={{
        maxHeight: visible ? '60px' : '0px',
        opacity: visible ? 1 : 0,
        transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4 text-[13px] font-medium">
        <span className="hidden sm:block shrink-0">HealthPal ya está disponible para médicos en México 🇲🇽</span>
        <span className="text-center flex-1">
          Digitaliza tu consultorio gratis — Expediente clínico, agenda y WhatsApp en un solo lugar
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 hover:opacity-70 transition-opacity cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Navbar
───────────────────────────────────────────── */
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <header
      className="fixed top-0 w-full z-50 transition-all duration-300"
      style={{ backgroundColor: scrolled ? 'rgba(16,23,34,0.98)' : 'rgba(16,23,34,0.8)', backdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src="/logograndenofondo.png" alt="HealthPal.mx" className="h-7 md:h-8 w-auto object-contain" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-white/70">
          <a href="#plataforma" className="hover:text-white transition-colors">Plataforma</a>
          <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
          <a href="#seguridad" className="hover:text-white transition-colors">Seguridad</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-[13px] font-medium text-white/60 hover:text-white transition-colors">
            Iniciar sesión
          </Link>
          <Link to="/register">
            <button className="bg-[#0097a9] text-white text-[13px] font-semibold px-5 py-2 rounded-full hover:bg-[#007f89] transition-colors">
              Empieza gratis
            </button>
          </Link>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white p-2 cursor-pointer">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}
        style={{ backgroundColor: 'rgba(16,23,34,0.98)' }}
      >
        <div className="px-6 pb-6 pt-3 space-y-1 border-t border-white/10">
          <a href="#plataforma" className="flex w-full py-3 text-sm font-medium text-white/70 hover:text-white transition-colors">Plataforma</a>
          <a href="#como-funciona" className="flex w-full py-3 text-sm font-medium text-white/70 hover:text-white transition-colors">Cómo funciona</a>
          <a href="#seguridad" className="flex w-full py-3 text-sm font-medium text-white/70 hover:text-white transition-colors">Seguridad</a>
          <div className="pt-4 flex gap-3">
            <Link to="/login" className="flex-1">
              <button className="w-full border border-white/20 text-white text-sm py-2.5 rounded-full">Iniciar sesión</button>
            </Link>
            <Link to="/register" className="flex-1">
              <button className="w-full bg-[#0097a9] text-white text-sm font-semibold py-2.5 rounded-full">Empieza gratis</button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────
   Hero (dark + ribbon + animated heading)
───────────────────────────────────────────── */
function Hero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 1000); return () => clearTimeout(t) }, [])

  return (
    <section id="plataforma" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#0f0e19' }}>
      <HeroRibbon />

      <div className="relative z-20 text-center px-6 max-w-[1000px] mx-auto pt-[68px]">
        {/* Hero heading - word-by-word on mount */}
        <h1
          className="text-[3.2rem] sm:text-[4.5rem] md:text-[6.8rem] lg:text-[7.5rem] font-black text-white leading-[0.92] tracking-[-0.04em]"
          style={{ willChange: 'transform' }}
        >
          {['Tus', 'expedientes,', 'siempre', 'contigo.'].map((word, i) => (
            <span key={word + i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.06em', marginRight: '0.22em' }}>
              <span
                style={{
                  display: 'inline-block',
                  transform: mounted ? 'translateY(0) rotate(0deg)' : 'translateY(110%) rotate(3deg)',
                  opacity: mounted ? 1 : 0,
                  transition: `transform 0.9s cubic-bezier(0.16,1,0.3,1), opacity 0.6s ease`,
                  transitionDelay: `${1000 + i * 80}ms`,
                  willChange: 'transform',
                }}
              >
                {word}
              </span>
            </span>
          ))}
        </h1>

        <p
          className="mt-8 text-[0.98rem] sm:text-[1.05rem] md:text-[1.15rem] text-white/50 leading-relaxed max-w-[480px] mx-auto"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease 1.7s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 1.7s',
          }}
        >
          Accesa al expediente de tus pacientes en segundos. Con WhatsApp integrado, enviar archivos es tan fácil como mandar un mensaje.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.7s ease 1.9s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.9s',
          }}
        >
          <Link to="/register" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-[#0097a9] text-white text-[15px] font-semibold px-8 py-3.5 rounded-full hover:bg-[#007f89] transition-all hover:scale-105 active:scale-95">
              Crear cuenta gratis
            </button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto text-center text-white/50 text-[14px] font-medium hover:text-white transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Problem Card (blue rounded card, word reveal)
───────────────────────────────────────────── */
function ProblemCard() {
  const { ref, style } = useFadeUp(0)
  return (
    <section className="py-16 px-6" style={{ backgroundColor: '#f9f0ff' }}>
      <div className="max-w-[1100px] mx-auto">
        <div ref={ref} style={style}>
          <div className="rounded-[28px] px-6 py-14 sm:px-12 sm:py-20 md:px-20 md:py-28 text-center" style={{ backgroundColor: '#0097a9' }}>
            <WordReveal
              tag="h2"
              className="text-[2rem] sm:text-[3.2rem] md:text-[4.5rem] font-black text-white leading-[1.0] tracking-[-0.03em]"
              stagger={60}
            >
              Decenas de pacientes en WhatsApp. Tus pacientes te vuelven a preguntar lo mismo. Análisis perdidos entre fotos y mensajes.
            </WordReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Speed Section (gradient text + mockup)
───────────────────────────────────────────── */
function SpeedSection() {
  const { ref: titleRef, style: titleStyle } = useFadeUp(0)
  const { ref: mockupRef, style: mockupStyle } = useFadeUp(150)

  return (
    <section id="como-funciona" className="pt-8 pb-0 overflow-hidden" style={{ backgroundColor: '#f9f0ff' }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div ref={titleRef} style={titleStyle} className="text-center">
          <h2 className="text-[3.5rem] sm:text-[5rem] md:text-[6.5rem] font-black leading-[0.95] tracking-[-0.04em] mb-6">
            <span
              className="inline bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, #ff3eb5 0%, #8b3fff 30%, #0097a9 100%)' }}
            >
              Todo en un solo lugar,
            </span>
            <br />
            <span style={{ color: '#101722' }}>al alcance de tu celular.</span>
          </h2>

          <Link to="/register">
            <button
              className="text-white text-[15px] font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-all hover:scale-105 active:scale-95 mt-2 mb-16"
              style={{ backgroundColor: '#0097a9' }}
            >
              Ver cómo funciona
            </button>
          </Link>
        </div>

        {/* Mockup — stacked on mobile, side-by-side on md+ */}
        <div ref={mockupRef} style={mockupStyle} className="relative mt-4 pb-0">
          {/* Floating decorations — hidden on small screens */}
          <div className="lp-float hidden md:block absolute left-[2%] top-[10%] w-12 h-12 rounded-full opacity-60" style={{ background: 'linear-gradient(135deg, #8b3fff, #4541fe)' }} />
          <div className="lp-float-alt hidden md:block absolute left-[9%] top-[55%] opacity-55" style={{ width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderBottom: '26px solid #ff3eb5' }} />
          <div className="lp-float-rev hidden md:block absolute right-[5%] top-[8%] w-10 h-10 rounded-full opacity-50" style={{ background: 'linear-gradient(135deg, #ff3eb5, #8b3fff)' }} />

          {/* Desktop: side-by-side. Mobile: dashboard full-width, phone centered below */}
          <div className="flex flex-col md:flex-row justify-center items-end gap-6">
            <div className="relative z-10 w-full max-w-[520px] sm:max-w-[640px] md:max-w-[840px] lg:max-w-[980px] mx-auto md:mx-0">
              <DashboardMockup />
            </div>
            <div className="relative z-20 hidden md:flex justify-center md:w-auto md:block md:-mb-8 md:-ml-10">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DashboardMockup() {
  return (
    <div className="shadow-[0_40px_80px_rgba(0,0,0,0.12)] rounded-t-xl overflow-hidden w-full">
      {/* Title bar */}
      <div className="bg-[#1e1e2e] px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-[#2a2a3e] rounded h-6 flex items-center px-3 text-[10px] text-white/30 min-w-0">healthpal.mx/dashboard</div>
      </div>

      <div className="bg-white min-h-[220px] sm:min-h-[280px] md:min-h-[320px]">
        <img
          src="/CapturaDashboardHP.png"
          alt="Captura del dashboard de HealthPal"
          className="block w-full h-full object-cover"
        />
      </div>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="flex-shrink-0 relative" style={{ width: '250px', maxWidth: '100%' }}>
      <img
        src="/iphone17pro.png"
        alt="Mockup de iPhone con documentos"
        className="block w-full h-auto"
      />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Human Centered Section
───────────────────────────────────────────── */
function HumanCenteredSection() {
  const { ref, style } = useFadeUp(0)
  const whatsappUrl =
    'https://web.whatsapp.com/send?phone=528132443754&text=Hola%20HealthPal%2C%20quiero%20conocer%20c%C3%B3mo%20funciona%20la%20plataforma.'

  return (
    <section className="bg-white overflow-hidden">
      <div ref={ref} style={style} className="max-w-[1200px] mx-auto grid lg:grid-cols-2 items-center gap-0">
        <div className="h-[420px] lg:h-[580px] relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="w-full max-w-[520px]">
              <div className="relative mx-auto w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[320px] overflow-hidden rounded-[22px] bg-[#0b0d16] aspect-[9/16]">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src="https://www.youtube-nocookie.com/embed/POBEtHq4JwU?rel=0"
                  title="Video de HealthPal"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-10 py-16 lg:px-16 lg:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#101722]/10 bg-[#101722]/5 px-4 py-2 text-[12px] font-semibold text-[#101722]/70 mb-6">
            Conoce cómo funciona la plataforma
          </div>
          <h2 className="text-[2.8rem] md:text-[3.8rem] lg:text-[4.5rem] font-black leading-[0.95] tracking-[-0.04em] mb-8 text-[#101722] max-w-[10ch]">
            Todo lo que necesitas, en un solo lugar.
          </h2>
          <p className="text-[15px] leading-relaxed mb-8 text-[#666] max-w-[540px]">
            1. Mira el video para entender cómo funciona la plataforma.
            <br />
            2. Abre WhatsApp y ponte en contacto con nosotros con un simple click.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-7 py-3.5 text-[14px] font-semibold text-[#0f0e19] transition-all hover:scale-105 active:scale-95"
            >
              Contactar por WhatsApp Web
            </a>
            <Link to="/register" state={{ role: 'patient' }}>
              <button className="rounded-full border border-[#101722]/10 px-7 py-3.5 text-[14px] font-semibold text-[#101722] transition-all hover:border-[#101722]/20 hover:bg-[#101722]/5">
                Registra tu consultorio gratis
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   AI Section (purple lavender bg)
───────────────────────────────────────────── */
function AISection() {
  const { ref, style } = useFadeUp(0)
  return (
    <section id="seguridad" className="overflow-hidden relative" style={{ backgroundColor: '#d9c6ff' }}>
      {/* Animated ribbon decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg viewBox="0 0 800 700" className="absolute left-0 top-0 h-full w-auto opacity-25">
          <defs>
            <linearGradient id="aiRib" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff3eb5" />
              <stop offset="100%" stopColor="#4541fe" />
            </linearGradient>
          </defs>
          <path className="ribbon-anim" d="M -100 300 Q 100 150 250 200 Q 400 250 350 400 Q 300 550 150 600 Q 0 650 -100 500 Z" fill="url(#aiRib)" opacity="0.9" />
        </svg>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-24 relative z-10">
        <div ref={ref} style={style} className="text-center">
          <WordReveal
            tag="h2"
            className="text-[3rem] sm:text-[4.5rem] md:text-[6rem] font-black leading-[0.95] tracking-[-0.04em] mb-6 max-w-[800px] mx-auto"
            stagger={55}
          >
            Cumplimiento NOM-024. Privacidad real. Cifrado total.
          </WordReveal>
          <p className="text-[15px] max-w-[460px] mx-auto mb-14" style={{ color: '#101722', opacity: 0.55 }}>
            Tu información médica protegida con cifrado AES-256, cumplimiento con la NOM-024-SSA3 y sin acceso de terceros. Lo que es tuyo, es tuyo.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Scale Section (indigo blue + count-up)
───────────────────────────────────────────── */
function ScaleSection() {
  const { ref, style } = useFadeUp(0)
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); ob.disconnect() } }, { threshold: 0.2 })
    ob.observe(el)
    return () => ob.disconnect()
  }, [])
  const c1 = useCountUp(2625, statsVisible)
  const c2 = useCountUp(3250, statsVisible)
  const c3 = useCountUp(6281, statsVisible)

  return (
    <section className="overflow-hidden relative py-24" style={{ backgroundColor: '#4541fe' }}>
      <div className="lp-float absolute left-[4%] top-[18%] w-20 h-20 rounded-full opacity-15" style={{ background: 'linear-gradient(135deg, #ff3eb5, white)' }} />
      <div className="lp-float-rev absolute right-[7%] bottom-[12%] opacity-15" style={{ width: 0, height: 0, borderLeft: '30px solid transparent', borderRight: '30px solid transparent', borderBottom: '52px solid #ff3eb5' }} />

      <div className="max-w-[1100px] mx-auto px-6 relative z-10">
        <div className="text-center mb-4">
          <WordReveal
            tag="h2"
            className="text-[2.4rem] sm:text-[4rem] md:text-[5.5rem] lg:text-[6rem] font-black text-white leading-[0.95] tracking-[-0.04em] mb-6 max-w-[800px] mx-auto"
            stagger={60}
          >
            Lo que logran los médicos que usan HealthPal.
          </WordReveal>
        </div>
        <div ref={ref} style={style} className="text-center mb-12">
          <p className="text-white/60 text-[14px] mb-6 max-w-[560px] mx-auto leading-relaxed">
            Menos tiempo en papeleo, más tiempo con pacientes. Médicos en México ahorran hasta 2 horas diarias con HealthPal.
          </p>
          <Link to="/register">
            <button className="bg-white text-[#0097a9] text-[15px] font-bold px-8 py-3.5 rounded-full hover:opacity-90 hover:scale-105 active:scale-95 transition-all">
              Conoce nuestro impacto
            </button>
          </Link>
        </div>

        {/* Stats count-up */}
        <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/15 mb-10 rounded-xl overflow-hidden">
          {[[c1.toLocaleString(), 'Pacientes activos'], [c2.toLocaleString(), 'Consultas este mes'], [c3.toLocaleString(), 'Documentos subidos']].map(([v, l]) => (
            <div key={l} className="py-8 px-6 text-center" style={{ backgroundColor: '#4541fe' }}>
              <p className="text-[2.5rem] md:text-[3.5rem] font-black text-white leading-none tracking-[-0.04em]">{v}</p>
              <p className="text-[12px] text-white/50 mt-2 uppercase tracking-wide">{l}</p>
            </div>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="rounded-t-2xl overflow-hidden shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
          <div className="bg-[#0f0e19] px-4 py-2.5 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 bg-white/10 rounded h-5 flex items-center px-3 text-[9px] text-white/30">healthpal.mx</div>
          </div>
          <div className="bg-[#0d1117] p-6" style={{ height: '260px' }}>
            <p className="text-white font-bold text-[14px] mb-5">Dashboard</p>
            <div className="flex items-end gap-2 h-32">
              {[40, 65, 55, 80, 70, 90, 75, 85, 60, 95, 80, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all duration-700"
                  style={{
                    height: statsVisible ? `${h}%` : '0%',
                    backgroundColor: `rgba(69,65,254,${0.3 + h / 200})`,
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Testimonials (Swiper-like, auto-advance)
───────────────────────────────────────────── */
const TESTIMONIALS = [
  { source: '🟢', platform: 'WhatsApp', name: 'Dra. Alejandra R.', location: 'CDMX', stars: 5, text: 'Mis pacientes me mandan sus estudios por WhatsApp y los tengo listos antes de que lleguen a consulta. HealthPal cambió completamente mi flujo de trabajo.' },
  { source: '⭐', platform: 'App Store', name: 'Roberto Méndez', location: 'Guadalajara', stars: 5, text: 'Tenía años buscando una plataforma así. Subí todos mis estudios en una tarde y ahora los comparto con cualquier médico en segundos.' },
  { source: '🔵', platform: 'Google Play', name: 'Dr. Marco Herrera', location: 'Monterrey', stars: 5, text: 'La agenda integrada y el expediente en un solo lugar es un antes y un después. Ya no pierdo tiempo buscando archivos entre consulta y consulta.' },
  { source: '🟢', platform: 'WhatsApp', name: 'Carmen Ortiz', location: 'Puebla', stars: 5, text: 'Llevaba mis estudios en una bolsa de plástico desde hace 10 años. Ahora los tengo todos aquí y los puedo compartir con mi médico con un tap.' },
  { source: '⭐', platform: 'App Store', name: 'Dra. Sofía Vargas', location: 'Querétaro', stars: 5, text: 'Lo que más me gusta es que mis pacientes llegan con su historial completo. Dedico menos tiempo a preguntas básicas y más a lo que importa.' },
  { source: '🔵', platform: 'Google Play', name: 'Luis Antonio P.', location: 'CDMX', stars: 5, text: 'Encontré a mi médico en el directorio, agendé la cita el mismo día y compartí mis análisis antes de llegar. Todo desde el celular. Increíble.' },
]

function TestimonialsSection() {
  const [offset, setOffset] = useState(0)
  const [cardW, setCardW] = useState(320)
  const GAP = 20
  useEffect(() => {
    const update = () => setCardW(window.innerWidth < 640 ? Math.min(320, window.innerWidth - 48) : 320)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const CARD_W = cardW
  const visibleCards = window.innerWidth < 640 ? 1 : 3
  const max = Math.max(0, TESTIMONIALS.length - visibleCards)

  const prev = useCallback(() => setOffset(o => Math.max(0, o - 1)), [])
  const next = useCallback(() => setOffset(o => Math.min(max, o + 1)), [max])

  // Auto-advance (Swiper autoplay: delay 3000ms)
  useEffect(() => {
    const t = setInterval(() => setOffset(o => o >= max ? 0 : o + 1), 3000)
    return () => clearInterval(t)
  }, [max])

  const { ref, style, visible } = useFadeUp(0)

  return (
    <section className="py-24 overflow-hidden" style={{ backgroundColor: '#f9f0ff' }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex items-start justify-between mb-12 flex-wrap gap-6">
          <WordReveal
            tag="h2"
            className="text-[3rem] sm:text-[4.5rem] md:text-[6rem] font-black leading-[0.95] tracking-[-0.04em] max-w-[700px]"
            stagger={70}
          >
            Lo que dicen médicos y pacientes.
          </WordReveal>
          <div className="flex gap-3 mt-4">
            <button
              onClick={prev}
              disabled={offset === 0}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-30"
              style={{ backgroundColor: '#101722' }}
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            <button
              onClick={next}
              disabled={offset === max}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-30"
              style={{ backgroundColor: '#101722' }}
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          </div>
        </div>

        <div ref={ref} style={style} className="overflow-hidden">
          <div
            className="ht-testimonial-track"
            style={{ transform: `translateX(-${offset * (CARD_W + GAP)}px)` }}
          >
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="flex-shrink-0 bg-white rounded-2xl p-7 hover:shadow-lg transition-shadow"
                style={{
                  width: `${CARD_W}px`,
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(2rem)',
                  transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{t.source}</span>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: '#101722' }}>{t.name}</p>
                    <p className="text-[11px]" style={{ color: '#999' }}>{t.location} · {t.platform}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.stars)].map((_, j) => <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-[14px] leading-relaxed" style={{ color: '#444' }}>{t.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mt-6">
          {[...Array(max + 1)].map((_, i) => (
            <button
              key={i}
              onClick={() => setOffset(i)}
              className="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
              style={{ width: offset === i ? '32px' : '8px', backgroundColor: offset === i ? '#4541fe' : '#ccc' }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   CTA Section
───────────────────────────────────────────── */
function CTASection() {
  const { ref, style } = useFadeUp(0)
  return (
    <section className="py-28 text-center" style={{ backgroundColor: '#101722' }}>
      <div ref={ref} style={style} className="max-w-[800px] mx-auto px-6">
        <WordReveal
          tag="h2"
          className="text-[2.2rem] sm:text-[3.8rem] md:text-[5rem] lg:text-[5.5rem] font-black text-white leading-[1] tracking-[-0.03em] mb-10"
          stagger={60}
        >
          Tu expediente digital. Sin tarjeta. Sin letra chica.
        </WordReveal>
        <Link to="/register">
          <button
            className="text-white text-[16px] font-semibold px-10 py-4 rounded-full hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
            style={{ backgroundColor: '#0097a9' }}
          >
            Crear mi cuenta gratis →
          </button>
        </Link>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Footer
───────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-16" style={{ backgroundColor: '#f9f0ff' }}>
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 md:gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <img src="/logo healthpal.mx negro.png" alt="HealthPal.mx" className="h-8 w-auto object-contain mb-5" />
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[200px]">Expediente clínico digital para médicos y pacientes. Hecho en México 🇲🇽</p>
          </div>
          <div>
            <p className="text-[13px] font-black mb-4" style={{ color: '#101722' }}>Legal</p>
            <Link to="/privacidad" className="block text-[13px] mb-2.5 hover:text-[#0097a9] transition-colors" style={{ color: '#0097a9' }}>
              Aviso de Privacidad
            </Link>
            <Link to="/legal" className="block text-[13px] mb-2.5 hover:text-[#0097a9] transition-colors" style={{ color: '#0097a9' }}>
              Términos y Condiciones
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-gray-400">
          <p>© {new Date().getFullYear()} HealthPal.mx | Todos los derechos reservados</p>
          <p>Healthpal.mx hecho en México.</p>
        </div>
      </div>
    </footer>
  )
}

void ScaleSection
void TestimonialsSection

/* ─────────────────────────────────────────────
   Landing — main
───────────────────────────────────────────── */
export default function Landing() {
  useLenis()

  return (
    <div style={{ backgroundColor: '#f9f0ff', overflowX: 'hidden' }}>
      <PageLoader />
      <AnnouncementBar />
      <Navbar />
      <Hero />
      <ProblemCard />
      <SpeedSection />
      <HumanCenteredSection />
      <AISection />
      {/* <ScaleSection /> */}
      {/* <TestimonialsSection /> */}
      <CTASection />
      <Footer />
    </div>
  )
}
