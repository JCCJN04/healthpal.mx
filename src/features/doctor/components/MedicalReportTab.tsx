import { useState, useEffect, useCallback, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'
import { FileText, Loader2, ChevronLeft, Printer, Download, CheckCircle, Clock, Trash2 } from 'lucide-react'
import { showToast } from '@/shared/components/ui/Toast'
import { getMedicalReports, upsertMedicalReport, deleteMedicalReport, uploadReportPdf, getReportPdfSignedUrl, fetchTemplatePdf, MedicalReport } from '@/shared/lib/queries/medicalReports'
import { getClinicalHistory } from '@/shared/lib/queries/clinicalHistory'
import { logger } from '@/shared/lib/logger'

// ── Aseguradoras con plantilla PDF ────────────────────────────────────────────
// IDs deben coincidir con ASEGURADORAS_CON_INFORME en @/shared/lib/queries/insurance

const ASEGURADORAS = [
    { id: 'allianz',           label: 'Allianz',             file: 'Allianz.pdf' },
    { id: 'axa',               label: 'AXA Gastos Médicos',  file: 'axa.pdf' },
    { id: 'axa-cirugias',      label: 'AXA Cirugías',        file: 'axa cirugias.pdf' },
    { id: 'banamex',           label: 'Citibanamex',         file: 'banamex.pdf' },
    { id: 'banorte',           label: 'Banorte',             file: 'banorte.pdf' },
    { id: 'bbva',              label: 'BBVA',                file: 'bbva.pdf' },
    { id: 'bupa',              label: 'Bupa',                file: 'bupa.pdf' },
    { id: 'bxplus',            label: 'BX+',                 file: 'bx+.pdf' },
    { id: 'general-salud',     label: 'General de Salud',    file: 'general de salud.pdf' },
    { id: 'gnp',               label: 'GNP',                 file: 'gnp.pdf' },
    { id: 'inbursa',           label: 'Inbursa',             file: 'inbursa.pdf' },
    { id: 'latinoamerica',     label: 'Latinoamérica',       file: 'lalatino seguros.pdf' },
    { id: 'mapfre',            label: 'Mapfre',              file: 'mapfre.pdf' },
    { id: 'metlife',           label: 'MetLife',             file: 'metlife.pdf' },
    { id: 'multiva',           label: 'Multiva',             file: 'multiva.pdf' },
    { id: 'pan-american',      label: 'Pan American Life',   file: 'pan american.pdf' },
    { id: 'plan-seguro',       label: 'Plan Seguro',         file: 'plan seguro.pdf' },
    { id: 'prevem',            label: 'Prévem',              file: 'prevem.pdf' },
    { id: 'seguros-atlas',     label: 'Seguros Atlas',       file: 'seguros atlas.pdf' },
    { id: 'seguros-monterrey', label: 'Seguros Monterrey',   file: 'seguros monterrey.pdf' },
    { id: 'sis-nova',          label: 'Sis Nova',            file: 'sis nova.pdf' },
    { id: 'sura',              label: 'SURA México',         file: 'sura.pdf' },
    { id: 'telmex',            label: 'Telmex Salud',        file: 'telmex.pdf' },
    { id: 'zurich',            label: 'Zurich Seguros',      file: 'zurich.pdf' },
]

export { ASEGURADORAS }

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob: string | null): string {
    if (!dob) return ''
    const diff = Date.now() - new Date(dob).getTime()
    return String(Math.floor(diff / 31557600000))
}

function splitName(fullName: string | null) {
    const parts = (fullName ?? '').trim().split(/\s+/)
    return {
        apellido_paterno: parts[0] ?? '',
        apellido_materno: parts[1] ?? '',
        nombres: parts.slice(2).join(' '),
    }
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return ''
    // Return dd/mm/yyyy
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

// Normalize field name for matching: lowercase, remove accents, collapse spaces/underscores
function norm(s: string) {
    return s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_\-.]+/g, ' ')
        .trim()
}

