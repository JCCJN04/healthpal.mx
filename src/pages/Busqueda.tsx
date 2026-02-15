import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, User, FileText, Calendar, ArrowRight, Loader2 } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { searchPatients } from '../lib/queries/patients'
import { searchDocuments } from '../lib/queries/documents'
import { searchAppointments, type AppointmentWithDetails } from '../lib/queries/appointments'
import { showToast } from '../components/Toast'
import type { Database } from '../types/database'

const statusStyles: Record<string, string> = {
  requested: 'text-amber-700 bg-amber-100',
  confirmed: 'text-teal-700 bg-teal-100',
  completed: 'text-emerald-700 bg-emerald-100',
  cancelled: 'text-red-700 bg-red-100',
  rejected: 'text-red-700 bg-red-100',
  no_show: 'text-gray-700 bg-gray-200'
}

type DocumentRow = Database['public']['Tables']['documents']['Row']

type SearchResults = {
  patients: Awaited<ReturnType<typeof searchPatients>>
  documents: DocumentRow[]
  appointments: AppointmentWithDetails[]
}

export default function Busqueda() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [results, setResults] = useState<SearchResults>({ patients: [], documents: [], appointments: [] })

  const source = searchParams.get('from') || ''
  const qParam = searchParams.get('q') || ''

  useEffect(() => {
    setQuery(qParam)
  }, [qParam])

  useEffect(() => {
    if (!qParam || !user) {
      setResults({ patients: [], documents: [], appointments: [] })
      return
    }

    const run = async () => {
      setLoading(true)
      setHasSearched(true)
      try {
        const searchRole = profile?.role === 'doctor' ? 'doctor' : profile?.role === 'patient' ? 'patient' : undefined

        const [patients, documents, appointments] = await Promise.all([
          searchRole === 'doctor' ? searchPatients(qParam) : Promise.resolve([]),
          searchDocuments(qParam, user.id),
          searchAppointments(qParam, user.id, searchRole)
        ])

        setResults({ patients, documents, appointments })
      } catch (err) {
        console.error('Error during global search:', err)
        showToast('No pudimos completar la búsqueda, inténtalo de nuevo', 'error')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [qParam, profile?.role, user])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const params = new URLSearchParams({ q: query.trim(), from: source || location.pathname })
    navigate(`/dashboard/buscar?${params.toString()}`)
  }

  const patientSectionVisible = useMemo(() => profile?.role === 'doctor', [profile?.role])
  const nothingFound =
    hasSearched &&
    !loading &&
    results.patients.length === 0 &&
    results.documents.length === 0 &&
    results.appointments.length === 0

  const formatDateTime = (value: string) => {
    const date = new Date(value)
    return {
      date: date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const renderEmpty = (label: string) => (
    <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
      Sin resultados en {label}
    </div>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase text-primary">Búsqueda global</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
            {source && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Desde {source}
              </span>
            )}
            {hasSearched && !loading && (
              <span className="text-xs text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-full">
                {results.documents.length + results.appointments.length + results.patients.length} resultados
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca pacientes, documentos o citas"
                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-3 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition disabled:opacity-60"
              disabled={!query.trim() || loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Search size={18} className="mr-2" />}
              Buscar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Presiona Enter para lanzar la búsqueda.</p>
        </form>

        {nothingFound && (
          <div className="bg-white border border-gray-100 rounded-lg p-6 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-1">Sin resultados</p>
            <p className="text-sm text-gray-500">Prueba con otros términos o verifica la ortografía.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {patientSectionVisible && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><User size={18} /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">Pacientes</p>
                    <p className="text-sm text-gray-600">Coincidencias por nombre o correo</p>
                  </div>
                </div>
                {loading && <Loader2 className="animate-spin text-gray-400" size={18} />}
              </div>

              {results.patients.length === 0 && !loading ? (
                renderEmpty('pacientes')
              ) : (
                <div className="space-y-3">
                  {results.patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{patient.full_name || 'Paciente sin nombre'}</p>
                        <p className="text-xs text-gray-600">{patient.email || 'Sin correo registrado'}</p>
                      </div>
                      <button
                        onClick={() => navigate('/dashboard/pacientes')}
                        className="inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline"
                      >
                        Ver pacientes
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><FileText size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase text-blue-600">Documentos</p>
                  <p className="text-sm text-gray-600">Archivos y notas coincidentes</p>
                </div>
              </div>
              {loading && <Loader2 className="animate-spin text-gray-400" size={18} />}
            </div>

            {results.documents.length === 0 && !loading ? (
              renderEmpty('documentos')
            ) : (
              <div className="space-y-3">
                {results.documents.map((doc) => {
                  const created = new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                  return (
                    <div
                      key={doc.id}
                      className="p-3 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/documentos/${doc.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {doc.category}
                        </span>
                        <span className="text-xs text-gray-500">{created}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{doc.title}</p>
                      {doc.notes && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{doc.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Calendar size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase text-emerald-600">Citas</p>
                  <p className="text-sm text-gray-600">Consultas pasadas o próximas</p>
                </div>
              </div>
              {loading && <Loader2 className="animate-spin text-gray-400" size={18} />}
            </div>

            {results.appointments.length === 0 && !loading ? (
              renderEmpty('citas')
            ) : (
              <div className="space-y-3">
                {results.appointments.map((apt) => {
                  const { date, time } = formatDateTime(apt.start_at)
                  const counterpart = profile?.role === 'doctor' ? apt.patient : apt.doctor

                  return (
                    <div
                      key={apt.id}
                      className="p-3 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/consultas/${apt.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {date} · {time}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusStyles[apt.status] || 'text-gray-700 bg-gray-200'}`}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{apt.reason || 'Consulta'}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {counterpart?.full_name || (profile?.role === 'doctor' ? 'Paciente sin nombre' : 'Doctor sin nombre')}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
