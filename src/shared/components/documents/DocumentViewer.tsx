import { useState } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Maximize2, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface DocumentViewerProps {
  fileUrl?: string
  fileType?: 'pdf' | 'image'
  title?: string
}

export const DocumentViewer = ({ fileUrl, fileType = 'pdf', title }: DocumentViewerProps) => {
  const [zoom, setZoom] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [rotation, setRotation] = useState(0)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages)
    setCurrentPage(1)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleFitToWidth = () => {
    setZoom(100)
  }

  const prevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const nextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  // TODO: Replace with react-pdf library for production
  // For now, using iframe as placeholder

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Viewer Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Zoom out"
              disabled={zoom <= 50}
            >
              <ZoomOut className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Zoom in"
              disabled={zoom >= 200}
            >
              <ZoomIn className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Center: Page indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1 || fileType !== 'pdf'}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              title="Previous page"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="text-sm text-gray-600 min-w-[100px] text-center">
              Página {currentPage} / {totalPages}
            </div>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages || fileType !== 'pdf'}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              title="Next page"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Right: View controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFitToWidth}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Fit to width"
            >
              <Maximize2 className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Viewer Area */}
      <div className="bg-gray-100 p-4 md:p-8 min-h-[600px] flex items-center justify-center relative group/viewer overflow-hidden">
        {fileUrl ? (
          <div className="bg-white shadow-lg w-full max-w-4xl mx-auto relative overflow-auto flex justify-center max-h-[700px]">
            {fileType === 'pdf' ? (
              <div className="relative w-full flex justify-center bg-gray-200">
                <Document
                  file={fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div className="p-12 text-gray-500">Cargando documento...</div>}
                  error={<div className="p-12 text-red-500">Error al cargar el documento</div>}
                  className="shadow-sm"
                >
                  <Page 
                    pageNumber={currentPage} 
                    scale={zoom / 100} 
                    rotate={rotation}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
                {/* Fallback overlay if viewing outside is needed */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/10 pointer-events-none opacity-0 group-hover/viewer:opacity-100 transition-opacity">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto bg-primary text-white mt-auto mb-10 px-6 py-2 rounded-lg shadow-lg font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <Maximize2 size={18} />
                    ABRIR EN PANTALLA COMPLETA
                  </a>
                </div>
              </div>
            ) : (
              <div 
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease'
                }}
                className="w-full flex justify-center"
              >
                <img
                  src={fileUrl}
                  alt={title || 'Document'}
                  className="w-full h-auto rounded-sm object-contain"
                />
              </div>
            )}
          </div>
        ) : (
          // Placeholder when no file
          <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6 text-primary">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Vista previa no disponible
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              El documento es privado o el enlace ha caducado. Intenta recargar la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-md"
            >
              Recargar Página
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