function matches(fieldName: string, ...patterns: string[]): boolean {
    const n = norm(fieldName)
    return patterns.some(p => n.includes(norm(p)))
}

// Build a map of field-name → value to pre-fill based on patient data + clinical history
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFillMap(patient: any, medProfile: any, clinicalHistory: any): Record<string, string> {
    const nameParts = splitName(patient?.full_name)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = clinicalHistory as any
    const nph = ch?.non_pathological_history ?? {}
    const gh = ch?.gynecological_history ?? {}
    const ph = ch?.pathological_history ?? {}
    const age = calcAge(patient?.birthdate)
    const sexLabel = patient?.sex === 'male' ? 'Masculino' : patient?.sex === 'female' ? 'Femenino' : ''

    const smokingMap: Record<string, string> = {
        never: 'No fumador', ex: 'Ex-fumador',
        occasional: 'Ocasional', moderate: 'Moderado', heavy: 'Fuerte',
    }

    return {
        __apellido_paterno: nameParts.apellido_paterno,
        __apellido_materno: nameParts.apellido_materno,
        __nombres: nameParts.nombres,
        __nombre_completo: patient?.full_name ?? '',
        __fecha_nac: fmtDate(patient?.birthdate),
        __edad: age,
        __sexo: sexLabel,
        __talla: String(medProfile?.height_cm ?? ''),
        __peso: String(medProfile?.weight_kg ?? ''),
        __tipo_sangre: medProfile?.blood_type ?? '',
        __alergias: medProfile?.allergies ?? ch?.allergies ?? '',
        __tabaquismo: smokingMap[nph.smoking?.frequency ?? ''] ?? (nph.smoking?.present ? 'Sí' : 'No'),
        __alcohol: nph.alcohol?.present ? `Sí — ${nph.alcohol.frequency_per_week ?? '?'} veces/sem` : 'No',
        __drogas: nph.drugs?.present ? `Sí${nph.drugs.details ? ` — ${nph.drugs.details}` : ''}` : 'No',
        __gestas: gh.gestations ?? '',
        __partos: gh.births ?? '',
        __abortos: gh.abortions ?? '',
        __cesareas: gh.cesareans ?? '',
        __ultima_menstruacion: fmtDate(gh.last_period_date),
        __diabetes: ph.diabetes?.present ? `Sí${ph.diabetes.details ? ` — ${ph.diabetes.details}` : ''}` : '',
        __hipertension: ph.hypertension?.present ? `Sí${ph.hypertension.details ? ` — ${ph.hypertension.details}` : ''}` : '',
        __medicamentos: ph.medications?.details ?? medProfile?.current_medications ?? '',
        __cirugias: ph.surgeries?.details ?? '',
        __fecha_informe: fmtDate(new Date().toISOString()),
    }
}

