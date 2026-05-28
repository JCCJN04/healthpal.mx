import { useState, useEffect, useRef } from 'react'
import {
  ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2,
  FileText, ChevronLeft, ChevronRight,
  Download, Music, FileType, Loader2,
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { DicomViewer } from './DicomViewer'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

interface DocumentViewerProps {
  fileUrl?: string
  fileType?: 'pdf' | 'image' | 'video' | 'audio' | 'office' | 'text' | 'dicom' | 'other'
  title?: string
  mimeType?: string
}

export const DocumentViewer = ({ fileUrl, fileType = 'pdf', title }: DocumentViewerProps) => {
  const [zoom, setZoom] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [containerWidth, setContainerWidth] = useState(0)
  // Blob URL for PDFs — avoids CORS issues with pdfjs worker making range requests
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Pre-fetch PDF as blob so pdfjs worker never makes cross-origin requests to storage.
  // If fileUrl is already a blob (in-browser decryption result), use it directly.
  useEffect(() => {
    if (fileType !== 'pdf' || !fileUrl) return
    setPdfLoading(true)
    if (fileUrl.startsWith('blob:')) {
      setPdfBlobUrl(fileUrl)
      return
    }
    let revoked = false
    setPdfBlobUrl(null)
    fetch(fileUrl)
      .then(r => r.blob())
      .then(blob => {
        if (revoked) return
        setPdfBlobUrl(URL.createObjectURL(blob))
      })
      .catch(() => {
        if (!revoked) setPdfLoading(false)
      })
    return () => {
      revoked = true
    }
  }, [fileUrl, fileType])

  // Revoke blob URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
    }
  }, [pdfBlobUrl])

  // Track container width for responsive PDF rendering
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0
      setContainerWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Load text content
  useEffect(() => {
    if (fileType === 'text' && fileUrl) {
      setTextLoading(true)
      fetch(fileUrl)
        .then(r => r.text())
        .then(t => setTextContent(t))
        .catch(() => setTextContent(null))
        .finally(() => setTextLoading(false))
    }
  }, [fileUrl, fileType])

  // Fullscreen API
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages)
    setCurrentPage(1)
    setPdfLoading(false)
  }

  // Compute PDF page scale to fit container width (16px total padding at p-2)
  const pdfScale = containerWidth > 0 ? Math.min((containerWidth - 16) / 595, zoom / 100) : zoom / 100

  const zoomIn  = () => setZoom(p => Math.min(p + 25, 200))
  const zoomOut = () => setZoom(p => Math.max(p - 25, 25))
  const rotate  = () => setRotation(p => (p + 90) % 360)
  const fitWidth = () => setZoom(100)
  const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1))
  const nextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages))

  const isPdfOrImage = fileType === 'pdf' || fileType === 'image'

  return (
    <div ref={wrapperRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">

      {/* ── Toolbar (PDF / Image only) ──────────────────────── */}
      {isPdfOrImage && (
        <div className="bg-gray-50 border-b border-gray-100 px-3 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">

            {/* Zoom controls */}
            <div className="flex items-center gap-1 order-1">
              <ToolBtn onClick={zoomOut} disabled={zoom <= 25} title="Reducir zoom">
                <ZoomOut className="w-4 h-4" />
              </ToolBtn>
              <span className="text-xs font-semibold text-gray-600 min-w-[38px] text-center tabular-nums select-none">
                {zoom}%
              </span>
              <ToolBtn onClick={zoomIn} disabled={zoom >= 200} title="Ampliar zoom">
                <ZoomIn className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={fitWidth} title="Ajustar al ancho">
                <Maximize2 className="w-4 h-4" />
              </ToolBtn>
            </div>

            {/* Page navigation (PDF only) */}
            {fileType === 'pdf' && (
              <div className="flex items-center gap-1 order-3 sm:order-2 w-full sm:w-auto justify-center">
                <ToolBtn onClick={prevPage} disabled={currentPage <= 1} title="Página anterior">
                  <ChevronLeft className="w-4 h-4" />
                </ToolBtn>
                <span className="text-xs text-gray-600 px-2 tabular-nums whitespace-nowrap select-none">
                  {pdfLoading ? '— / —' : `${currentPage} / ${totalPages}`}
                </span>
                <ToolBtn onClick={nextPage} disabled={currentPage >= totalPages} title="Página siguiente">
                  <ChevronRight className="w-4 h-4" />
                </ToolBtn>
              </div>
            )}

            {/* Right controls */}
            <div className="flex items-center gap-1 order-2 sm:order-3 ml-auto sm:ml-0">
              <ToolBtn onClick={rotate} title="Rotar 90°">
                <RotateCw className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={toggleFullscreen} title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
                {isFullscreen
                  ? <Minimize2 className="w-4 h-4" />
                  : <Maximize2 className="w-4 h-4" />
                }
              </ToolBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Viewer area ─────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="bg-[#f0f2f5] overflow-auto flex items-start justify-center p-2"
      >
        {!fileUrl ? (
          <EmptyState onReload={() => window.location.reload()} />
        ) : (
          <>
            {/* PDF */}
            {fileType === 'pdf' && (
              <div className="w-full flex flex-col items-center gap-0">
                {(pdfLoading || !pdfBlobUrl) && (
                  <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm">Cargando PDF...</span>
                  </div>
                )}
                {pdfBlobUrl && <Document
                  file={pdfBlobUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={() => setPdfLoading(false)}
                  loading={null}
                  error={
                    <div className="flex flex-col items-center gap-3 py-20 text-red-400">
                      <FileText className="w-10 h-10" />
                      <p className="text-sm font-medium">No se pudo cargar el PDF</p>
                    </div>
                  }
                  className={pdfLoading ? 'opacity-0 h-0 overflow-hidden' : ''}
                >
                  <Page
                    pageNumber={currentPage}
                    scale={pdfScale * (zoom / 100)}
                    rotate={rotation}
                    renderTextLayer
                    renderAnnotationLayer
                    className="overflow-hidden"
                  />
                </Document>}
              </div>
            )}

            {/* Image */}
            {fileType === 'image' && (
              <div
                className="w-full transition-transform duration-300 ease-out origin-top"
                style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
              >
                <img
                  src={fileUrl}
                  alt={title || 'Documento'}
                  className="w-full h-auto block shadow-xl object-contain"
                  draggable={false}
                />
              </div>
            )}

            {/* Video */}
            {fileType === 'video' && (
              <div className="w-full max-w-3xl mx-auto">
                <video
                  src={fileUrl}
                  controls
                  playsInline
                  className="w-full rounded-xl shadow-xl bg-black"
                  style={{ maxHeight: 'clamp(240px, 65vh, 720px)' }}
                >
                  Tu navegador no soporta la reproducción de video.
                </video>
              </div>
            )}

            {/* Audio */}
            {fileType === 'audio' && (
              <div className="flex flex-col items-center gap-6 py-12 px-6 w-full max-w-sm mx-auto">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center shadow-inner">
                  <Music className="w-12 h-12 text-primary" />
                </div>
                <p className="font-semibold text-gray-800 text-center text-sm leading-snug">{title}</p>
                <audio src={fileUrl} controls className="w-full rounded-lg">
                  Tu navegador no soporta reproducción de audio.
                </audio>
              </div>
            )}

            {/* Text / CSV */}
            {fileType === 'text' && (
              <div className="bg-white rounded-xl shadow-sm w-full max-w-3xl p-5 sm:p-8 overflow-auto">
                {textLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 py-10 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Cargando contenido...</span>
                  </div>
                ) : textContent !== null ? (
                  <pre className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {textContent}
                  </pre>
                ) : (
                  <p className="text-red-500 text-sm text-center py-10">No se pudo cargar el contenido.</p>
                )}
              </div>
            )}

            {/* Office (Word / Excel / PowerPoint) */}
            {fileType === 'office' && (
              <div className="w-full flex flex-col gap-3">
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                  className="w-full rounded-xl shadow-xl border border-gray-200 bg-white"
                  style={{ height: 'clamp(400px, 70vh, 900px)' }}
                  title={title}
                />
                <p className="text-xs text-gray-400 text-center">
                  Visualizado con Microsoft Office Online.{' '}
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Descargar
                  </a>{' '}
                  si no carga.
                </p>
              </div>
            )}

            {/* DICOM */}
            {fileType === 'dicom' && (
              <div className="w-full">
                <DicomViewer fileUrl={fileUrl} title={title} />
              </div>
            )}

            {/* Other */}
            {fileType === 'other' && (
              <div className="flex flex-col items-center gap-5 py-16 px-6 max-w-xs mx-auto text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <FileType className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Vista previa no disponible</h3>
                  <p className="text-sm text-gray-500">
                    Este formato no puede visualizarse en el navegador. Descárgalo para abrirlo en tu dispositivo.
                  </p>
                </div>
                <a
                  href={fileUrl}
                  download={title}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm w-full justify-center"
                >
                  <Download className="w-5 h-5" />
                  Descargar archivo
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Toolbar button ──────────────────────────────────────────
function ToolBtn({
  onClick, disabled, title, children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation"
    >
      {children}
    </button>
  )
}

// ── Empty state ─────────────────────────────────────────────
function EmptyState({ onReload }: { onReload: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16 px-6 max-w-xs mx-auto text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center">
        <FileText className="w-10 h-10 text-gray-300" />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 mb-1">Vista previa no disponible</h3>
        <p className="text-sm text-gray-500">El enlace ha caducado o el documento es privado.</p>
      </div>
      <button
        onClick={onReload}
        className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full"
      >
        Recargar página
      </button>
    </div>
  )
}
