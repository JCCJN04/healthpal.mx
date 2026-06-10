/**
 * NOM-024-SSA3-2012 §6.6.6 — Exportación del expediente clínico
 * Patient-facing card to download their complete medical record as JSON.
 */
import { useState } from 'react'
import { Download, FileText, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { exportPatientData, downloadPatientExport } from '@/shared/lib/queries/exportData'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

export default function DataExportCard() {
  const [loading, setLoading] = useState(false)
  const [lastExport, setLastExport] = useState<string | null>(null)

  const handleExport = async () => {
    setLoading(true)
    try {
      const data = await exportPatientData()
      await downloadPatientExport(data)
      const ts = new Date().toLocaleString('es-MX')
      setLastExport(ts)
      showToast('Expediente exportado correctamente', 'success')
    } catch (err) {
      logger.error('DataExportCard:export', err)
      showToast('Error al exportar el expediente. Intenta de nuevo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#33C7BE]" />
          <h3 className="text-lg font-bold text-gray-900">Exportar mi expediente</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          NOM-024 §6.6.6 — Descarga toda tu información médica en formato PDF.
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* What's included */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            El archivo incluye
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#33C7BE] flex-shrink-0" />
              Perfil personal (CURP, apellidos, datos de nacimiento)
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#33C7BE] flex-shrink-0" />
              Historial clínico completo
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#33C7BE] flex-shrink-0" />
              Citas médicas (historial completo)
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#33C7BE] flex-shrink-0" />
              Listado de documentos (metadata)
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#33C7BE] flex-shrink-0" />
              Consentimientos de acceso otorgados a doctores
            </li>
          </ul>
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Este archivo contiene información médica confidencial. Guárdalo en un lugar seguro
            y no lo compartas con personas no autorizadas.
          </span>
        </div>

        {/* Last export */}
        {lastExport && (
          <p className="text-xs text-gray-500">
            Última exportación: {lastExport}
          </p>
        )}

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando exportación...</>
            : <><Download className="w-4 h-4" /> Descargar expediente</>
          }
        </button>
      </div>
    </div>
  )
}