// Try to map a PDF field name to one of our fill-map keys
function resolveFieldValue(fieldName: string, fillMap: Record<string, string>): string | null {
    if (matches(fieldName, 'apellido paterno', 'primer apellido', '1er apellido')) return fillMap.__apellido_paterno
    if (matches(fieldName, 'apellido materno', 'segundo apellido', '2do apellido')) return fillMap.__apellido_materno
    if (matches(fieldName, 'nombre(s)', 'nombre del', 'nombres del', 'nombre asegurado', 'nombre paciente')) return fillMap.__nombres
    if (matches(fieldName, 'nombre completo', 'nombre y apellido')) return fillMap.__nombre_completo
    if (matches(fieldName, 'fecha nac', 'fecha de nac', 'nacimiento')) return fillMap.__fecha_nac
    if (matches(fieldName, 'edad')) return fillMap.__edad
    if (matches(fieldName, 'sexo', 'genero', 'género', 'sex')) return fillMap.__sexo
    if (matches(fieldName, 'talla', 'estatura', 'altura', 'height')) return fillMap.__talla
    if (matches(fieldName, 'peso', 'weight')) return fillMap.__peso
    if (matches(fieldName, 'tipo de sangre', 'grupo sanguineo', 'tipo sangre', 'blood')) return fillMap.__tipo_sangre
    if (matches(fieldName, 'alergi')) return fillMap.__alergias
    if (matches(fieldName, 'tabaquis', 'fuma', 'tabaco', 'cigarro')) return fillMap.__tabaquismo
    if (matches(fieldName, 'alcohol', 'bebidas')) return fillMap.__alcohol
    if (matches(fieldName, 'droga', 'estupefaciente')) return fillMap.__drogas
    if (matches(fieldName, 'gesta', 'embarazo')) return fillMap.__gestas
    if (matches(fieldName, 'parto')) return fillMap.__partos
    if (matches(fieldName, 'aborto')) return fillMap.__abortos
    if (matches(fieldName, 'cesarea', 'cesárea')) return fillMap.__cesareas
    if (matches(fieldName, 'ultima menstruacion', 'fecha menstruacion', 'fur', 'fum')) return fillMap.__ultima_menstruacion
    if (matches(fieldName, 'diabetes')) return fillMap.__diabetes
    if (matches(fieldName, 'hipertension', 'hipertensión')) return fillMap.__hipertension
    if (matches(fieldName, 'medicamento', 'medicacion', 'medication')) return fillMap.__medicamentos
    if (matches(fieldName, 'cirugia', 'cirugía', 'surgery', 'intervencion')) return fillMap.__cirugias
    if (matches(fieldName, 'fecha del informe', 'fecha informe', 'fecha elaboracion', 'fecha reporte')) return fillMap.__fecha_informe
    return null
}

// ── PDF loading & filling ─────────────────────────────────────────────────────

