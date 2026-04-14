import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Download, Share2, ExternalLink, ArrowUpRight,
  Loader2, Link2, AlertTriangle, RefreshCw,
  Activity, Pill, FileText, Microscope, ShieldCheck, FolderOpen,
} from 'lucide-react'
import { DocumentViewer } from './DocumentViewer'
import { getDocumentDownloadUrl, downloadDocumentFile } from '@/shared/lib/queries/documents'
import { showToast } from '@/shared/components/ui/Toast'
import type { Database } from '@/shared/types/database'

type Document = Database['public']['Tables']['documents']['Row']
type DocCategory = Database['public']['Enums']['doc_category']

interface DocumentPreviewModalProps {
  document: Document | null
  onClose: () => void
  onShare?: (docId: string, title: string) => void
}

// ── Category config (mirrors DocumentCard) ─────────────────────────────────
const CATEGORY_CONFIG: Record<DocCategory, { label: string; gradient: string; badge: string; icon: React.ReactNode }> = {
  radiology:    { label: 'Radiología',   gradient: 'from-sky-400 to-blue-500',      badge: 'bg-sky-100 text-sky-700',       icon: <Activity className="w-4 h-4" /> },
  prescription: { label: 'Receta',       gradient: 'from-violet-400 to-purple-500', badge: 'bg-violet-100 text-violet-700', icon: <Pill className="w-4 h-4" /> },
  history:      { label: 'Historial',    gradient: 'from-amber-400 to-orange-500',  badge: 'bg-amber-100 text-amber-700',   icon: <FileText className="w-4 h-4" /> },
  lab:          { label: 'Laboratorio',  gradient: 'from-emerald-400 to-green-500', badge: 'bg-emerald-100 text-emerald-700', icon: <Microscope className="w-4 h-4" /> },
  insurance:    { label: 'Seguro',       gradient: 'from-rose-400 to-pink-500',     badge: 'bg-rose-100 text-rose-700',     icon: <ShieldCheck className="w-4 h-4" /> },
  other:        { label: 'Otro',         gradient: 'from-slate-400 to-gray-500',    badge: 'bg-gray-100 text-gray-600',     icon: <FolderOpen className="w-4 h-4" /> },
}

function getFileType(mimeType: string | null, title?: string | null): 'pdf' | 'image' | 'video' | 'audio' | 'office' | 'text' | 'dicom' | 'other' {
  if (!mimeType) return 'other'
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType === 'application/dicom') return 'dicom'
  if (mimeType === 'application/octet-stream' && title?.toLowerCase().endsWith('.dcm')) return 'dicom'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType.includes('msword') || mimeType.includes('wordprocessingml') ||
    mimeType.includes('ms-excel') || mimeType.includes('spreadsheetml') ||
    mimeType.includes('ms-powerpoint') || mimeType.includes('presentationml')
  ) return 'office'
  if (mimeType.startsWith('text/') || mimeType.includes('csv')) return 'text'
  return 'other'
}

export function DocumentPreviewModal({ document, onClose, onShare }: DocumentPreviewModalProps) {
  const navigate = useNavigate()
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [urlLoading, setUrlLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const fetchUrl = useCallback(async () => {
    if (!document) return
    if (document.external_url) {
      setFileUrl(document.external_url)
      return
    }
    setUrlLoading(true)
    setLoadError(false)
    const url = await getDocumentDownloadUrl(document)
    if (url) {
      setFileUrl(url)
    } else {
      setLoadError(true)
    }
    setUrlLoading(false)
  }, [document])

  useEffect(() => {
    if (document) {
      setFileUrl(null)
      setLoadError(false)
      fetchUrl()
    }
  }, [document, fetchUrl])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document && (window.document.body.style.overflow = 'hidden')
    return () => { window.document.body.style.overflow = '' }
  }, [document])

  if (!document) return null

  const config = CATEGORY_CONFIG[document.category as DocCategory] ?? CATEGORY_CONFIG.other
  const isExternal = !!document.external_url
  const fileType = getFileType(document.mime_type, document.title)

  const handleDownload = async () => {
    if (isExternal) {
      window.open(document.external_url!, '_blank', 'noopener')
      return
    }
    setDownloading(true)
    const result = await downloadDocumentFile(document, document.title)
    if (!result.success) showToast(result.error || 'No se pudo descargar', 'error')
    setDownloading(false)
  }

  const handleViewDetail = () => {
    onClose()
    navigate(`/dashboard/documentos/${document.id}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative bg-white flex flex-col w-full h-full sm:h-auto sm:max-h-[95vh] sm:w-[92vw] sm:max-w-4xl sm:m-auto sm:rounded-2xl sm:shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient} shrink-0`} />
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
          {/* Category badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.badge} shrink-0`}>
            {config.icon}
            {config.label}
          </span>

          {/* Title */}
          <h2 className="flex-1 min-w-0 text-sm sm:text-base font-bold text-gray-900 truncate">
            {document.title}
          </h2>

          {/* External badge */}
          {isExternal && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold shrink-0">
              <Link2 className="w-3 h-3" />
              ENLACE
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onShare && (
              <button
                onClick={() => onShare(document.id, document.title)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                title="Compartir"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleViewDetail}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="Ver página de detalle"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Detalle
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Viewer area ───────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-auto">
          {urlLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Cargando vista previa…</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 px-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">No se pudo cargar el documento</p>
                <p className="text-sm text-gray-500">El enlace expiró o no tienes permisos.</p>
              </div>
              <button
                onClick={fetchUrl}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          ) : isExternal ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Link2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-1">Estudio en plataforma externa</p>
                <p className="text-sm text-gray-500 break-all max-w-sm">{document.external_url}</p>
              </div>
              <a
                href={document.external_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir estudio
              </a>
            </div>
          ) : fileUrl ? (
            <DocumentViewer
              fileUrl={fileUrl}
              fileType={fileType}
              title={document.title}
              mimeType={document.mime_type ?? undefined}
            />
          ) : null}
        </div>

        {/* ── Footer (mobile-first action bar) ─────────────── */}
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 flex items-center gap-2 bg-white">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all"
          >
            {downloading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isExternal ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />
            }
            {isExternal ? 'Abrir enlace' : 'Descargar'}
          </button>
          <button
            onClick={handleViewDetail}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            Ver detalle
          </button>
        </div>
      </div>
    </div>
  )
}
