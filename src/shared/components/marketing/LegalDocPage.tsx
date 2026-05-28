import { Link } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Sparkles } from 'lucide-react'

type Highlight = {
  title: string
  description: string
}

type LegalSection = {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
  note?: string
}

interface LegalDocPageProps {
  title: string
  subtitle: string
  intro: string
  highlights: Highlight[]
  sections: LegalSection[]
  sourceHref?: string
  downloadLabel?: string
}

function MarketingHeader() {
  return (
    <header className="fixed top-0 w-full z-50 transition-all duration-300" style={{ backgroundColor: 'rgba(16,23,34,0.98)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src="/logograndenofondo.png" alt="HealthPal.mx" className="h-7 md:h-8 w-auto object-contain" />
        </Link>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-[13px] font-medium text-white/60 hover:text-white transition-colors">
            Volver al inicio
          </Link>
          <Link to="/register">
            <button className="bg-[#0097a9] text-white text-[13px] font-semibold px-5 py-2 rounded-full hover:bg-[#007f89] transition-colors">
              Empieza gratis
            </button>
          </Link>
        </div>
      </div>
    </header>
  )
}

function MarketingFooter() {
  return (
    <footer className="py-16" style={{ backgroundColor: '#f9f0ff' }}>
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 md:gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <img src="/logo healthpal.mx negro.png" alt="HealthPal.mx" className="h-8 w-auto object-contain mb-5" />
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[240px]">Expediente clínico digital para médicos y pacientes. Hecho en México 🇲🇽</p>
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

export default function LegalDocPage({
  title,
  subtitle,
  intro,
  highlights,
  sections,
  sourceHref,
  downloadLabel,
}: LegalDocPageProps) {
  return (
    <div style={{ backgroundColor: '#f9f0ff', overflowX: 'hidden' }}>
      <MarketingHeader />

      <main className="pt-[68px]">
        <section className="relative overflow-hidden bg-[#0f0e19] text-white">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -top-20 right-[-8%] h-72 w-72 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(0,151,169,0.45) 0%, rgba(0,151,169,0) 70%)' }} />
            <div className="absolute -bottom-24 left-[-10%] h-80 w-80 rounded-full opacity-35" style={{ background: 'radial-gradient(circle, rgba(255,62,181,0.35) 0%, rgba(255,62,181,0) 70%)' }} />
          </div>

          <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16 md:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold text-white/75 mb-6">
                <Sparkles size={14} className="text-[#0097a9]" />
                Documentación legal
              </div>
              <h1 className="text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] font-black leading-[0.95] tracking-[-0.04em] max-w-4xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-[1.03rem] md:text-[1.1rem] text-white/60 leading-relaxed">
                {subtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                {sourceHref ? (
                  <a href={sourceHref} download className="inline-flex items-center gap-2 rounded-full bg-[#0097a9] px-6 py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#007f89] hover:scale-[1.02] active:scale-95">
                    <Download size={16} />
                    {downloadLabel || 'Descargar documento'}
                  </a>
                ) : null}
                <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-[14px] font-semibold text-white/80 transition-colors hover:text-white hover:border-white/30">
                  <ArrowLeft size={16} />
                  Volver a la landing
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-18 px-6">
          <div className="max-w-[1200px] mx-auto grid gap-8 lg:grid-cols-[0.86fr_1.14fr] items-start">
            <aside className="space-y-6 lg:sticky lg:top-[92px]">
              <div className="rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(16,23,34,0.08)] border border-gray-100">
                <p className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[#0097a9] mb-3">Resumen</p>
                <h2 className="text-2xl font-black text-[#101722] mb-4">Lo esencial, explicado desde aquí.</h2>
                <p className="text-[15px] leading-7 text-gray-600">{intro}</p>
              </div>

              <div className="grid gap-4">
                {highlights.map((item) => (
                  <div key={item.title} className="rounded-[24px] bg-[#101722] p-6 text-white shadow-[0_18px_50px_rgba(16,23,34,0.12)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#0097a9]" />
                      <h3 className="text-[15px] font-bold">{item.title}</h3>
                    </div>
                    <p className="text-[14px] leading-7 text-white/70">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(16,23,34,0.08)] border border-gray-100">
                <p className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[#0097a9] mb-3">Contenido</p>
                <div className="space-y-3">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left transition-colors hover:border-[#0097a9]/30 hover:bg-white"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#101722] text-[11px] font-bold text-white">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[13px] font-semibold leading-5 text-[#101722]">{section.title}</span>
                    </a>
                  ))}
                </div>
              </div>

              {sourceHref ? (
                <div className="rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(16,23,34,0.08)] border border-gray-100">
                  <p className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[#0097a9] mb-3">Descarga</p>
                  <p className="text-[15px] leading-7 text-gray-600 mb-5">Si prefieres revisar el archivo original, aquí está disponible para descarga directa.</p>
                  <a href={sourceHref} download className="inline-flex items-center gap-2 rounded-full bg-[#0097a9] px-6 py-3 text-[14px] font-semibold text-white transition-all hover:bg-[#007f89] hover:scale-[1.02] active:scale-95">
                    <FileText size={16} />
                    {downloadLabel || 'Descargar documento'}
                  </a>
                </div>
              ) : null}
            </aside>

            <article className="rounded-[30px] bg-white shadow-[0_24px_70px_rgba(16,23,34,0.08)] border border-gray-100 overflow-hidden">
              <div className="bg-[#101722] px-5 py-4 flex items-center gap-3 text-white">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold">Vista del documento</p>
                  <p className="text-[12px] text-white/50">Formato editorial tipo artículo para lectura rápida y navegación por secciones</p>
                </div>
              </div>

              <div className="p-6 md:p-8 lg:p-10">
                <div className="space-y-8">
                  {sections.map((section) => (
                    <section key={section.id} id={section.id} className="scroll-mt-28">
                      <div className="border-l-4 border-[#0097a9] pl-4 mb-5">
                        <p className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[#0097a9] mb-2">Sección</p>
                        <h3 className="text-[1.5rem] md:text-[1.7rem] font-black leading-tight text-[#101722]">{section.title}</h3>
                      </div>

                      <div className="space-y-4 text-[15px] leading-8 text-gray-700">
                        {section.paragraphs.map((paragraph, paragraphIndex) => (
                          <p key={`${section.id}-p-${paragraphIndex}`}>{paragraph}</p>
                        ))}

                        {section.bullets ? (
                          <ul className="space-y-3 pl-6 list-disc">
                            {section.bullets.map((bullet, bulletIndex) => (
                              <li key={`${section.id}-b-${bulletIndex}`}>{bullet}</li>
                            ))}
                          </ul>
                        ) : null}

                        {section.note ? (
                          <div className="rounded-2xl border border-[#0097a9]/15 bg-[#0097a9]/6 px-5 py-4 text-[14px] leading-7 text-gray-700">
                            {section.note}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