async function loadAndFillPdf(
    fileName: string,
    fillMap: Record<string, string>,
): Promise<{ blobUrl: string; pdfBytes: Uint8Array; fieldsFound: string[]; fieldsFilled: string[] }> {
    const arrayBuffer = await fetchTemplatePdf(fileName)

    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    const fieldsFound: string[] = []
    const fieldsFilled: string[] = []

    for (const field of fields) {
        const name = field.getName()
        fieldsFound.push(name)

        const value = resolveFieldValue(name, fillMap)
        if (value) {
            try {
                const fieldType = field.constructor.name
                if (fieldType === 'PDFTextField') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (field as any).setText(value)
                    fieldsFilled.push(name)
                }
                // PDFCheckBox, PDFRadioGroup: skip auto-fill for now
            } catch {
                // ignore individual field errors
            }
        }
    }

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blob)

    return { blobUrl, pdfBytes, fieldsFound, fieldsFilled }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    patientId: string
    doctorId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patient: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    medProfile: any
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MedicalReportTab({ patientId, doctorId, patient, medProfile }: Props) {
    const [reports, setReports] = useState<MedicalReport[]>([])
    const [loading, setLoading] = useState(true)
    const [clinicalHistory, setClinicalHistory] = useState<unknown>(null)

    // Active viewer state
    const [activeAseguradora, setActiveAseguradora] = useState<typeof ASEGURADORAS[0] | null>(null)
    const [activeReport, setActiveReport] = useState<MedicalReport | null>(null)
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [fieldsSummary, setFieldsSummary] = useState<{ found: number; filled: number } | null>(null)

    const iframeRef = useRef<HTMLIFrameElement>(null)
    const prevBlobUrl = useRef<string | null>(null)

    // Load reports + clinical history
    useEffect(() => {
        setLoading(true)
        Promise.all([
            getMedicalReports(patientId, doctorId),
            getClinicalHistory(patientId),
        ]).then(([reps, hist]) => {
            setReports(reps)
            setClinicalHistory(hist)
        }).catch(e => logger.error('MedicalReportTab.load', e))
          .finally(() => setLoading(false))
    }, [patientId, doctorId])

    // Cleanup previous blob URL
    useEffect(() => {
        return () => {
            if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
        }
    }, [])

    const openPdf = useCallback(async (aseguradora: typeof ASEGURADORAS[0], existingReport?: MedicalReport) => {
        setPdfLoading(true)
        setActiveAseguradora(aseguradora)
        setActiveReport(existingReport ?? null)
        setPdfBlobUrl(null)
        setFieldsSummary(null)

        try {
            // If existing report has a saved PDF in Storage, load that instead of re-generating
            if (existingReport?.pdf_storage_path) {
                try {
                    const signedUrl = await getReportPdfSignedUrl(existingReport.pdf_storage_path)
                    if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
                    // Use signed URL directly in iframe (no blob needed)
                    prevBlobUrl.current = null
                    setPdfBlobUrl(signedUrl)
                    setFieldsSummary(null)
                    return
                } catch {
                    // fall through to re-generate if signed URL fails
                }
            }

            const fillMap = buildFillMap(patient, medProfile, clinicalHistory)
            const { blobUrl, pdfBytes, fieldsFound, fieldsFilled } = await loadAndFillPdf(aseguradora.file, fillMap)

            if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
            prevBlobUrl.current = blobUrl
            setPdfBlobUrl(blobUrl)
            setFieldsSummary({ found: fieldsFound.length, filled: fieldsFilled.length })

            // Create/update DB record and upload PDF to Storage
            try {
                const reportPayload: MedicalReport = existingReport ?? {
                    patient_id: patientId,
                    doctor_id: doctorId,
                    aseguradora: aseguradora.id,
                    form_data: fillMap,
                    status: 'draft',
                }
                reportPayload.form_data = fillMap // always refresh snapshot

                const saved = await upsertMedicalReport(reportPayload)

                // Upload generated PDF bytes to Storage
                const storagePath = await uploadReportPdf(doctorId, patientId, saved.id!, pdfBytes)

                // Persist storage path
                const withPath = await upsertMedicalReport({ ...saved, pdf_storage_path: storagePath })
                setActiveReport(withPath)
                setReports(prev => [withPath, ...prev.filter(r => r.id !== withPath.id)])

                // Switch from blob URL to signed HTTPS URL so iOS Safari can render the PDF
                try {
                    const signedUrl = await getReportPdfSignedUrl(storagePath)
                    if (prevBlobUrl.current) {
                        URL.revokeObjectURL(prevBlobUrl.current)
                        prevBlobUrl.current = null
                    }
                    setPdfBlobUrl(signedUrl)
                } catch {
                    // keep blob URL as fallback on non-iOS browsers
                }
            } catch (e) {
                logger.error('MedicalReportTab.saveDraft', e)
                // Non-fatal: PDF still shows, just not persisted to Storage
            }
        } catch (e) {
            logger.error('MedicalReportTab.openPdf', e)
            showToast('No se pudo cargar el PDF', 'error')
            setActiveAseguradora(null)
        } finally {
            setPdfLoading(false)
        }
    }, [patient, medProfile, clinicalHistory, patientId, doctorId])

    const markCompleted = async () => {
        if (!activeReport?.id) return
        try {
            await upsertMedicalReport({ ...activeReport, status: 'completed' })
            setActiveReport(r => r ? { ...r, status: 'completed' } : r)
            setReports(prev => prev.map(r => r.id === activeReport.id ? { ...r, status: 'completed' } : r))
            showToast('Marcado como completado', 'success')
        } catch (e) {
            logger.error('MedicalReportTab.complete', e)
            showToast('Error al guardar', 'error')
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteMedicalReport(id)
            setReports(r => r.filter(x => x.id !== id))
            if (activeReport?.id === id) {
                setActiveAseguradora(null)
                setActiveReport(null)
                setPdfBlobUrl(null)
            }
            showToast('Informe eliminado', 'success')
        } catch (e) {
            logger.error('MedicalReportTab.delete', e)
            showToast('Error al eliminar', 'error')
        }
    }

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.print()
    }

    const handleDownload = () => {
        if (!pdfBlobUrl || !activeAseguradora) return
        const a = document.createElement('a')
        a.href = pdfBlobUrl
        a.download = `Informe ${activeAseguradora.label} — ${patient?.full_name ?? 'paciente'}.pdf`
        a.click()
    }

    // ── VIEWER ────────────────────────────────────────────────────────────────
    if (activeAseguradora) {
        return (
            <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 220px)' }}>
                {/* Toolbar */}
                <div className="flex items-center gap-3 px-1 pb-3 flex-shrink-0 flex-wrap">
                    <button
                        onClick={() => { setActiveAseguradora(null); setActiveReport(null); setPdfBlobUrl(null) }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <ChevronLeft size={17} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informe médico</p>
                        <h2 className="text-sm font-black text-gray-900 break-words">{activeAseguradora.label}</h2>
                    </div>

                    {fieldsSummary && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {fieldsSummary.filled}/{fieldsSummary.found} campos pre-llenados
                        </span>
                    )}

                    {activeReport?.status === 'completed' ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl">
                            <CheckCircle size={13} /> Completado
                        </span>
                    ) : (
                        <button
                            onClick={markCompleted}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[#33C7BE] text-white rounded-xl hover:bg-teal-600 transition-all"
                        >
                            <CheckCircle size={13} />
                            Marcar completado
                        </button>
                    )}

                    <button
                        onClick={handleDownload}
                        disabled={!pdfBlobUrl}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-40 transition-all"
                    >
                        <Download size={13} />
                        Descargar
                    </button>

                    <button
                        onClick={handlePrint}
                        disabled={!pdfBlobUrl}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-40 transition-all"
                    >
                        <Printer size={13} />
                        Imprimir
                    </button>
                </div>

                {/* PDF iframe */}
                <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50 relative" style={{ minHeight: 600 }}>
                    {pdfLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-2xl">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-[#33C7BE] animate-spin" />
                                <p className="text-sm text-gray-500">Cargando PDF y pre-llenando datos…</p>
                            </div>
                        </div>
                    )}
                    {pdfBlobUrl && (
                        <iframe
                            ref={iframeRef}
                            src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                            className="w-full h-full rounded-2xl"
                            style={{ minHeight: 600 }}
                            title={`Informe ${activeAseguradora.label}`}
                        />
                    )}
                </div>

                <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Los campos pre-llenados vienen del perfil del paciente · Completa los restantes directamente en el documento · Descarga o imprime al terminar
                </p>
            </div>
        )
    }

    // ── LIST ──────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#33C7BE]" />
                <h2 className="text-base font-black text-gray-900">Informes Médicos</h2>
            </div>

            {/* Aseguradora selector */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Nuevo informe</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ASEGURADORAS.map(a => (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => openPdf(a)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-[#33C7BE] hover:bg-[#33C7BE]/5 text-left transition-all group"
                        >
                            <div className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-[#33C7BE]/10 flex items-center justify-center flex-shrink-0">
                                <FileText size={12} className="text-gray-400 group-hover:text-[#33C7BE]" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 truncate">{a.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Saved reports */}
            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-[#33C7BE] animate-spin" />
                </div>
            ) : reports.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Informes guardados</p>
                    {reports.map(r => {
                        const ase = ASEGURADORAS.find(a => a.id === r.aseguradora)
                        return (
                            <div key={r.id} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#33C7BE]/30 transition-all">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${r.status === 'completed' ? 'bg-green-50' : 'bg-amber-50'}`}>
                                    {r.status === 'completed'
                                        ? <CheckCircle size={16} className="text-green-500" />
                                        : <Clock size={16} className="text-amber-500" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900">{ase?.label ?? r.aseguradora}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {r.status === 'completed' ? 'Completado' : 'Borrador'} · {r.updated_at
                                            ? new Date(r.updated_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : ''}
                                    </p>
                                </div>
                                {ase && (
                                    <button
                                        onClick={() => openPdf(ase, r)}
                                        className="px-3 py-1.5 text-xs font-semibold text-[#33C7BE] border border-[#33C7BE]/30 rounded-lg hover:bg-[#33C7BE]/5 transition-all"
                                    >
                                        Abrir
                                    </button>
                                )}
                                <button
                                    onClick={() => r.id && handleDelete(r.id)}
                                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}
