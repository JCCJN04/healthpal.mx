import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, User, FileText, ArrowRight, Loader2 } from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { useAuth } from '@/app/providers/AuthContext'
import { searchPatients } from '@/features/doctor/services/patients'
import { searchDocuments } from '@/shared/lib/queries/documents'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'

type DocumentRow = Database['public']['Tables']['documents']['Row']

type SearchResults = {
  patients: Awaited<ReturnType<typeof searchPatients>>
  documents: DocumentRow[]
}

export default function Busqueda() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [results, setResults] = useState<SearchResults>({ patients: [], documents: [] })

  const source = searchParams.get('from') || ''
  const qParam = searchParams.get('q') || ''

  useEffect(() => {
    setQuery(qParam)
  }, [qParam])

  useEffect(() => {
    if (!qParam || !user) {
      setResults({ patients: [], documents: [] })
      return
    }

    const run = async () => {
      setLoading(true)
      setHasSearched(true)
      try {
        const searchRole = profile?.role === 'doctor' ? 'doctor' : profile?.role === 'patient' ? 'patient' : undefined

        const [patients, documents] = await Promise.all([
          searchRole === 'doctor' ? searchPatients(qParam, user.id) : Promise.resolve([]),
          searchDocuments(qParam, user.id),
        ])

        setResults({ patients, documents })
      } catch (err) {
        logger.error('Busqueda.search', err)
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

  const nothingFound =
    hasSearched && !loading && results.patients.length === 0 && results.documents.length === 0

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
                {results.documents.length + results.patients.length} resultados
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
                placeholder="Busca pacientes o documentos"
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
        </form>

        {nothingFound && (
          <div className="bg-white border border-gray-100 rounded-lg p-6 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-1">Sin resultados</p>
            <p className="text-sm text-gray-500">Prueba con otros términos o verifica la ortografía.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {profile?.role === 'doctor' && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><User size={18} /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">Pacientes</p>
                    <p className="text-sm text-gray-600">Coincidencias por nombre</p>
                  </div>
                </div>
                {loading && <Loader2 className="animate-spin text-gray-400" size={18} />}
              </div>
              {results.patients.length === 0 && !loading ? renderEmpty('pacientes') : (
                <div className="space-y-3">
                  {results.patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900">{patient.full_name || 'Paciente sin nombre'}</p>
                      <button
                        onClick={() => navigate('/dashboard/pacientes')}
                        className="inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline"
                      >
                        Ver pacientes <ArrowRight size={14} />
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
            {results.documents.length === 0 && !loading ? renderEmpty('documentos') : (
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
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{doc.category}</span>
                        <span className="text-xs text-gray-500">{created}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{doc.title}</p>
                      {doc.notes && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{doc.notes}</p>}
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
