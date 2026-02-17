import { useState } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Maximize2, FileText } from 'lucide-react'

interface DocumentViewerProps {
  fileUrl?: string
  fileType?: 'pdf' | 'image'
  title?: string
}

export const DocumentViewer = ({ fileUrl, fileType = 'pdf', title }: DocumentViewerProps) => {
  const [zoom, setZoom] = useState(100)
  const [currentPage] = useState(1)
  const [totalPages] = useState(4)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
    console.log('Zoom in:', zoom + 25)
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
    console.log('Zoom out:', zoom - 25)
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
    console.log('Rotate:', rotation + 90)
  }

  const handleFitToWidth = () => {
    setZoom(100)
    console.log('Fit to width')
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
          <div className="text-sm text-gray-600">
            Página {currentPage} / {totalPages}
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
      <div className="bg-gray-100 p-4 md:p-8 min-h-[600px] flex items-center justify-center relative group/viewer">
        {fileUrl ? (
          <div
            className="bg-white shadow-lg w-full max-w-4xl mx-auto relative"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease'
            }}
          >
            {fileType === 'pdf' ? (
              <div className="relative w-full h-[700px]">
                <iframe
                  src={`${fileUrl}#toolbar=0`}
                  title={title || 'Document viewer'}
                  className="w-full h-full border-0 rounded-sm"
                />
                {/* Fallback overlay if iframe is blank or blocked */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/10 pointer-events-none opacity-0 group-hover/viewer:opacity-100 transition-opacity">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto bg-primary text-white px-6 py-2 rounded-lg shadow-lg font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <Maximize2 size={18} />
                    ABRIR EN PANTALLA COMPLETA
                  </a>
                </div>
              </div>
            ) : (
              <img
                src={fileUrl}
                alt={title || 'Document'}
                className="w-full h-auto rounded-sm"
              />
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

      {/* TODO Comment for developer */}
      {/* 
        TODO: Replace with react-pdf library
        Install: npm install react-pdf
        Import: import { Document, Page } from 'react-pdf/dist/esm/entry.webpack'
        Usage: <Document file={fileUrl}><Page pageNumber={currentPage} /></Document>
      */}
    </div>
  )
}
