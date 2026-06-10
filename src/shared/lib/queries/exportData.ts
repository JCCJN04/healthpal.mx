/**
 * NOM-024-SSA3-2012 §6.6.6 — Exportación de datos del paciente
 *
 * "Los SIRES deben permitir la exportación de la información del paciente
 *  de acuerdo a lo establecido en las disposiciones jurídicas aplicables
 *  en materia de transparencia y protección de datos personales."
 *
 * Exports a structured JSON with all medical record data for the current patient.
 * Does NOT include raw encrypted file blobs — includes document metadata only.
 * All export events are logged to audit_log via auditLog.exportData().
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { supabase } from '@/shared/lib/supabase'
import { auditLog } from '@/shared/lib/audit'
import { logger } from '@/shared/lib/logger'

export interface PatientExportData {
  meta: {
    exported_at: string          // ISO timestamp
    export_version: string       // '1.0'
    system: string               // 'HealthPal.mx'
    nom_reference: string        // 'NOM-024-SSA3-2012 §6.6.6'
  }
  perfil: {
    id: string
    nombre_completo: string | null
    primer_apellido: string | null
    segundo_apellido: string | null
    curp: string | null
    email: string | null
    telefono: string | null
    sexo: string
    fecha_nacimiento: string | null
    estado_nacimiento: string | null
    nacionalidad: string | null
    creado_en: string
  }
  perfil_paciente: {
    tipo_sangre: string | null
    talla_cm: number | null
    peso_kg: number | null
    aseguradora: string | null
    idioma_preferido: string | null
    alergias: string | null
    condiciones_cronicas: string | null
    medicamentos_actuales: string | null
    notas_para_doctor: string | null
    domicilio: string | null
    contacto_emergencia_nombre: string | null
    contacto_emergencia_telefono: string | null
  } | null
  historial_clinico: {
    alergias: string | null
    motivo_consulta: string | null
    observaciones_paciente: string | null
    historial_familiar: unknown
    historial_patologico: unknown
    historial_no_patologico: unknown
    historial_ginecologico: unknown
    historial_psiquiatrico: unknown
    historial_desarrollo: unknown
    revision_sistemas: string | null
    ultima_edicion: string | null
  } | null
  citas: Array<{
    id: string
    fecha_hora: string | null
    modo: string | null
    estado: string | null
    doctor_id: string
    motivo: string | null
    notas: string | null
    creada_en: string
  }>
  documentos: Array<{
    id: string
    titulo: string
    categoria: string
    tipo_mime: string | null
    tamano_bytes: number | null
    fecha_documento: string | null
    notas: string | null
    subido_por: string | null
    creado_en: string
  }>
  consentimientos: Array<{
    id: string
    doctor_id: string
    estado: string
    permisos: {
      perfil_basico: boolean
      contacto: boolean
      documentos: boolean
      citas: boolean
      notas_medicas: boolean
      seguro: boolean
    }
    solicitado_en: string
    respondido_en: string | null
    vence_en: string | null
  }>
}

export async function exportPatientData(): Promise<PatientExportData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const patientId = user.id

  // Fetch all data in parallel
  const [
    profileResult,
    patientProfileResult,
    clinicalHistoryResult,
    appointmentsResult,
    documentsResult,
    consentResult,
  ] = await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', patientId).single(),
    supabase.from('patient_profiles').select('*').eq('patient_id', patientId).maybeSingle(),
    supabase.from('clinical_histories').select('*').eq('patient_id', patientId).maybeSingle(),
    supabase.from('appointments').select('*').eq('patient_id', patientId).order('scheduled_at', { ascending: false }),
    supabase.from('documents').select('id, title, category, mime_type, file_size, document_date, notes, uploaded_by, created_at')
      .eq('owner_id', patientId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('doctor_patient_consent').select('*').eq('patient_id', patientId).order('requested_at', { ascending: false }),
  ])

  if (profileResult.status === 'rejected') {
    throw new Error('No se pudo obtener el perfil')
  }

  const profile = profileResult.value.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pp = patientProfileResult.status === 'fulfilled' ? (patientProfileResult.value.data as any) : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ch = clinicalHistoryResult.status === 'fulfilled' ? (clinicalHistoryResult.value.data as any) : null
  const appts = appointmentsResult.status === 'fulfilled' ? (appointmentsResult.value.data ?? []) : []
  const docs = documentsResult.status === 'fulfilled' ? (documentsResult.value.data ?? []) : []
  const consents = consentResult.status === 'fulfilled' ? (consentResult.value.data ?? []) : []

  if (!profile) throw new Error('Perfil no encontrado')

  // Log export event to audit_log (NOM-024 §6.6.6)
  auditLog.exportData('profile', patientId).catch(() => {/* non-blocking */})

  logger.info('exportPatientData: export generated', { patientId })

  return {
    meta: {
      exported_at: new Date().toISOString(),
      export_version: '1.0',
      system: 'HealthPal.mx',
      nom_reference: 'NOM-024-SSA3-2012 §6.6.6',
    },
    perfil: {
      id: profile.id,
      nombre_completo: profile.full_name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      primer_apellido: (profile as any).primer_apellido ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      segundo_apellido: (profile as any).segundo_apellido ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      curp: (profile as any).curp ?? null,
      email: profile.email,
      telefono: profile.phone,
      sexo: profile.sex,
      fecha_nacimiento: profile.birthdate,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      estado_nacimiento: (profile as any).estado_nacimiento ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nacionalidad: (profile as any).nacionalidad ?? null,
      creado_en: profile.created_at,
    },
    perfil_paciente: pp ? {
      tipo_sangre: pp.blood_type ?? null,
      talla_cm: pp.height_cm ?? null,
      peso_kg: pp.weight_kg ?? null,
      aseguradora: pp.insurance_provider ?? null,
      idioma_preferido: pp.preferred_language ?? null,
      alergias: pp.allergies ?? null,
      condiciones_cronicas: pp.chronic_conditions ?? null,
      medicamentos_actuales: pp.current_medications ?? null,
      notas_para_doctor: pp.notes_for_doctor ?? null,
      domicilio: pp.address_text ?? null,
      contacto_emergencia_nombre: pp.emergency_contact_name ?? null,
      contacto_emergencia_telefono: pp.emergency_contact_phone ?? null,
    } : null,
    historial_clinico: ch ? {
      alergias: ch.allergies ?? null,
      motivo_consulta: ch.consultation_reason ?? null,
      observaciones_paciente: ch.patient_observations ?? null,
      historial_familiar: ch.family_history ?? null,
      historial_patologico: ch.pathological_history ?? null,
      historial_no_patologico: ch.non_pathological_history ?? null,
      historial_ginecologico: ch.gynecological_history ?? null,
      historial_psiquiatrico: ch.psychiatric_history ?? null,
      historial_desarrollo: ch.developmental_history ?? null,
      revision_sistemas: ch.systems_review ?? null,
      ultima_edicion: ch.updated_at ?? null,
    } : null,
    citas: appts.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      fecha_hora: a.scheduled_at as string | null,
      modo: a.mode as string | null,
      estado: a.status as string | null,
      doctor_id: a.doctor_id as string,
      motivo: a.reason as string | null,
      notas: a.notes as string | null,
      creada_en: a.created_at as string,
    })),
    documentos: docs.map((d: Record<string, unknown>) => ({
      id: d.id as string,
      titulo: d.title as string,
      categoria: d.category as string,
      tipo_mime: d.mime_type as string | null,
      tamano_bytes: d.file_size as number | null,
      fecha_documento: d.document_date as string | null,
      notas: d.notes as string | null,
      subido_por: d.uploaded_by as string | null,
      creado_en: d.created_at as string,
    })),
    consentimientos: consents.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      doctor_id: c.doctor_id as string,
      estado: c.status as string,
      permisos: {
        perfil_basico: c.share_basic_profile as boolean,
        contacto: c.share_contact as boolean,
        documentos: c.share_documents as boolean,
        citas: c.share_appointments as boolean,
        notas_medicas: c.share_medical_notes as boolean,
        seguro: c.share_insurance as boolean,
      },
      solicitado_en: c.requested_at as string,
      respondido_en: c.responded_at as string | null,
      vence_en: c.access_expires_at as string | null,
    })),
  }
}

