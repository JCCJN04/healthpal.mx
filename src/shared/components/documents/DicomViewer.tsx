import { useEffect, useRef, useState } from 'react'
import { ScanLine, ZoomIn, Sun, MoveHorizontal, Layers, Loader2, AlertCircle, Download } from 'lucide-react'

interface DicomViewerProps {
  fileUrl: string
  title?: string
}

type DicomTool = 'WindowLevel' | 'ZoomAndPan' | 'Scroll'

export const DicomViewer = ({ fileUrl, title }: DicomViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<DicomTool>('WindowLevel')
  const [frame, setFrame] = useState(1)
  const [totalFrames, setTotalFrames] = useState(1)

  useEffect(() => {
    let mounted = true

    const initDwv = async () => {
      try {
        const { App, AppOptions, ViewConfig } = await import('dwv')

        if (!mounted || !containerRef.current) return

        const containerId = 'dwv-layer-group'
        const app = new App()
        appRef.current = app

        const viewConfig = new ViewConfig(containerId)
        const viewConfigs: Record<string, typeof viewConfig[]> = { '*': [viewConfig] }
        const options = new AppOptions(viewConfigs)

        app.init(options)

        app.addEventListener('loadend', () => {
          if (!mounted) return
          setLoading(false)
          // Check if multi-frame (e.g. CT/MRI series)
          try {
            const vc = (app as any).getViewController?.(containerId)
            const nFrames = vc?.getNumberOfFrames?.() ?? 1
            if (nFrames > 1) setTotalFrames(nFrames)
          } catch {
            // single frame
          }
        })

        app.addEventListener('error', (e: any) => {
          if (!mounted) return
          setLoading(false)
          setError(e?.error?.message ?? 'No se pudo cargar el archivo DICOM.')
        })

        app.loadURLs([fileUrl])
      } catch (err: any) {
        if (mounted) {
          setLoading(false)
          setError('El visor DICOM no pudo inicializarse.')
        }
      }
    }

    initDwv()

    return () => {
      mounted = false
      try { appRef.current?.abortAllLoads?.() } catch { /* ignore */ }
    }
  }, [fileUrl])

  const setTool = (tool: DicomTool) => {
    setActiveTool(tool)
    try { appRef.current?.setTool(tool) } catch { /* ignore */ }
  }

  const handleFrameChange = (next: number) => {
    const clamped = Math.max(1, Math.min(next, totalFrames))
    setFrame(clamped)
    try {
      const vc = (appRef.current as any)?.getViewController?.('dwv-layer-group')
      vc?.setCurrentFrame?.(clamped - 1)
    } catch { /* ignore */ }
  }

  const toolButton = (tool: DicomTool, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setTool(tool)}
      title={label}
      className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
        activeTool === tool
          ? 'bg-primary text-white shadow-sm'
          : 'hover:bg-gray-200 text-gray-700'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {toolButton('WindowLevel', <Sun className="w-4 h-4" />, 'Brillo/Contraste')}
          {toolButton('ZoomAndPan', <ZoomIn className="w-4 h-4" />, 'Zoom')}
          {toolButton('Scroll', <Layers className="w-4 h-4" />, 'Scroll')}
        </div>

        {totalFrames > 1 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button
              onClick={() => handleFrameChange(frame - 1)}
              disabled={frame <= 1}
              className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-40 transition-colors"
            >
              <MoveHorizontal className="w-4 h-4 rotate-180" />
            </button>
            <span className="min-w-[80px] text-center font-medium">
              Corte {frame} / {totalFrames}
            </span>
            <button
              onClick={() => handleFrameChange(frame + 1)}
              disabled={frame >= totalFrames}
              className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-40 transition-colors"
            >
              <MoveHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <ScanLine className="w-4 h-4" />
          <span className="hidden sm:inline">DICOM</span>
        </div>
      </div>

      {/* Viewer container */}
      <div className="bg-black min-h-[600px] relative flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-10 gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-300 text-sm">Cargando imagen médica...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-10 gap-4 p-8">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white font-semibold text-center">{error}</p>
            <p className="text-gray-400 text-sm text-center">
              Puedes descargar el archivo y abrirlo con un visor DICOM como RadiAnt o Horos.
            </p>
            <a
              href={fileUrl}
              download={title}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar archivo
            </a>
          </div>
        )}

        {/* dwv renders a canvas inside this div */}
        <div
          id="dwv-layer-group"
          ref={containerRef}
          className="w-full"
          style={{ minHeight: '600px' }}
        />
      </div>

      {/* Tips */}
      {!loading && !error && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 text-xs text-gray-400 flex gap-4">
          <span>Arrastrar: mover</span>
          <span>Scroll: zoom</span>
          <span>Brillo/Contraste: ajustar ventana</span>
        </div>
      )}
    </div>
  )
}
