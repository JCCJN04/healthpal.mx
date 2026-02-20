import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, User, Search, MessageSquare } from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { useAuth } from '@/app/providers/AuthContext'
import {
  searchPatients,
  linkPatientConversation,
  listDoctorPatients,
  PatientProfileLite,
} from '@/features/doctor/services/patients'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

interface PatientItem {
  id: string
  name: string
  email: string | null
  conversationId?: string | null
}

export default function Pacientes() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [patients, setPatients] = useState<PatientItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<PatientProfileLite[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadMyPatients()
  }, [user])

  const loadMyPatients = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await listDoctorPatients(user.id)
      const mapped: PatientItem[] = (data || []).map((p) => ({
        id: p.id,
        name: p.full_name || 'Paciente',
        email: p.email || null,
        conversationId: null,
      }))
      setPatients(mapped)
    } catch (err) {
      logger.error('Pacientes.load', err)
      showToast('Error al cargar pacientes', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    setLoading(true)
    try {
      const data = await searchPatients(searchTerm)
      setResults(data)
    } catch (err) {
      logger.error('Pacientes.search', err)
      showToast('Error al buscar pacientes', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (p: PatientProfileLite) => {
    if (!user) return
    if (patients.find((pt) => pt.id === p.id)) {
      showToast('El paciente ya está agregado', 'info', 2000)
      return
    }

    setAddingId(p.id)
    const convId = await linkPatientConversation(user.id, p.id)
    if (convId) {
      const newItem: PatientItem = {
        id: p.id,
        name: p.full_name || 'Paciente',
        email: p.email || null,
        conversationId: convId,
      }
      setPatients((prev) => [newItem, ...prev])
      showToast('Paciente agregado y chat listo', 'success', 2000)
    } else {
      showToast('No se pudo crear la conversación', 'error', 2500)
    }
    setAddingId(null)
  }

  const canManage = useMemo(() => profile?.role === 'doctor', [profile])

  if (!canManage) {
    return (
      <DashboardLayout>
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <p className="text-sm text-gray-700">Solo los doctores pueden gestionar pacientes.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary uppercase">Panel Doctor</p>
            <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
            <p className="text-sm text-gray-500">Busca pacientes registrados y prepara el chat inmediato.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o email"
                className="w-full px-3 py-2 pl-9 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-60"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Resultados de búsqueda */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Resultados</p>
            {loading && <span className="text-xs text-gray-500">Buscando…</span>}
          </div>
          {results.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Sin resultados. Busca por email o nombre.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.full_name || 'Paciente sin nombre'}</p>
                      <p className="text-xs text-gray-500">{p.email || 'Sin email'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={addingId === p.id}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary rounded-lg hover:bg-primary/10 disabled:opacity-60"
                  >
                    <Plus size={14} /> Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pacientes agregados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Pacientes vinculados</p>
            {loading && patients.length === 0 && <span className="text-xs text-gray-500">Cargando…</span>}
          </div>
          {patients.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">Aún no hay pacientes vinculados.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/dashboard/pacientes/${p.id}`)}
                  className="flex items-start justify-between gap-3 p-4 hover:bg-gray-50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">{p.name}</p>
                      {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                      <p className="text-[10px] text-primary font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Ver expediente →</p>
                    </div>
                  </div>
                  {p.conversationId ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                      <MessageSquare size={12} /> Chat listo
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-gray-500">Sin chat</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