// ── PDF helpers ───────────────────────────────────────────────────────────────

// pdf-lib StandardFonts use WinAnsiEncoding — strip combining diacritics for safety
function safe(s: string | null | undefined): string {
  if (!s) return ''
  // eslint-disable-next-line no-control-regex
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\xFF]/g, '?')
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Generates a PDF document from the patient export data.
 * Returns Uint8Array (PDF bytes) ready for download.
 */
export async function generateExportPdf(data: PatientExportData): Promise<Uint8Array> {
  const PAGE_W = 612
  const PAGE_H = 792
  const MX = 50          // margin x
  const MT = 70          // margin top (below header bar)
  const MB = 50          // margin bottom
  const CW = PAGE_W - MX * 2  // content width

  const TEAL  = rgb(0.20, 0.78, 0.74)
  const DARK  = rgb(0.10, 0.10, 0.10)
  const GRAY  = rgb(0.45, 0.45, 0.45)
  const LGRAY = rgb(0.93, 0.93, 0.93)
  const WHITE = rgb(1, 1, 1)

  const pdfDoc  = await PDFDocument.create()
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let page = pdfDoc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MT

  // ── Page header bar ──────────────────────────────────────────────────────
  function drawPageHeader() {
    page.drawRectangle({ x: 0, y: PAGE_H - 36, width: PAGE_W, height: 36, color: TEAL })
    page.drawText('HealthPal.mx', { x: MX, y: PAGE_H - 24, size: 12, font: bold, color: WHITE })
    page.drawText('Expediente Medico Electronico — NOM-024-SSA3-2012', {
      x: MX + 100, y: PAGE_H - 24, size: 8, font: regular, color: WHITE,
    })
  }

  // ── Page footer ──────────────────────────────────────────────────────────
  function drawPageFooter(pageNum: number) {
    page.drawLine({ start: { x: MX, y: MB - 10 }, end: { x: PAGE_W - MX, y: MB - 10 }, thickness: 0.3, color: LGRAY })
    page.drawText(`Pagina ${pageNum}  |  ${safe(data.meta.exported_at.slice(0, 10))}  |  Confidencial`, {
      x: MX, y: MB - 22, size: 7, font: regular, color: GRAY,
    })
  }

  let pageNum = 1
  drawPageHeader()
  drawPageFooter(pageNum)

  // ── Ensure space, add page if needed ────────────────────────────────────
  function ensureSpace(needed: number) {
    if (y - needed < MB + 10) {
      drawPageFooter(pageNum)
      page = pdfDoc.addPage([PAGE_W, PAGE_H])
      pageNum++
      y = PAGE_H - MT
      drawPageHeader()
      drawPageFooter(pageNum)
    }
  }

  // ── Section header ───────────────────────────────────────────────────────
  function sectionHeader(title: string) {
    ensureSpace(28)
    page.drawRectangle({ x: MX, y: y - 18, width: CW, height: 20, color: TEAL })
    page.drawText(title.toUpperCase(), { x: MX + 8, y: y - 13, size: 9, font: bold, color: WHITE })
    y -= 26
  }

  // ── Row: label + value ───────────────────────────────────────────────────
  function row(label: string, value: string | null | undefined, shade = false) {
    const v = safe(value) || '—'
    ensureSpace(16)
    if (shade) page.drawRectangle({ x: MX, y: y - 12, width: CW, height: 14, color: LGRAY })
    page.drawText(safe(label) + ':', { x: MX + 6, y: y - 9, size: 8, font: bold, color: DARK })
    // Value — wrap if too long
    const maxChars = 70
    const lines = wrapText(v, maxChars)
    page.drawText(lines[0], { x: MX + 140, y: y - 9, size: 8, font: regular, color: DARK })
    y -= 14
    for (let i = 1; i < lines.length; i++) {
      ensureSpace(14)
      page.drawText(lines[i], { x: MX + 140, y: y - 9, size: 8, font: regular, color: DARK })
      y -= 14
    }
  }

  function wrapText(text: string, maxChars: number): string[] {
    if (text.length <= maxChars) return [text]
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      if ((line + ' ' + word).trim().length > maxChars) {
        if (line) lines.push(line)
        line = word
      } else {
        line = (line + ' ' + word).trim()
      }
    }
    if (line) lines.push(line)
    return lines.length ? lines : [text.slice(0, maxChars)]
  }

  function spacer(h = 8) { y -= h }

  // ── COVER ────────────────────────────────────────────────────────────────
  y -= 10
  page.drawText('EXPEDIENTE MEDICO', { x: MX, y, size: 22, font: bold, color: TEAL })
  y -= 28

  const patientName = safe(data.perfil.nombre_completo) ||
    [safe(data.perfil.primer_apellido), safe(data.perfil.segundo_apellido)].filter(Boolean).join(' ')
  page.drawText(patientName || 'Sin nombre', { x: MX, y, size: 15, font: bold, color: DARK })
  y -= 18

  if (data.perfil.curp) {
    page.drawText(`CURP: ${safe(data.perfil.curp)}`, { x: MX, y, size: 10, font: regular, color: DARK })
    y -= 14
  }

  page.drawText(`Exportado: ${fmtDate(data.meta.exported_at)}`, { x: MX, y, size: 9, font: regular, color: GRAY })
  y -= 12
  page.drawText(data.meta.nom_reference, { x: MX, y, size: 8, font: regular, color: GRAY })
  y -= 16
  page.drawLine({ start: { x: MX, y }, end: { x: PAGE_W - MX, y }, thickness: 0.8, color: TEAL })
  spacer(16)

  // ── 1. PERFIL ────────────────────────────────────────────────────────────
  sectionHeader('1. Perfil Personal')
  const p = data.perfil
  row('Nombre completo', patientName, false)
  row('Primer apellido', p.primer_apellido, true)
  row('Segundo apellido', p.segundo_apellido, false)
  row('CURP', p.curp, true)
  row('Fecha de nacimiento', fmtDate(p.fecha_nacimiento), false)
  row('Sexo', p.sexo, true)
  row('Estado de nacimiento', p.estado_nacimiento, false)
  row('Nacionalidad', p.nacionalidad, true)
  row('Correo electronico', p.email, false)
  row('Telefono', p.telefono, true)
  spacer(10)

  // ── 2. DATOS MEDICOS ──────────────────────────────────────────────────────
  sectionHeader('2. Datos Medicos')
  const pp = data.perfil_paciente
  if (pp) {
    row('Tipo de sangre', pp.tipo_sangre, false)
    row('Talla (cm)', pp.talla_cm?.toString(), true)
    row('Peso (kg)', pp.peso_kg?.toString(), false)
    row('Alergias', pp.alergias, true)
    row('Condiciones cronicas', pp.condiciones_cronicas, false)
    row('Medicamentos actuales', pp.medicamentos_actuales, true)
    row('Aseguradora', pp.aseguradora, false)
    row('Domicilio', pp.domicilio, true)
    row('Contacto emergencia', pp.contacto_emergencia_nombre
      ? `${safe(pp.contacto_emergencia_nombre)} — ${safe(pp.contacto_emergencia_telefono)}`
      : null, false)
  } else {
    page.drawText('Sin datos medicos registrados.', { x: MX + 6, y, size: 8, font: regular, color: GRAY })
    y -= 14
  }
  spacer(10)

  // ── 3. HISTORIAL CLINICO ──────────────────────────────────────────────────
  sectionHeader('3. Historial Clinico')
  const ch = data.historial_clinico
  if (ch) {
    row('Motivo de consulta', ch.motivo_consulta, false)
    row('Observaciones', ch.observaciones_paciente, true)
    row('Alergias', ch.alergias, false)
    row('Revision de sistemas', ch.revision_sistemas, true)
    row('Ultima edicion', fmtDate(ch.ultima_edicion), false)
  } else {
    page.drawText('Sin historial clinico registrado.', { x: MX + 6, y, size: 8, font: regular, color: GRAY })
    y -= 14
  }
  spacer(10)

  // ── 4. CITAS ──────────────────────────────────────────────────────────────
  sectionHeader(`4. Citas Medicas (${data.citas.length})`)
  if (data.citas.length === 0) {
    page.drawText('Sin citas registradas.', { x: MX + 6, y, size: 8, font: regular, color: GRAY })
    y -= 14
  } else {
    data.citas.forEach((c, i) => {
      ensureSpace(44)
      page.drawRectangle({ x: MX, y: y - 40, width: CW, height: 42, color: i % 2 === 0 ? WHITE : LGRAY })
      page.drawText(`Cita ${i + 1}`, { x: MX + 6, y: y - 10, size: 8, font: bold, color: TEAL })
      row('Fecha', fmtDate(c.fecha_hora))
      row('Modo', c.modo)
      row('Estado', c.estado)
      row('Motivo', c.motivo)
      spacer(4)
    })
  }
  spacer(10)

  // ── 5. DOCUMENTOS ─────────────────────────────────────────────────────────
  sectionHeader(`5. Documentos (${data.documentos.length})`)
  if (data.documentos.length === 0) {
    page.drawText('Sin documentos registrados.', { x: MX + 6, y, size: 8, font: regular, color: GRAY })
    y -= 14
  } else {
    data.documentos.forEach((d, i) => {
      ensureSpace(30)
      if (i % 2 === 0) page.drawRectangle({ x: MX, y: y - 26, width: CW, height: 28, color: LGRAY })
      page.drawText(`${safe(d.titulo)}`, { x: MX + 6, y: y - 10, size: 8, font: bold, color: DARK })
      page.drawText(`${safe(d.categoria)}  |  ${fmtDate(d.fecha_documento)}  |  ${d.tamano_bytes ? Math.round(d.tamano_bytes / 1024) + ' KB' : ''}`, {
        x: MX + 6, y: y - 21, size: 7, font: regular, color: GRAY,
      })
      y -= 28
    })
  }
  spacer(10)

  // ── 6. CONSENTIMIENTOS ────────────────────────────────────────────────────
  sectionHeader(`6. Consentimientos de Acceso (${data.consentimientos.length})`)
  if (data.consentimientos.length === 0) {
    page.drawText('Sin consentimientos registrados.', { x: MX + 6, y, size: 8, font: regular, color: GRAY })
    y -= 14
  } else {
    data.consentimientos.forEach((c, i) => {
      ensureSpace(32)
      row('Estado', c.estado, i % 2 === 0)
      row('Solicitado', fmtDate(c.solicitado_en), i % 2 !== 0)
      row('Vence', fmtDate(c.vence_en), i % 2 === 0)
      spacer(4)
    })
  }

  // Last footer
  drawPageFooter(pageNum)

  return pdfDoc.save()
}

/**
 * Generates PDF from patient export data and triggers browser download.
 * Filename: healthpal_expediente_YYYYMMDD.pdf
 */
export async function downloadPatientExport(data: PatientExportData): Promise<void> {
  const pdfBytes = await generateExportPdf(data)
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `healthpal_expediente_${date}.pdf`

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
