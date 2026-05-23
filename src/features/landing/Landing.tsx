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
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff3eb5, #8b3fff, #4541fe)' }}>
            <span className="text-white text-[15px] leading-none">♥</span>
          </div>
          <span className="text-white font-bold text-[17px]">
            HealthPal<span className="text-white/40">.mx</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-white/70">
          {['Soluciones', 'Empresa', 'Recursos'].map(item => (
            <button key={item} className="hover:text-white transition-colors cursor-pointer">{item}</button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-[13px] font-medium text-white/60 hover:text-white transition-colors">
            Iniciar sesión
          </Link>
          <Link to="/register">
            <button className="bg-[#4541fe] text-white text-[13px] font-semibold px-5 py-2 rounded-full hover:bg-[#3530dc] transition-colors">
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
          {['Soluciones', 'Empresa', 'Recursos'].map(item => (
            <button key={item} className="flex w-full py-3 text-sm font-medium text-white/70 hover:text-white transition-colors">{item}</button>
          ))}
          <div className="pt-4 flex gap-3">
            <Link to="/login" className="flex-1">
              <button className="w-full border border-white/20 text-white text-sm py-2.5 rounded-full">Iniciar sesión</button>
            </Link>
            <Link to="/register" className="flex-1">
              <button className="w-full bg-[#4541fe] text-white text-sm font-semibold py-2.5 rounded-full">Empieza gratis</button>
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
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#0f0e19' }}>
      <HeroRibbon />

      <div className="relative z-20 text-center px-6 max-w-[1000px] mx-auto pt-[68px]">
        {/* Hero heading - word-by-word on mount */}
        <h1
          className="text-[4rem] sm:text-[5.5rem] md:text-[7rem] lg:text-[7.5rem] font-black text-white leading-[0.92] tracking-[-0.04em]"
          style={{ willChange: 'transform' }}
        >
          {['Tu', 'expediente,', 'siempre', 'contigo.'].map((word, i) => (
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
          className="mt-8 text-[1.05rem] md:text-[1.15rem] text-white/50 leading-relaxed max-w-[480px] mx-auto"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease 1.7s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 1.7s',
          }}
        >
          Guarda y comparte tu historial médico en segundos. Con WhatsApp integrado, mandar un estudio a tu doctor es tan fácil como mandar un mensaje.
        </p>

        <div
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.7s ease 1.9s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.9s',
          }}
        >
          <Link to="/register">
            <button className="bg-[#4541fe] text-white text-[15px] font-semibold px-8 py-3.5 rounded-full hover:bg-[#3530dc] transition-all hover:scale-105 active:scale-95">
              Crear cuenta gratis
            </button>
          </Link>
          <Link to="/login" className="text-white/50 text-[14px] font-medium hover:text-white transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Logo Ticker (Swiper autoplay speed:1000ms, loop)
───────────────────────────────────────────── */
const LOGOS = ['Médica Sur', 'Hospital Ángeles', 'Salud Digna', 'Cruz Roja México', 'UNAM Facultad de Medicina', 'Christus Muguerza', 'Star Médica', 'TecSalud', 'Grupo Ángeles', 'IMSS Bienestar']

function LogoTicker() {
  const doubled = [...LOGOS, ...LOGOS]
  return (
    <div className="overflow-hidden py-6" style={{ backgroundColor: '#4541fe' }}>
      <div className="ht-ticker-track flex items-center gap-16 whitespace-nowrap">
        {doubled.map((logo, i) => (
          <span key={i} className="text-white font-semibold text-[13px] opacity-70 shrink-0 uppercase tracking-[0.12em]">
            {logo}
          </span>
        ))}
      </div>
    </div>
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
          <div className="rounded-[28px] px-6 py-14 sm:px-12 sm:py-20 md:px-20 md:py-28 text-center" style={{ backgroundColor: '#4541fe' }}>
            <WordReveal
              tag="h2"
              className="text-[2rem] sm:text-[3.2rem] md:text-[4.5rem] font-black text-white leading-[1.0] tracking-[-0.03em]"
              stagger={60}
            >
              Llegas a consulta sin tus estudios. Tu doctor te vuelve a preguntar lo mismo. Tus análisis están perdidos entre fotos y WhatsApp.
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
    <section className="pt-8 pb-0 overflow-hidden" style={{ backgroundColor: '#f9f0ff' }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div ref={titleRef} style={titleStyle} className="text-center">
          <h2 className="text-[3.5rem] sm:text-[5rem] md:text-[6.5rem] font-black leading-[0.95] tracking-[-0.04em] mb-6">
            <span
              className="inline bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, #ff3eb5 0%, #8b3fff 50%, #4541fe 100%)' }}
            >
              Todo en un solo lugar,
            </span>
            <br />
            <span style={{ color: '#101722' }}>al alcance de tu celular.</span>
          </h2>

          <Link to="/register">
            <button
              className="text-white text-[15px] font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-all hover:scale-105 active:scale-95 mt-2 mb-16"
              style={{ backgroundColor: '#4541fe' }}
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
            <div className="relative z-10 w-full md:max-w-[700px] lg:max-w-[780px]">
              <DashboardMockup />
            </div>
            <div className="relative z-10 w-full flex justify-center md:w-auto md:block md:-mb-2">
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

      <div className="bg-white flex" style={{ minHeight: '320px' }}>
        {/* Sidebar — hidden on mobile */}
        <div className="hidden sm:flex flex-col w-[160px] lg:w-[180px] bg-[#fafafa] border-r border-gray-100 flex-shrink-0 p-4">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg,#ff3eb5,#4541fe)' }} />
            <span className="text-[11px] font-bold text-gray-700">HealthPal</span>
          </div>
          {['Dashboard', 'Pacientes', 'Consultas', 'Documentos', 'Mensajes', 'Citas'].map((item, i) => (
            <div key={item} className="py-2 px-2.5 rounded-lg mb-0.5 text-[11px] font-medium flex items-center gap-2"
              style={{ backgroundColor: i === 0 ? '#ede8ff' : 'transparent', color: i === 0 ? '#4541fe' : '#888' }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: i === 0 ? '#4541fe' : '#ccc' }} />
              {item}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 sm:p-5 overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <p className="text-[12px] sm:text-[13px] font-bold text-gray-800 truncate">Expedientes Clínicos</p>
            <div className="text-[10px] text-white font-semibold px-3 py-1 rounded-full shrink-0" style={{ backgroundColor: '#4541fe' }}>+ Nuevo</div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            {[['2,625', 'Pacientes'], ['3,250', 'Consultas'], ['6,281', 'Docs']].map(([v, l]) => (
              <div key={l} className="bg-gray-50 rounded-xl p-2 sm:p-3">
                <p className="text-[13px] sm:text-[15px] font-black text-gray-900">{v}</p>
                <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5">{l}</p>
                <div className="mt-1.5 h-1 bg-gray-100 rounded-full">
                  <div className="h-1 rounded-full" style={{ width: '70%', backgroundColor: '#4541fe' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Patient list */}
          <div className="text-[11px] font-bold text-gray-700 mb-2">Últimos pacientes</div>
          {[['María García', 'Consulta pendiente', '#4541fe'], ['Roberto López', 'Documento subido', '#ff3eb5'], ['Ana Martínez', 'Cita confirmada', '#28c840'], ['Carlos Ruiz', 'Receta generada', '#febc2e']].map(([name, status, color]) => (
            <div key={name} className="flex items-center gap-2 sm:gap-3 py-2 border-b border-gray-50">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-shrink-0" style={{ background: `${color}25`, border: `1.5px solid ${color}40` }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-800 truncate">{name}</p>
                <p className="text-[8px] sm:text-[9px] text-gray-400">{status}</p>
              </div>
              <div className="text-[8px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${color}18`, color }}>Ver</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="flex-shrink-0" style={{ width: '190px' }}>
      {/* iPhone 15 Pro silhouette */}
      <div style={{
        position: 'relative',
        width: '190px',
        height: '390px',
        borderRadius: '48px',
        background: 'linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 40%, #2c2c2e 100%)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)',
        padding: '3px',
      }}>
        {/* Side buttons — volume up */}
        <div style={{ position: 'absolute', left: '-3px', top: '88px', width: '3px', height: '32px', backgroundColor: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', left: '-3px', top: '130px', width: '3px', height: '32px', backgroundColor: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
        {/* Side button — power */}
        <div style={{ position: 'absolute', right: '-3px', top: '108px', width: '3px', height: '56px', backgroundColor: '#3a3a3c', borderRadius: '0 2px 2px 0' }} />

        {/* Screen */}
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '46px',
          backgroundColor: '#fff',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Dynamic Island */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80px',
            height: '26px',
            backgroundColor: '#000',
            borderRadius: '20px',
            zIndex: 10,
          }} />

          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '48px 16px 4px', fontSize: '9px', color: '#888' }}>
            <span style={{ fontWeight: 600, color: '#111' }}>9:41</span>
            <span>●●●</span>
          </div>

          {/* App content */}
          <div style={{ padding: '4px 14px 14px' }}>
            <p style={{ fontSize: '8px', color: '#aaa', marginBottom: '2px' }}>Actualizado ahora</p>
            <p style={{ fontSize: '14px', fontWeight: 900, color: '#111', marginBottom: '12px' }}>Mis Documentos</p>

            <p style={{ fontSize: '8px', fontWeight: 700, color: '#555', marginBottom: '6px' }}>Recientes</p>
            {[
              ['🩺', 'Análisis de sangre', 'PDF · 2 MB', '#4541fe'],
              ['💊', 'Receta · Dr. Herrera', 'PDF · 180 KB', '#ff3eb5'],
              ['🔬', 'Radiografía tórax', 'IMG · 5 MB', '#28c840'],
            ].map(([icon, name, size, color]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
                  <p style={{ fontSize: '8px', color: '#aaa' }}>{size}</p>
                </div>
              </div>
            ))}

            <div style={{ marginTop: '12px', backgroundColor: '#4541fe', borderRadius: '14px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#fff' }}>Compartir vía WhatsApp</p>
                <p style={{ fontSize: '7px', color: 'rgba(255,255,255,0.6)' }}>Enviar al médico al instante</p>
              </div>
              <span style={{ fontSize: '16px' }}>📤</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Human Centered Section
───────────────────────────────────────────── */
function HumanCenteredSection() {
  const { ref, style } = useFadeUp(0)
  return (
    <section className="bg-white overflow-hidden">
      <div ref={ref} style={style} className="max-w-[1200px] mx-auto grid lg:grid-cols-2 items-center">
        {/* Photo placeholder with floating card */}
        <div className="h-[420px] lg:h-[580px] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8d5ff 0%, #ffd9f0 50%, #d9e8ff 100%)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #d4b8e0, #c8a8d8)' }} />
              <div className="w-48 h-64 rounded-t-full mx-auto" style={{ background: 'linear-gradient(180deg, #c4a0d0, #b090c0)' }} />
            </div>
          </div>
          {/* Floating testimonial card */}
          <div className="lp-float-alt absolute bottom-8 left-6 right-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #ff3eb5, #8b3fff)' }} />
                <div>
                  <p className="text-[11px] font-bold text-gray-900">María García</p>
                  <p className="text-[10px] text-gray-400">Paciente · CDMX</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />)}
                </div>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">"Llevaba mis estudios en una bolsa. Ahora los comparto por WhatsApp en segundos."</p>
            </div>
          </div>
        </div>
        {/* Text */}
        <div className="px-10 py-16 lg:px-16 lg:py-20">
          <WordReveal
            tag="h2"
            className="text-[2.8rem] md:text-[3.8rem] lg:text-[4.5rem] font-black leading-[0.95] tracking-[-0.04em] mb-8"
            stagger={55}
          >
            Hecho para médicos mexicanos. Diseñado para sus pacientes.
          </WordReveal>
          <p className="text-[15px] leading-relaxed mb-8" style={{ color: '#666' }}>
            HealthPal nació en México para resolver un problema real: médicos y pacientes sin un expediente compartido. Panel de control, agenda, documentos y mensajería en un solo lugar.
          </p>
          <Link to="/register" state={{ role: 'patient' }}>
            <button className="text-white text-[14px] font-semibold px-7 py-3 rounded-full hover:opacity-90 transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: '#4541fe' }}>
              Registra tu consultorio gratis
            </button>
          </Link>
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
    <section className="overflow-hidden relative" style={{ backgroundColor: '#d9c6ff' }}>
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
          <div className="flex justify-center">
            <div className="w-[260px] md:w-[300px]">
              <div className="rounded-[44px] p-3.5 shadow-[0_40px_80px_rgba(0,0,0,0.12)]" style={{ backgroundColor: '#1a1a2e' }}>
                <div className="bg-white rounded-[34px] overflow-hidden">
                  <div className="bg-[#1a1a2e] h-8 flex items-center justify-center">
                    <div className="w-20 h-1.5 bg-gray-800 rounded-full" />
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] text-gray-400 mb-0.5">Actualizado ahora</p>
                    <p className="text-[18px] font-black text-gray-900 mb-4">Citas Médicas</p>
                    <p className="text-[10px] font-bold text-gray-600 mb-2">Solicitado</p>
                    {[['Dr. García', 'Medicina General'], ['Dra. López', 'Cardiología'], ['Dr. Martínez', 'Pediatría']].map(([doc, spec]) => (
                      <div key={doc} className="flex items-center gap-2.5 py-2.5 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4541fe30, #ff3eb515)' }} />
                        <div className="flex-1">
                          <p className="text-[11px] font-bold text-gray-900">{doc}</p>
                          <p className="text-[9px] text-gray-400">{spec}</p>
                        </div>
                        <ChevronRight size={14} className="text-[#4541fe]" />
                      </div>
                    ))}
                    <div className="mt-4 rounded-2xl p-3" style={{ backgroundColor: '#4541fe' }}>
                      <p className="text-[11px] font-bold text-white">Solicitar Cita →</p>
                      <p className="text-[9px] text-white/60">Médicos verificados · En minutos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
            <button className="bg-white text-[#4541fe] text-[15px] font-bold px-8 py-3.5 rounded-full hover:opacity-90 hover:scale-105 active:scale-95 transition-all">
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
            style={{ backgroundColor: '#4541fe' }}
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
        <div className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-8 md:gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-full" style={{ background: 'linear-gradient(135deg, #ff3eb5, #8b3fff, #4541fe)' }} />
              <span className="font-black text-[18px]" style={{ color: '#101722' }}>HealthPal<span className="font-medium text-gray-400">.mx</span></span>
            </div>
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[200px]">Expediente clínico digital para médicos y pacientes. Hecho en México 🇲🇽</p>
          </div>
          {[
            { heading: 'Expediente', links: ['Historial Clínico', 'Compartir por WhatsApp', 'Recetas Digitales', 'Estudios'] },
            { heading: 'Médicos', links: ['Panel Médico', 'Agenda Digital', 'Pacientes', 'Comunicación'] },
            { heading: 'Empresa', links: ['Nosotros', 'Blog', 'Careers', 'Privacidad', 'Términos', 'Trust Center'] },
            { heading: 'Soporte', links: ['Centro de Ayuda', 'Descargas'] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-[13px] font-black mb-4" style={{ color: '#101722' }}>{heading}</p>
              {links.map(l => (
                <a key={l} href="#" className="block text-[13px] mb-2.5 hover:text-[#4541fe] transition-colors" style={{ color: '#4541fe' }}>{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-gray-400">
          <p>© {new Date().getFullYear()} HealthPal.mx — Todos los derechos reservados</p>
          <p>Hecho con ❤️ en México · Twenty Labs, S.A. de C.V.</p>
        </div>
      </div>
    </footer>
  )
}

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
      <LogoTicker />
      <ProblemCard />
      <SpeedSection />
      <HumanCenteredSection />
      <AISection />
      <ScaleSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  )
}
