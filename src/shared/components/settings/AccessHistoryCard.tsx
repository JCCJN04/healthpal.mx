/**
 * NOM-024-SSA3-2012 §6.6 — Trazabilidad del expediente clínico
 * Shows the patient's audit log: who accessed their data, when, and what action was taken.
 */
import { useState, useEffect, useCallback } from 'react'
import { History, ChevronDown, ChevronUp, Loader2, ShieldAlert, User, Download, FileText, LogIn, LogOut, RefreshCw } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/app/providers/AuthContext'
import { logger } from '@/shared/lib/logger'

interface AuditEntry {
  id: string
  actor_id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  patient_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  actor_name?: string | null
  actor_role?: string | null
}

const PAGE_SIZE = 10

const ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  read_document: 'Consulta de documento',
  download_document: 'Descarga de documento',
  read_clinical_history: 'Consulta de historial clínico',
  export_data: 'Exportación de expediente',
  insert_documents: 'Documento subido',
  update_documents: 'Documento actualizado',
  delete_documents: 'Documento eliminado',
  insert_clinical_histories: 'Historial clínico creado',
  update_clinical_histories: 'Historial clínico actualizado',
  insert_appointments: 'Cita creada',
  update_appointments: 'Cita actualizada',
  insert_doctor_patient_consent: 'Acceso otorgado a doctor',
  update_doctor_patient_consent: 'Acceso de doctor actualizado',
  delete_doctor_patient_consent: 'Acceso de doctor revocado',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function actionIcon(action: string) {
  if (action === 'login') return <LogIn className="w-3.5 h-3.5" />
  if (action === 'logout') return <LogOut className="w-3.5 h-3.5" />
  if (action.includes('download')) return <Download className="w-3.5 h-3.5" />
  if (action.includes('export')) return <FileText className="w-3.5 h-3.5" />
  if (action.includes('consent')) return <ShieldAlert className="w-3.5 h-3.5" />
  return <User className="w-3.5 h-3.5" />
}

function actionColor(action: string): string {
  if (action === 'login' || action === 'logout') return 'bg-blue-50 text-blue-600'
  if (action.includes('download') || action.includes('export')) return 'bg-amber-50 text-amber-600'
  if (action.includes('delete') || action.includes('revocado')) return 'bg-red-50 text-red-500'
  if (action.includes('consent')) return 'bg-purple-50 text-purple-600'
  return 'bg-teal-50 text-teal-600'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AccessHistoryCard() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async (currentOffset: number, append: boolean) => {
    if (!user) return
    try {
      if (currentOffset === 0) setLoading(true)
      else setLoadingMore(true)

      // Fetch audit entries where the current user is the patient OR the actor
      const { data, error: rpcError } = await supabase
        .from('audit_log')
        .select('id, actor_id, action, resource_type, resource_id, patient_id, details, created_at')
        .or(`patient_id.eq.${user.id},actor_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1)

      if (rpcError) throw rpcError

      const rows = (data ?? []) as AuditEntry[]

      // Enrich actor names in one batch query
      const actorIds = [...new Set(rows.map(r => r.actor_id).filter(Boolean))]
      const nameMap: Record<string, { full_name: string | null; role: string | null }> = {}
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', actorIds)
        if (profiles) {
          for (const p of profiles) {
            nameMap[p.id] = { full_name: p.full_name, role: p.role }
          }
        }
      }

      const enriched = rows.map(r => ({
        ...r,
        actor_name: nameMap[r.actor_id]?.full_name ?? null,
        actor_role: nameMap[r.actor_id]?.role ?? null,
      }))

      setEntries(prev => append ? [...prev, ...enriched] : enriched)
      setHasMore(rows.length === PAGE_SIZE)
      setOffset(currentOffset + rows.length)
    } catch (err) {
      logger.error('AccessHistoryCard:fetch', err)
      setError('No se pudo cargar el historial de accesos.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user])

  // Load on first open only
  useEffect(() => {
    if (open && !loaded) {
      setLoaded(true)
      fetchPage(0, false)
    }
  }, [open, loaded, fetchPage])

  const handleLoadMore = () => fetchPage(offset, true)
  const handleRefresh = () => {
    setOffset(0)
    setEntries([])
    setLoaded(false)
    fetchPage(0, false)
  }
  const handleToggle = () => setOpen(prev => !prev)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header — toggle */}
      <button
        onClick={handleToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#33C7BE]" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Historial de accesos</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              NOM-024 §6.6 — Registro cronológico de quién ha accedido a tu expediente.
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Collapsible content */}
      {open && <>
      <div className="px-6 py-2 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={loading}
          title="Actualizar"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-50">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#33C7BE]" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 px-6 py-5 text-sm text-red-600">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No hay registros de acceso todavía.
          </div>
        )}

        {!loading && entries.map(entry => {
          const isOwnAction = entry.actor_id === user?.id
          const actorLabel = isOwnAction
            ? 'Tú'
            : (entry.actor_name ?? 'Usuario desconocido')
          const roleLabel = entry.actor_role === 'doctor'
            ? ' (médico)'
            : entry.actor_role === 'assistant'
            ? ' (asistente)'
            : ''

          return (
            <div key={entry.id} className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition-colors">
              {/* Icon badge */}
              <span className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${actionColor(entry.action)}`}>
                {actionIcon(entry.action)}
              </span>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {actionLabel(entry.action)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">{actorLabel}</span>
                  {roleLabel}
                  {entry.resource_type && (
                    <span className="text-gray-400"> · {entry.resource_type}</span>
                  )}
                </p>
              </div>

              {/* Timestamp */}
              <time className="text-xs text-gray-400 flex-shrink-0 mt-0.5 text-right">
                {formatDate(entry.created_at)}
              </time>
            </div>
          )
        })}

        {/* Load more */}
        {!loading && hasMore && (
          <div className="px-6 py-4 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 text-sm font-semibold text-[#33C7BE] hover:text-teal-700 transition-colors disabled:opacity-50"
            >
              {loadingMore
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</>
                : <><ChevronDown className="w-4 h-4" /> Ver más registros</>
              }
            </button>
          </div>
        )}
      </div>
      </>}
    </div>
  )
}
