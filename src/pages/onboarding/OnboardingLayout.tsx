import { ReactNode } from 'react'

interface OnboardingLayoutProps {
  children: ReactNode
  title: string
  description?: string
}

export default function OnboardingLayout({ children, title, description }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Healthpal.mx</h1>
          <p className="text-gray-600">Completa tu perfil para comenzar</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            {description && (
              <p className="text-gray-600">{description}</p>
            )}
          </div>

          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          ¿Necesitas ayuda? <a href="mailto:soporte@healthpal.mx" className="text-primary hover:underline">Contáctanos</a>
        </div>
      </div>
    </div>
  )
}
