import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MoreVertical, FileText, Activity, Pill, Download,
  Trash2, Eye, Microscope, ShieldCheck, FolderOpen,
  Loader2, Share2, Link2, Music, Video, FileSpreadsheet,
} from 'lucide-react'
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { getDocumentDownloadUrl, getDecryptedDocumentUrl } from '@/shared/lib/queries/documents'
import { useCrypto } from '@/context/CryptoContext'
import type { Database } from '@/shared/types/database'

if (import.meta.env.DEV) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
} else {
  pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs'
}

type Document = Database['public']['Tables']['documents']['Row']
type DocCategory = Database['public']['Enums']['doc_category']

interface DocumentCardProps {
  document: Document
  onDelete: (documentId: string) => void
  onDragStart?: (documentId: string, e: React.DragEvent) => void
  isMoving?: boolean
  onShare?: (documentId: string, title: string) => void
  onPreview?: (document: Document) => void
}

const CATEGORY_CONFIG: Record<DocCategory, {
  label: string
  gradient: string
  iconBg: string
  textColor: string
  badge: string
  icon: React.ReactNode
}> = {
  radiology: {
    label: 'Radiología',
    gradient: 'from-sky-400 to-blue-500',
    iconBg: 'bg-sky-50',
    textColor: 'text-sky-500',
    badge: 'bg-sky-100 text-sky-700',
    icon: <Activity className="w-5 h-5" />,
  },
  prescription: {
    label: 'Receta',
    gradient: 'from-violet-400 to-purple-500',
    iconBg: 'bg-violet-50',
    textColor: 'text-violet-500',
    badge: 'bg-violet-100 text-violet-700',
    icon: <Pill className="w-5 h-5" />,
  },
  history: {
    label: 'Historial',
    gradient: 'from-amber-400 to-orange-500',
    iconBg: 'bg-amber-50',
    textColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    icon: <FileText className="w-5 h-5" />,
  },
  lab: {
    label: 'Laboratorio',
    gradient: 'from-emerald-400 to-green-500',
    iconBg: 'bg-emerald-50',
    textColor: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: <Microscope className="w-5 h-5" />,
  },
  insurance: {
    label: 'Seguro',
    gradient: 'from-rose-400 to-pink-500',
    iconBg: 'bg-rose-50',
    textColor: 'text-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  consultation: {
    label: 'Consulta',
    gradient: 'from-sky-400 to-cyan-500',
    iconBg: 'bg-sky-50',
    textColor: 'text-sky-500',
    badge: 'bg-sky-100 text-sky-700',
    icon: <FileText className="w-5 h-5" />,
  },
  surgery: {
    label: 'Cirugía',
    gradient: 'from-red-400 to-rose-500',
    iconBg: 'bg-red-50',
    textColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
    icon: <Activity className="w-5 h-5" />,
  },
  vaccine: {
    label: 'Vacunas',
    gradient: 'from-lime-400 to-green-500',
    iconBg: 'bg-lime-50',
    textColor: 'text-lime-600',
    badge: 'bg-lime-100 text-lime-700',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  referral: {
    label: 'Referencia',
    gradient: 'from-violet-400 to-indigo-500',
    iconBg: 'bg-violet-50',
    textColor: 'text-violet-500',
    badge: 'bg-violet-100 text-violet-700',
    icon: <FolderOpen className="w-5 h-5" />,
  },
  other: {
    label: 'Otro',
    gradient: 'from-slate-400 to-gray-500',
    iconBg: 'bg-gray-50',
    textColor: 'text-gray-400',
    badge: 'bg-gray-100 text-gray-600',
    icon: <FolderOpen className="w-5 h-5" />,
  },
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return null
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
  return `${mb.toFixed(1)} MB`
}

/** Returns which kind of thumbnail to show, or null for no thumbnail */
function getThumbnailType(mimeType: string | null): 'image' | 'pdf' | 'video' | 'audio' | 'office' | null {
  if (!mimeType) return null
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType.includes('msword') || mimeType.includes('wordprocessingml') ||
    mimeType.includes('ms-excel') || mimeType.includes('spreadsheetml') ||
    mimeType.includes('ms-powerpoint') || mimeType.includes('presentationml')
  ) return 'office'
  return null
}

// ── Thumbnail sub-components ─────────────────────────────────────────────────

function ImageThumb({ url, title, gradient }: { url: string; title: string; gradient: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  return (
    <div className="relative w-full h-full">
      {!loaded && !error && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20 flex items-center justify-center`}>
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      )}
      {error ? (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-20 flex items-center justify-center`}>
          <FileText className="w-8 h-8 text-gray-300" />
        </div>
      ) : (
        <img
          src={url}
          alt={title}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}

function PdfThumb({ url, gradient }: { url: string; gradient: string }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (containerRef.current) setWidth(containerRef.current.offsetWidth)
  }, [])

  if (error) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-15 flex items-center justify-center`}>
        <FileText className="w-8 h-8 text-gray-300" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {(!ready || width === 0) && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-15 flex items-center justify-center`}>
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      )}
      {width > 0 && (
        <PdfDocument
          file={url}
          onLoadSuccess={() => setReady(true)}
          onLoadError={() => setError(true)}
          loading={null}
          error={null}
          className={ready ? 'opacity-100' : 'opacity-0'}
        >
          <PdfPage
            pageNumber={1}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pointer-events-none"
          />
        </PdfDocument>
      )}
    </div>
  )
}

