import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-6 text-center text-9xl font-extrabold text-gray-200">404</h2>
        <p className="mt-2 text-center text-sm text-gray-600 mb-8">
          La pAgina que buscas no existe o ha sido movida.
        </p>

        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-[#33C7BE] hover:bg-[#2EB3AA] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#33C7BE] shadow-sm"
        >
          <Home className="w-5 h-5 mr-2" />
          Volver al Inicio
        </Link>
      </div>
    </div>
  )
}
