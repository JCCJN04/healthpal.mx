import { supabase } from '@/shared/lib/supabase'

export interface MedicalReport {
    id?: string
    patient_id: string
    doctor_id: string
    aseguradora: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form_data: any
    status: 'draft' | 'completed'
    pdf_storage_path?: string | null
    created_at?: string
    updated_at?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getMedicalReports(patientId: string, doctorId: string): Promise<MedicalReport[]> {
    const { data, error } = await db
        .from('medical_reports')
        .select('*')
        .eq('patient_id', patientId)
        .eq('doctor_id', doctorId)
        .order('updated_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as MedicalReport[]
}

export async function upsertMedicalReport(report: MedicalReport): Promise<MedicalReport> {
    const { id, updated_at: _ts, created_at: _ca, ...payload } = report

    if (id) {
        const { data, error } = await db
            .from('medical_reports')
            .update(payload)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data as MedicalReport
    }

    const { data, error } = await db
        .from('medical_reports')
        .insert(payload)
        .select()
        .single()
    if (error) throw error
    return data as MedicalReport
}

export async function deleteMedicalReport(id: string): Promise<void> {
    // Fetch storage path before deleting so we can clean up the file too
    const { data } = await db
        .from('medical_reports')
        .select('pdf_storage_path')
        .eq('id', id)
        .single()

    const { error } = await db.from('medical_reports').delete().eq('id', id)
    if (error) throw error

    if (data?.pdf_storage_path) {
        await supabase.storage.from('medical-reports').remove([data.pdf_storage_path])
    }
}

// ── Storage ───────────────────────────────────────────────────────────────────

const TEMPLATES_BUCKET = 'report-templates'
const REPORTS_BUCKET   = 'medical-reports'

/**
 * Returns the public URL for a PDF template stored in Supabase Storage.
 * Falls back to the local public/ path if the bucket URL fails (dev mode).
 */
export function getTemplateUrl(fileName: string): string {
    const { data } = supabase.storage
        .from(TEMPLATES_BUCKET)
        .getPublicUrl(fileName)
    return data.publicUrl
}

/**
 * Uploads the generated PDF bytes for a report to Storage.
 * Path: medical-reports/{doctorId}/{patientId}/{reportId}.pdf
 * Returns the storage path.
 */
export async function uploadReportPdf(
    doctorId: string,
    patientId: string,
    reportId: string,
    pdfBytes: Uint8Array,
): Promise<string> {
    const storagePath = `${doctorId}/${patientId}/${reportId}.pdf`
    const { error } = await supabase.storage
        .from(REPORTS_BUCKET)
        .upload(storagePath, pdfBytes.buffer as ArrayBuffer, {
            contentType: 'application/pdf',
            upsert: true,
        })
    if (error) throw error
    return storagePath
}

/**
 * Creates a signed URL (60 min) to download a saved report PDF.
 */
export async function getReportPdfSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from(REPORTS_BUCKET)
        .createSignedUrl(storagePath, 60 * 60)
    if (error) throw error
    return data.signedUrl
}

/**
 * Fetches a template PDF as ArrayBuffer — uses Supabase Storage public URL.
 */
export async function fetchTemplatePdf(fileName: string): Promise<ArrayBuffer> {
    const url = getTemplateUrl(fileName)
    const res = await fetch(url)
    if (!res.ok) {
        // fallback: try local public folder (useful before templates are uploaded)
        const fallback = await fetch(`/informes medicos aseguradoras/${fileName}`)
        if (!fallback.ok) throw new Error(`No se pudo cargar plantilla: ${fileName}`)
        return fallback.arrayBuffer()
    }
    return res.arrayBuffer()
}
