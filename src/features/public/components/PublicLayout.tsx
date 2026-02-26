import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Menu, X } from 'lucide-react';
import Button from '@/shared/components/ui/Button';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
      {/* ─── Header (same as Landing) ─── */}
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
            <Link to="/#pacientes" className="hover:text-primary transition-colors">
              Para Pacientes
            </Link>
            <Link to="/#doctores" className="hover:text-primary transition-colors">
              Para Doctores
            </Link>
            <Link to="/#beneficios" className="hover:text-primary transition-colors">
              Beneficios
            </Link>
            <Link to="/directorio" className="hover:text-primary transition-colors">
              Directorio
            </Link>
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
            <Link
              to="/#pacientes"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-sm text-gray-700 hover:text-primary"
            >
              Para Pacientes
            </Link>
            <Link
              to="/#doctores"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-sm text-gray-700 hover:text-primary"
            >
              Para Doctores
            </Link>
            <Link
              to="/#beneficios"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-sm text-gray-700 hover:text-primary"
            >
              Beneficios
            </Link>
            <Link
              to="/directorio"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-sm text-gray-700 hover:text-primary"
            >
              Directorio
            </Link>
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

      {/* ─── Content ─── */}
      <main className="flex-1">{children}</main>

      {/* ─── Footer (same as Landing) ─── */}
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

            {/* Producto */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Producto</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/#pacientes" className="hover:text-primary transition-colors">
                    Para Pacientes
                  </Link>
                </li>
                <li>
                  <Link to="/#doctores" className="hover:text-primary transition-colors">
                    Para Doctores
                  </Link>
                </li>
                <li>
                  <Link to="/#beneficios" className="hover:text-primary transition-colors">
                    Cómo Funciona
                  </Link>
                </li>
                <li>
                  <Link to="/directorio" className="hover:text-primary transition-colors">
                    Directorio de Doctores
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
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

            {/* Contacto */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Contacto</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="mailto:healthpalmx@gmail.com" className="hover:text-primary transition-colors">
                    healthpalmx@gmail.com
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
              Hecho con <HeartPulse size={12} className="text-primary mx-1" /> en México
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