function IconThumb({
  gradient, icon,
}: { gradient: string; icon: React.ReactNode }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <div className="text-white/60 scale-[2]">{icon}</div>
    </div>
  )
}

// ── Main card ────────────────────────────────────────────────────────────────

export const DocumentCard = ({ document, onDelete, onDragStart, isMoving, onShare, onPreview }: DocumentCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const blobUrlRef = useRef<string | null>(null)
  const navigate = useNavigate()
  const { privateKey } = useCrypto()

  const config = CATEGORY_CONFIG[document.category] ?? CATEGORY_CONFIG.other
  const isExternal = !!document.external_url
  const fileSize = formatFileSize(document.file_size)
  const isSharedDoc = document.uploaded_by && document.uploaded_by !== document.owner_id
  const thumbType = isExternal ? null : getThumbnailType(document.mime_type)
  const hasThumbnail = thumbType !== null
  const isEncrypted = !!(document as Document & { is_encrypted?: boolean }).is_encrypted

  // Lazy-fetch the signed URL (or decrypted blob URL) once the card enters the viewport
  useEffect(() => {
    if (!hasThumbnail || isExternal) return
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          if (isEncrypted && privateKey) {
            getDecryptedDocumentUrl(document, privateKey).then(url => {
              if (url) {
                blobUrlRef.current = url
                setThumbUrl(url)
              }
            })
          } else {
            getDocumentDownloadUrl(document).then(url => {
              if (url) setThumbUrl(url)
            })
          }
        }
      },
      { threshold: 0.05, rootMargin: '100px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.id, hasThumbnail, isExternal, isEncrypted, privateKey])

  // Revoke blob URL on unmount to free memory
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const handleAbrir = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (onPreview) {
      onPreview(document)
    } else {
      navigate(`/dashboard/documentos/${document.id}`)
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isExternal) {
      window.open(document.external_url!, '_blank', 'noopener')
    } else {
      const url = await getDocumentDownloadUrl(document)
      if (url) window.open(url, '_blank')
    }
    setMenuOpen(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(document.id)
    setMenuOpen(false)
  }

  return (
    <div
      ref={cardRef}
      className={`relative bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col
        shadow-sm hover:shadow-xl hover:shadow-gray-200/60 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm
        transition-all duration-200 cursor-pointer group
        ${isMoving ? 'opacity-50 pointer-events-none' : ''}`}
      draggable={!!onDragStart}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(document.id, e) }}
      onClick={handleAbrir}
    >
      {isMoving && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}

      {/* ── Thumbnail area (only for image/pdf/video/audio/office) ── */}
      {hasThumbnail && (
        <div className="relative h-40 overflow-hidden shrink-0 bg-gray-50">
          {thumbUrl ? (
            thumbType === 'image' ? (
              <ImageThumb url={thumbUrl} title={document.title} gradient={config.gradient} />
            ) : thumbType === 'pdf' ? (
              <PdfThumb url={thumbUrl} gradient={config.gradient} />
            ) : thumbType === 'video' ? (
              <IconThumb gradient={config.gradient} icon={<Video className="w-5 h-5" />} />
            ) : thumbType === 'audio' ? (
              <IconThumb gradient={config.gradient} icon={<Music className="w-5 h-5" />} />
            ) : (
              <IconThumb gradient={config.gradient} icon={<FileSpreadsheet className="w-5 h-5" />} />
            )
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${config.gradient} opacity-[0.12] flex items-center justify-center`}>
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          )}

          {/* Category badge overlay */}
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${config.badge} shadow-sm`}>
              {config.label}
            </span>
          </div>

          {isSharedDoc && (
            <div className="absolute top-2 right-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 shadow-sm">
                Compartido
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">

        {/* Header row: icon + badges */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`${config.textColor} shrink-0`}>{isExternal ? <Link2 className="w-4 h-4" /> : config.icon}</span>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${config.badge}`}>
            {config.label}
          </span>
          {isSharedDoc && !hasThumbnail && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
              Compartido
            </span>
          )}
          {isExternal && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Enlace
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-1 flex-1">
          {document.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5">
          <span>{formatDate(document.created_at)}</span>
          {fileSize && <><span>·</span><span>{fileSize}</span></>}
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleAbrir}
            className={`inline-flex items-center gap-1.5 text-xs font-bold ${config.textColor} hover:opacity-70 transition-opacity`}
          >
            <Eye size={13} />
            Ver
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-gray-50 text-primary hover:bg-primary/10 transition-colors"
              title="Descargar"
            >
              <Download size={13} />
            </button>
            {onShare && (
              <button
                onClick={(e) => { e.stopPropagation(); onShare(document.id, document.title) }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-primary"
                title="Compartir"
              >
                <Share2 size={13} />
              </button>
            )}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                  <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleAbrir() }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Eye size={14} /> Ver
                    </button>
                    <button
                      onClick={handleDownload}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download size={14} /> Descargar
                    </button>
                    <div className="h-px bg-gray-100 mx-2 my-1" />
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
