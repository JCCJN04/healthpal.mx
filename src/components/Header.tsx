import { Search, Menu } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q')
    if (q !== null) setSearchTerm(q)
  }, [location.search])

  const submitSearch = () => {
    if (!searchTerm.trim()) return
    const params = new URLSearchParams({ q: searchTerm.trim(), from: location.pathname })
    navigate(`/dashboard/buscar?${params.toString()}`)
    setSearchOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitSearch()
    }
  }

  return (
    <header className="h-14 md:h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/80 px-4 md:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Menu + Logo */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Hamburger menu - Mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={20} className="text-gray-600" />
        </button>

        {/* Logo */}
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-primary">
          Healthpal.mx
        </h1>
      </div>

      {/* Right: Search */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search button - Mobile */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Search size={20} className="text-gray-600" />
        </button>

        {/* Search bar - Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar pacientes, documentos o citas"
              className="pl-10 pr-4 py-2 w-48 lg:w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
          <button
            onClick={submitSearch}
            disabled={!searchTerm.trim()}
            className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-primary/90 transition disabled:opacity-60"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-gray-200 p-4 z-30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar pacientes, documentos o citas"
              autoFocus
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            <button
              onClick={submitSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white rounded-md text-xs font-semibold"
            >
              Buscar
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
