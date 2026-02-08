import { ReactNode } from 'react'
import {
  Home,
  FileText,
  Calendar,
  MessageSquare,
  Users,
  CalendarDays,
  Settings,
  X
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  label: string
  path: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  { label: 'Inicio', path: '/dashboard', icon: <Home size={20} /> },
  { label: 'Documentos', path: '/dashboard/documentos', icon: <FileText size={20} /> },
  { label: 'Consultas', path: '/dashboard/consultas', icon: <CalendarDays size={20} /> },
  { label: 'Mensajes', path: '/dashboard/mensajes', icon: <MessageSquare size={20} /> },
  { label: 'Doctores', path: '/dashboard/doctores', icon: <Users size={20} /> },
  { label: 'Calendario', path: '/dashboard/calendario', icon: <Calendar size={20} /> },
  { label: 'Configuracion', path: '/dashboard/configuracion', icon: <Settings size={20} /> },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Mobile header with close button */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">Healthpal.mx</h1>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-primary/10'
                }`}
            >
              <span className={isActive ? 'text-white' : 'text-gray-600'}>
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
