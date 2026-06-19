/* eslint-disable react-refresh/only-export-components */
// Shared prescription preview — used by Recetas.tsx (editor + list print)
// and PatientDetail.tsx (list print from patient tab).
import type { PrescriptionMedication } from '@/shared/lib/queries/prescriptions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DoctorConfig {
  full_name: string
  specialty: string
  professional_license: string
  institution: string
  address: string
  phone: string
  email: string
  subspecialty: string
  certifying_board: string
  cert_number: string
  cert_validity: string
  signature_name: string
  logo_data_url: string
}

export interface DesignConfig {
  style: string
  header_align: 'left' | 'center' | 'right'
  paper_size: 'carta' | 'media_carta' | 'a4'
  accent_color: string
  font: string
  options: {
    show_watermark: boolean
    show_cofepris: boolean
    show_folio: boolean
    show_dividers: boolean
  }
}

export interface Vitals {
  bp_systolic: string
  bp_diastolic: string
  glucose: string
  glucose_fasting: boolean
  temperature: string
  temp_unit: 'C' | 'F'
  heart_rate: string
  o2_sat: string
}

export interface DraftState {
  patient_id: string | null
  patient_name: string
  patient_age: string
  patient_sex: string
  patient_weight: string
  issued_at: string
  folio: string
  diagnosis: string
  allergies: string[]
  medications: PrescriptionMedication[]
  vitals: Vitals
  indications: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const FONTS = [
  { label: 'Crimson Text — clásica médica',     value: '"Crimson Text", Georgia, serif',          googleFamily: 'Crimson+Text:ital,wght@0,400;0,600;0,700;1,400' },
  { label: 'EB Garamond — académica',           value: '"EB Garamond", Georgia, serif',            googleFamily: 'EB+Garamond:ital,wght@0,400;0,600;1,400' },
  { label: 'Cormorant Garamond — refinada',     value: '"Cormorant Garamond", Georgia, serif',     googleFamily: 'Cormorant+Garamond:ital,wght@0,400;0,600;1,400' },
  { label: 'Libre Baskerville — formal',        value: '"Libre Baskerville", Georgia, serif',      googleFamily: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
  { label: 'Merriweather — legible',            value: '"Merriweather", Georgia, serif',           googleFamily: 'Merriweather:ital,wght@0,300;0,400;0,700;1,300' },
  { label: 'Source Serif 4 — moderna serif',    value: '"Source Serif 4", Georgia, serif',         googleFamily: 'Source+Serif+4:ital,wght@0,400;0,600;1,400' },
  { label: 'Playfair Display — elegante',       value: '"Playfair Display", Georgia, serif',       googleFamily: 'Playfair+Display:ital,wght@0,400;0,600;1,400' },
  { label: 'Lato — sans-serif profesional',     value: '"Lato", Arial, sans-serif',                googleFamily: 'Lato:ital,wght@0,300;0,400;0,700;1,400' },
  { label: 'Inter — sans-serif moderna',        value: '"Inter", Arial, sans-serif',               googleFamily: 'Inter:wght@300;400;500;600' },
  { label: 'Georgia — tradicional',             value: 'Georgia, serif',                           googleFamily: null },
  { label: 'Arial — moderno',                   value: 'Arial, sans-serif',                        googleFamily: null },
  { label: 'Times New Roman',                   value: '"Times New Roman", serif',                 googleFamily: null },
]

const NUM_WORDS: Record<number, string> = {
  1:'Un',2:'Dos',3:'Tres',4:'Cuatro',5:'Cinco',6:'Seis',7:'Siete',8:'Ocho',9:'Nueve',10:'Diez',
  11:'Once',12:'Doce',13:'Trece',14:'Catorce',15:'Quince',16:'Dieciséis',17:'Diecisiete',
  18:'Dieciocho',19:'Diecinueve',20:'Veinte',21:'Veintiún',22:'Veintidós',23:'Veintitrés',
  24:'Veinticuatro',25:'Veinticinco',26:'Veintiséis',27:'Veintisiete',28:'Veintiocho',29:'Veintinueve',
  30:'Treinta',40:'Cuarenta',50:'Cincuenta',60:'Sesenta',70:'Setenta',80:'Ochenta',90:'Noventa',100:'Cien',
}
export function numToWords(n: number): string {
  if (NUM_WORDS[n]) return NUM_WORDS[n]
  if (n > 30 && n < 100) {
    const dec = Math.floor(n / 10) * 10
    const unit = n % 10
    return `${NUM_WORDS[dec]} y ${NUM_WORDS[unit]?.toLowerCase() ?? unit}`
  }
  return String(n)
}

export function todayIso() { return new Date().toISOString().split('T')[0] }
export function genFolio()  { return `RX-${Date.now().toString(36).toUpperCase().slice(-6)}` }

export function formatMexPhone(raw: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('52') && digits.length === 12)
    return `+52 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`
  if (digits.length === 10)
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`
  return raw
}

export function formatIssuedAt(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function emptyDraft(): DraftState {
  return {
    patient_id: null,
    patient_name: '', patient_age: '', patient_sex: '', patient_weight: '',
    issued_at: todayIso(), folio: genFolio(), diagnosis: '',
    allergies: [],
    medications: [],
    vitals: { bp_systolic:'', bp_diastolic:'', glucose:'', glucose_fasting:false, temperature:'', temp_unit:'C', heart_rate:'', o2_sat:'' },
    indications: '',
  }
}

export function defaultDoctor(): DoctorConfig {
  return { full_name:'', specialty:'', professional_license:'', institution:'', address:'', phone:'', email:'', subspecialty:'', certifying_board:'', cert_number:'', cert_validity:'', signature_name:'', logo_data_url:'' }
}

export function defaultDesign(): DesignConfig {
  return {
    style: 'clasico', header_align: 'left', paper_size: 'media_carta',
    accent_color: '#33C7BE', font: 'Arial, sans-serif',
    options: { show_watermark: false, show_cofepris: false, show_folio: true, show_dividers: false },
  }
}

export function injectFont(fonts: typeof FONTS) {
  if (document.getElementById('rx-google-fonts')) return
  const families = fonts.filter(f => f.googleFamily).map(f => `family=${f.googleFamily}`).join('&')
  const link = document.createElement('link')
  link.id = 'rx-google-fonts'
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`
  document.head.appendChild(link)
}

// ─── Print helper ─────────────────────────────────────────────────────────────

const PAGE_SIZES: Record<string, string> = {
  media_carta: '135mm 215mm',
  carta:       '215.9mm 279.4mm',
  a4:          '210mm 297mm',
}

export function printRxElement(design: DesignConfig) {
  const el = document.getElementById('rx-print-area')
  if (!el) return
  const pageSize = PAGE_SIZES[design.paper_size] ?? PAGE_SIZES.media_carta
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { window.print(); return }
  win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap">
<style>
@page { size: ${pageSize}; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
img { max-width: 100%; }
</style>
</head><body>${el.outerHTML}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecetaPreview({ draft, doctor, design }: { draft: DraftState; doctor: DoctorConfig; design: DesignConfig }) {
  const ac = design.accent_color
  const font = design.font
  const align = design.header_align
  const textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left'
  const opts = design.options ?? { show_watermark: false, show_cofepris: false, show_folio: true, show_dividers: false }

  const hasVitals = draft.vitals.bp_systolic || draft.vitals.glucose || draft.vitals.temperature || draft.vitals.heart_rate || draft.vitals.o2_sat

  const headerContent = (
    <div style={{ textAlign, fontFamily: font, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      {doctor.logo_data_url && (
        <img src={doctor.logo_data_url} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
      )}
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111' }}>{doctor.full_name || 'Dr. —'}</p>
        {doctor.specialty && <p style={{ fontSize: 13, fontWeight: 600, color: ac, margin: '2px 0 0' }}>{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ''}</p>}
        <div style={{ marginTop: 4, fontSize: 11, color: '#666', lineHeight: 1.6 }}>
          {doctor.professional_license && <span>Cédula Prof.: <strong style={{ color: '#333' }}>{doctor.professional_license}</strong></span>}
          {doctor.cert_number && <span style={{ marginLeft: 12 }}>Cert.: <strong style={{ color: '#333' }}>{doctor.cert_number}</strong></span>}
        </div>
      </div>
    </div>
  )

  const contactContent = (
    <div style={{ textAlign: 'right', fontFamily: font, fontSize: 11, color: '#555', lineHeight: 1.7 }}>
      {doctor.institution && <p style={{ margin: 0, fontWeight: 600, color: '#333' }}>{doctor.institution}</p>}
      {doctor.address && <p style={{ margin: 0 }}>{doctor.address}</p>}
      {doctor.phone && <p style={{ margin: 0 }}>{formatMexPhone(doctor.phone)}</p>}
      {doctor.email && <p style={{ margin: 0 }}>{doctor.email}</p>}
    </div>
  )

  const patientSection = (
    <div style={{ fontFamily: font, padding: '10px 0', borderBottom: `1px solid #eee` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
        {[
          { label: 'Paciente', value: draft.patient_name || '—' },
          { label: 'Edad', value: draft.patient_age || '—' },
          { label: 'Sexo', value: draft.patient_sex || '—' },
          { label: 'Peso', value: draft.patient_weight || '—' },
          { label: 'Fecha', value: draft.issued_at ? formatIssuedAt(draft.issued_at) : '—' },
        ].map(f => (
          <div key={f.label}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</p>
            <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#111' }}>{f.value}</p>
          </div>
        ))}
      </div>
      {draft.allergies.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11 }}>
          <span style={{ fontWeight: 700, color: '#DC2626', fontSize: 10 }}>⚠ ALERGIAS: </span>
          <span style={{ color: '#DC2626' }}>{draft.allergies.join(', ')}</span>
        </div>
      )}
    </div>
  )

  const vitalsSection = hasVitals ? (
    <div style={{ fontFamily: font, padding: '8px 0', borderBottom: `1px solid #eee`, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
      {draft.vitals.bp_systolic && draft.vitals.bp_diastolic && <span>TA: <strong>{draft.vitals.bp_systolic}/{draft.vitals.bp_diastolic} mmHg</strong></span>}
      {draft.vitals.glucose && <span>Glucosa: <strong>{draft.vitals.glucose} mg/dL{draft.vitals.glucose_fasting ? ' (ayunas)' : ''}</strong></span>}
      {draft.vitals.temperature && <span>Temp: <strong>{draft.vitals.temperature}°{draft.vitals.temp_unit}</strong></span>}
      {draft.vitals.heart_rate && <span>FC: <strong>{draft.vitals.heart_rate} lpm</strong></span>}
      {draft.vitals.o2_sat && <span>SpO₂: <strong>{draft.vitals.o2_sat}%</strong></span>}
    </div>
  ) : null

  const rxBody = (
    <div style={{ fontFamily: font, paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#ddd' }} />
      </div>
      {draft.medications.length === 0 ? (
        <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: 12 }}>Sin medicamentos</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: opts.show_dividers ? 0 : 12 }}>
          {draft.medications.map((med, i) => (
            <div key={med.id} style={opts.show_dividers && i > 0 ? { borderTop: '1px solid #eee', paddingTop: 10, marginTop: 2 } : {}}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                {i + 1}. {med.name || '—'}
                {med.brand && <span style={{ fontWeight: 400, color: '#666', marginLeft: 6 }}>({med.brand})</span>}
              </p>
              <p style={{ margin: '2px 0 0 16px', color: '#444', fontSize: 12 }}>
                {[med.form, med.concentration].filter(Boolean).join(' ')}
                {med.quantity && <> — Cantidad: <strong>{med.quantity}</strong>{med.quantity_text ? ` (${med.quantity_text})` : ''}</>}
              </p>
              {med.instructions && <p style={{ margin: '2px 0 0 16px', fontSize: 12, fontStyle: 'italic', color: '#333' }}>{med.instructions}</p>}
            </div>
          ))}
        </div>
      )}
      {draft.indications && (
        <div style={{ marginTop: 14, padding: '10px 12px', background: '#f0fffe', border: `1px solid ${ac}30`, borderRadius: 6 }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>Indicaciones generales</p>
          <p style={{ margin: 0, fontSize: 12, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{draft.indications}</p>
        </div>
      )}
      <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px dashed #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ textAlign: 'center' }}>
          {doctor.signature_name && (
            <p style={{ margin: '0 0 2px', fontSize: 13, fontStyle: 'italic', color: '#333', fontFamily: 'Georgia, serif' }}>{doctor.signature_name}</p>
          )}
          <div style={{ width: 140, borderTop: '1px solid #999', paddingTop: 4, marginTop: doctor.signature_name ? 4 : 32 }}>
            <p style={{ margin: 0, fontSize: 10, color: '#888' }}>Firma del médico</p>
          </div>
        </div>
        <div />
        <div style={{ textAlign: 'right', fontSize: 10, color: '#aaa' }}>
          {opts.show_folio && draft.folio && <p style={{ margin: 0 }}>Folio: <strong>{draft.folio}</strong></p>}
          <p style={{ margin: '2px 0 0' }}>Documento confidencial</p>
        </div>
      </div>
      {opts.show_cofepris && (
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #eee', fontSize: 9, color: '#aaa', textAlign: 'center', lineHeight: 1.6 }}>
          Receta expedida conforme a la NOM-072-SSA1-2012 y demás disposiciones sanitarias aplicables. COFEPRIS — Comisión Federal para la Protección contra Riesgos Sanitarios.
        </div>
      )}
    </div>
  )

  const watermarkOverlay = opts.show_watermark ? (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      <p style={{ fontSize: 52, fontWeight: 900, color: `${ac}18`, transform: 'rotate(-35deg)', whiteSpace: 'nowrap', margin: 0, userSelect: 'none', letterSpacing: 4 }}>RECETA MÉDICA</p>
    </div>
  ) : null

  if (design.style === 'clasico' || design.style === 'lineado') {
    return (
      <div id="rx-print-area" style={{ position: 'relative', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        {watermarkOverlay}
        <div style={{ padding: '20px 28px 14px', borderBottom: `4px solid ${ac}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            {headerContent}
            {contactContent}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, padding: '0 28px 24px' }}>
          {patientSection}
          {vitalsSection}
          {rxBody}
        </div>
      </div>
    )
  }

  if (design.style === 'elegante') {
    return (
      <div id="rx-print-area" style={{ position: 'relative', background: 'white', borderRadius: 12, border: `1px solid ${ac}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        {watermarkOverlay}
        <div style={{ padding: '20px 28px 14px', borderBottom: `1px solid ${ac}40`, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: ac, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8, fontFamily: font }}>✦ Receta Médica ✦</div>
          {doctor.logo_data_url && <img src={doctor.logo_data_url} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />}
          <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#111', fontFamily: font }}>{doctor.full_name || 'Dr. —'}</p>
          {doctor.specialty && <p style={{ fontSize: 13, fontWeight: 600, color: ac, margin: '3px 0 0', fontFamily: font }}>{doctor.specialty}</p>}
          <div style={{ fontSize: 11, color: '#777', marginTop: 6, fontFamily: font, lineHeight: 1.7 }}>
            {doctor.professional_license && <span>Cédula: {doctor.professional_license}</span>}
            {doctor.address && <span style={{ marginLeft: 12 }}>{doctor.address}</span>}
            {doctor.phone && <span style={{ marginLeft: 12 }}>{formatMexPhone(doctor.phone)}</span>}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: ac, letterSpacing: 4 }}>✦ ✦ ✦</div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, padding: '0 28px 24px' }}>{patientSection}{vitalsSection}{rxBody}</div>
      </div>
    )
  }

  if (design.style === 'moderno' || design.style === 'banda') {
    return (
      <div id="rx-print-area" style={{ position: 'relative', background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        {watermarkOverlay}
        <div style={{ background: ac, padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {doctor.logo_data_url && <img src={doctor.logo_data_url} alt="Logo" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />}
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'white', fontFamily: font }}>{doctor.full_name || 'Dr. —'}</p>
              {doctor.specialty && <p style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', margin: '3px 0 0', fontFamily: font }}>{doctor.specialty}</p>}
              {doctor.professional_license && <p style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', margin: '2px 0 0', fontFamily: font }}>Cédula: {doctor.professional_license}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,.8)', fontFamily: font, lineHeight: 1.7 }}>
            {doctor.institution && <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>{doctor.institution}</p>}
            {doctor.address && <p style={{ margin: 0 }}>{doctor.address}</p>}
            {doctor.phone && <p style={{ margin: 0 }}>{formatMexPhone(doctor.phone)}</p>}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, padding: '0 28px 24px' }}>{patientSection}{vitalsSection}{rxBody}</div>
      </div>
    )
  }

  if (design.style === 'minimalista') {
    return (
      <div id="rx-print-area" style={{ position: 'relative', background: 'white', borderRadius: 12, border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
        {watermarkOverlay}
        <div style={{ padding: '20px 28px 14px', borderBottom: `1px solid #f3f4f6` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {doctor.logo_data_url && <img src={doctor.logo_data_url} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} />}
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#111', fontFamily: font }}>{doctor.full_name || 'Dr. —'}</p>
              <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0', fontFamily: font }}>
                {[doctor.specialty, doctor.professional_license ? `Cédula ${doctor.professional_license}` : null, doctor.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, padding: '0 28px 24px' }}>{patientSection}{vitalsSection}{rxBody}</div>
      </div>
    )
  }

  if (design.style === 'lateral') {
    return (
      <div id="rx-print-area" style={{ position: 'relative', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        {watermarkOverlay}
        <div style={{ width: 140, background: ac, padding: '20px 14px', flexShrink: 0 }}>
          {doctor.logo_data_url && <img src={doctor.logo_data_url} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, marginBottom: 8 }} />}
          <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: 'white', fontFamily: font, lineHeight: 1.3 }}>{doctor.full_name || 'Dr. —'}</p>
          {doctor.specialty && <p style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', margin: '6px 0 0', fontFamily: font }}>{doctor.specialty}</p>}
          {doctor.professional_license && <p style={{ fontSize: 9, color: 'rgba(255,255,255,.65)', margin: '4px 0 0', fontFamily: font }}>Cédula:<br/>{doctor.professional_license}</p>}
          {doctor.phone && <p style={{ fontSize: 9, color: 'rgba(255,255,255,.65)', margin: '6px 0 0', fontFamily: font }}>{formatMexPhone(doctor.phone)}</p>}
          {doctor.address && <p style={{ fontSize: 9, color: 'rgba(255,255,255,.55)', margin: '4px 0 0', fontFamily: font }}>{doctor.address}</p>}
        </div>
        <div style={{ position: 'relative', zIndex: 2, flex: 1, padding: '16px 20px 20px', overflow: 'hidden' }}>{patientSection}{vitalsSection}{rxBody}</div>
      </div>
    )
  }

  // tarjeta default
  return (
    <div id="rx-print-area" style={{ position: 'relative', background: '#fafafa', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
      {watermarkOverlay}
      <div style={{ background: 'white', margin: 12, borderRadius: 10, padding: '16px 20px', borderTop: `4px solid ${ac}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>{headerContent}{contactContent}</div>
      </div>
      <div style={{ position: 'relative', zIndex: 2, padding: '0 24px 20px' }}>{patientSection}{vitalsSection}{rxBody}</div>
    </div>
  )
}
