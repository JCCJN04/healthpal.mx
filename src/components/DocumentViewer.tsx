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
      <div className="bg-gray-100 p-8 min-h-[600px] flex items-center justify-center">
        {fileUrl ? (
          <div 
            className="bg-white shadow-lg w-full max-w-3xl mx-auto"
            style={{ 
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease'
            }}
          >
            {fileType === 'pdf' ? (
              <iframe
                src={fileUrl}
                title={title || 'Document viewer'}
                className="w-full h-[700px] border-0"
              />
            ) : (
              <img 
                src={fileUrl} 
                alt={title || 'Document'} 
                className="w-full h-auto"
              />
            )}
          </div>
        ) : (
          // Placeholder when no file
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Vista previa no disponible
            </h3>
            <p className="text-sm text-gray-500">
              El documento no puede ser visualizado en este momento
            </p>
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
