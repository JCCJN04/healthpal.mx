// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import {
  Plus, Printer, Save, Trash2, FileText, Loader2, X,
  ChevronRight, Search, User, Stethoscope,
  Heart, AlertTriangle,
  BookMarked, ClipboardList, Check, ArrowLeft, ArrowRight,
  Upload,
} from 'lucide-react'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { useAuth } from '@/app/providers/AuthContext'
import { getDoctorProfile, getMyProfile } from '@/shared/lib/queries/profile'
import { listDoctorPatients, type PatientProfileLite } from '@/features/doctor/services/patients'
import {
  getPrescriptions, getTemplates, createPrescription, updatePrescription, deletePrescription,
  type Prescription, type PrescriptionMedication,
} from '@/shared/lib/queries/prescriptions'
import { supabase } from '@/shared/lib/supabase'
import { showToast } from '@/shared/components/ui/Toast'
import { formatSpecialty } from '@/shared/lib/specialties'
import { logger } from '@/shared/lib/logger'

// ─── Constants ────────────────────────────────────────────────────────────────

const PHARMA_FORMS = [
  'Tabletas','Cápsulas','Grageas','Comprimidos','Jarabe','Suspensión',
  'Solución','Gotas','Inyectable','Ampolleta','Frasco ámpula',
  'Crema','Ungüento','Gel','Loción','Óvulos','Supositorios',
  'Parche','Inhalador','Spray nasal','Polvo','Sachets','Otro',
]

const ACCENT_COLORS = [
  { label: 'Teal',    value: '#33C7BE' },
  { label: 'Azul',   value: '#2563EB' },
  { label: 'Índigo', value: '#4F46E5' },
  { label: 'Rojo',   value: '#DC2626' },
  { label: 'Verde',  value: '#16A34A' },
  { label: 'Gris',   value: '#374151' },
]

const FONTS = [
  { label: 'Crimson Text — clásica médica',      value: '"Crimson Text", Georgia, serif',           googleFamily: 'Crimson+Text:ital,wght@0,400;0,600;0,700;1,400' },
  { label: 'EB Garamond — académica',            value: '"EB Garamond", Georgia, serif',             googleFamily: 'EB+Garamond:ital,wght@0,400;0,600;1,400' },
  { label: 'Cormorant Garamond — refinada',      value: '"Cormorant Garamond", Georgia, serif',      googleFamily: 'Cormorant+Garamond:ital,wght@0,400;0,600;1,400' },
  { label: 'Libre Baskerville — formal',         value: '"Libre Baskerville", Georgia, serif',       googleFamily: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
  { label: 'Merriweather — legible',             value: '"Merriweather", Georgia, serif',            googleFamily: 'Merriweather:ital,wght@0,300;0,400;0,700;1,300' },
  { label: 'Source Serif 4 — moderna serif',     value: '"Source Serif 4", Georgia, serif',          googleFamily: 'Source+Serif+4:ital,wght@0,400;0,600;1,400' },
  { label: 'Playfair Display — elegante',        value: '"Playfair Display", Georgia, serif',        googleFamily: 'Playfair+Display:ital,wght@0,400;0,600;1,400' },
  { label: 'Lato — sans-serif profesional',      value: '"Lato", Arial, sans-serif',                 googleFamily: 'Lato:ital,wght@0,300;0,400;0,700;1,400' },
  { label: 'Inter — sans-serif moderna',         value: '"Inter", Arial, sans-serif',                googleFamily: 'Inter:wght@300;400;500;600' },
  { label: 'Georgia — tradicional',              value: 'Georgia, serif',                            googleFamily: null },
  { label: 'Arial — moderno',                    value: 'Arial, sans-serif',                         googleFamily: null },
  { label: 'Times New Roman',                    value: '"Times New Roman", serif',                  googleFamily: null },
]

const STYLES = [
  { id: 'clasico',     label: 'Clásico',      icon: '— — —' },
  { id: 'elegante',    label: 'Elegante',     icon: '✦ ✦ ✦' },
  { id: 'moderno',     label: 'Moderno',      icon: '▬▬▬' },
  { id: 'minimalista', label: 'Minimalista',  icon: '———' },
  { id: 'lateral',     label: 'Lateral',      icon: '│ ═══' },
  { id: 'tarjeta',     label: 'Tarjeta',      icon: '░░░░' },
  { id: 'banda',       label: 'Banda',        icon: '▤ ▤ ▤' },
  { id: 'lineado',     label: 'Lineado',      icon: '≡ ≡ ≡' },
]

const NUM_WORDS: Record<number, string> = {
  1:'Un',2:'Dos',3:'Tres',4:'Cuatro',5:'Cinco',6:'Seis',7:'Siete',8:'Ocho',9:'Nueve',10:'Diez',
  11:'Once',12:'Doce',13:'Trece',14:'Catorce',15:'Quince',16:'Dieciséis',17:'Diecisiete',
  18:'Dieciocho',19:'Diecinueve',20:'Veinte',21:'Veintiún',22:'Veintidós',23:'Veintitrés',
  24:'Veinticuatro',25:'Veinticinco',26:'Veintiséis',27:'Veintisiete',28:'Veintiocho',29:'Veintinueve',
  30:'Treinta',40:'Cuarenta',50:'Cincuenta',60:'Sesenta',70:'Setenta',80:'Ochenta',90:'Noventa',100:'Cien',
}
function numToWords(n: number): string {
  if (NUM_WORDS[n]) return NUM_WORDS[n]
  if (n > 30 && n < 100) {
    const dec = Math.floor(n / 10) * 10
    const unit = n % 10
    return `${NUM_WORDS[dec]} y ${NUM_WORDS[unit]?.toLowerCase() ?? unit}`
  }
  return String(n)
}

function todayIso() { return new Date().toISOString().split('T')[0] }
function formatMexPhone(raw: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('52') && digits.length === 12)
    return `+52 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`
  if (digits.length === 10)
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`
  return raw
}
function genFolio()  { return `RX-${Date.now().toString(36).toUpperCase().slice(-6)}` }
function calcAge(birthdate: string): string {
  const age = Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000)
  return `${age} años`
}
function formatIssuedAt(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}
function newMed(): PrescriptionMedication {
  return { id: crypto.randomUUID(), name:'', brand:'', form:'Tabletas', concentration:'', quantity:'', quantity_text:'', instructions:'' }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorConfig {
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

interface DesignConfig {
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

interface Vitals {
  bp_systolic: string
  bp_diastolic: string
  glucose: string
  glucose_fasting: boolean
  temperature: string
  temp_unit: 'C' | 'F'
  heart_rate: string
  o2_sat: string
}

interface DraftState {
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

function emptyDraft(): DraftState {
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

function defaultDoctor(): DoctorConfig {
  return { full_name:'', specialty:'', professional_license:'', institution:'', address:'', phone:'', email:'', subspecialty:'', certifying_board:'', cert_number:'', cert_validity:'', signature_name:'', logo_data_url:'' }
}

function defaultDesign(): DesignConfig {
  return {
    style: 'clasico', header_align: 'left', paper_size: 'media_carta',
    accent_color: '#33C7BE', font: 'Arial, sans-serif',
    options: { show_watermark: false, show_cofepris: false, show_folio: true, show_dividers: false },
  }
}

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #rx-print-area, #rx-print-area * { visibility: visible !important; }
  #rx-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; }
}
`

function injectFont() {
  if (document.getElementById('rx-google-fonts')) return
  const families = FONTS.filter(f => f.googleFamily).map(f => `family=${f.googleFamily}`).join('&')
  const link = document.createElement('link')
  link.id = 'rx-google-fonts'
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`
  document.head.appendChild(link)
}

// ─── Prescription Preview ─────────────────────────────────────────────────────

function RecetaPreview({ draft, doctor, design }: { draft: DraftState; doctor: DoctorConfig; design: DesignConfig }) {
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

  // ── Style layouts ──────────────────────────────────────────────────────────

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

// ─── Medication Row ───────────────────────────────────────────────────────────

function MedRow({ med, onChange, onRemove, index }: { med: PrescriptionMedication; onChange: (m: PrescriptionMedication) => void; onRemove: () => void; index: number }) {
  function set(key: keyof PrescriptionMedication, val: string) {
    const next = { ...med, [key]: val }
    if (key === 'quantity') {
      const n = parseInt(val)
      next.quantity_text = (!isNaN(n) && n > 0 && n <= 100) ? numToWords(n) : ''
    }
    onChange(next)
  }
  const inp = 'w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none bg-white'
  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2.5 border border-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500">Medicamento {index + 1}</span>
        <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Nombre genérico *</label>
          <input className={inp} placeholder="ej. Amoxicilina" value={med.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Nombre comercial</label>
          <input className={inp} placeholder="ej. Amoxil" value={med.brand ?? ''} onChange={e => set('brand', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Forma</label>
          <select className={inp} value={med.form} onChange={e => set('form', e.target.value)}>
            {PHARMA_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Concentración</label>
          <input className={inp} placeholder="500 mg" value={med.concentration} onChange={e => set('concentration', e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Cantidad</label>
          <input className={inp} placeholder="21" value={med.quantity} onChange={e => set('quantity', e.target.value)} />
          {med.quantity_text && <p className="text-[10px] text-gray-400 mt-0.5">{med.quantity_text}</p>}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Indicaciones *</label>
        <input className={inp} placeholder="1 tableta cada 8 h por 7 días con alimentos" value={med.instructions} onChange={e => set('instructions', e.target.value)} />
      </div>
    </div>
  )
}

// ─── Template Modal ───────────────────────────────────────────────────────────

function TemplateModal({ templates, onSelect, onClose }: { templates: Prescription[]; onSelect: (t: Prescription) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const filtered = templates.filter(t => (t.template_name ?? '').toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Plantillas</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none" />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.length === 0
              ? <p className="text-center text-sm text-gray-400 py-6">{templates.length === 0 ? 'Sin plantillas guardadas' : 'Sin resultados'}</p>
              : filtered.map(t => (
                <button key={t.id} onClick={() => onSelect(t)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-teal-50 text-left gap-3 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{t.template_name}</p>
                    <p className="text-xs text-gray-400">{t.medications.length} medicamento{t.medications.length !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Médico ──────────────────────────────────────────────────────────────

function TabMedico({ doctor, onChange, onSaveToProfile, saving }: {
  doctor: DoctorConfig
  onChange: (d: DoctorConfig) => void
  onSaveToProfile: () => void
  saving: boolean
}) {
  function set(key: keyof DoctorConfig, val: string) { onChange({ ...doctor, [key]: val }) }
  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none'
  const label = (text: string) => <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{text}</label>

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { if (ev.target?.result) onChange({ ...doctor, logo_data_url: ev.target.result as string }) }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#33C7BE]/10 to-teal-50 border border-[#33C7BE]/20 rounded-2xl p-4 flex gap-3 items-start">
        <div className="w-9 h-9 rounded-xl bg-[#33C7BE]/15 flex items-center justify-center shrink-0 text-[#33C7BE]">
          <Stethoscope size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 leading-tight">Datos del médico</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Nombre, especialidad, cédula y logo. Aparece en el encabezado de tus recetas.</p>
        </div>
      </div>
      {/* Datos básicos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos del médico</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            {label('Nombre completo *')}
            <input className={inp} placeholder="Dr. Juan Flores Costa" value={doctor.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div>
            {label('Especialidad *')}
            <input className={inp} placeholder="Médico Cirujano" value={doctor.specialty} onChange={e => set('specialty', e.target.value)} />
          </div>
          <div>
            {label('Cédula Profesional *')}
            <input className={inp} placeholder="CED. PROF 1234567" value={doctor.professional_license} onChange={e => set('professional_license', e.target.value)} />
          </div>
          <div>
            {label('Institución / Escuela')}
            <input className={inp} placeholder="UNAM, IPN..." value={doctor.institution} onChange={e => set('institution', e.target.value)} />
          </div>
          <div>
            {label('Teléfono')}
            <input className={inp} placeholder="55 1234 5678" value={doctor.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="col-span-2">
            {label('Domicilio / Consultorio *')}
            <input className={inp} placeholder="Calle, No., Colonia, Ciudad" value={doctor.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="col-span-2">
            {label('Correo electrónico')}
            <input className={inp} type="email" placeholder="dr@ejemplo.com" value={doctor.email} onChange={e => set('email', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Subespecialidad y certificación */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subespecialidad y certificación</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            {label('Subespecialidad(es)')}
            <input className={inp} placeholder="Cardiología, Pediatría..." value={doctor.subspecialty} onChange={e => set('subspecialty', e.target.value)} />
          </div>
          <div>
            {label('Consejo de certificación')}
            <input className={inp} placeholder="Consejo Mexicano de..." value={doctor.certifying_board} onChange={e => set('certifying_board', e.target.value)} />
          </div>
          <div>
            {label('N.º de certificado')}
            <input className={inp} placeholder="CM-2024-001234" value={doctor.cert_number} onChange={e => set('cert_number', e.target.value)} />
          </div>
          <div>
            {label('Vigencia del certificado')}
            <input className={inp} placeholder="2027" value={doctor.cert_validity} onChange={e => set('cert_validity', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Firma y Logo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Firma y Logo</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            {label('Nombre para firma (cursiva en receta)')}
            <input className={inp} placeholder="Dr. Juan Flores Costa" value={doctor.signature_name} onChange={e => set('signature_name', e.target.value)} />
          </div>
          <div className="col-span-2">
            {label('Logo del consultorio (opcional)')}
            <div className="flex items-center gap-3">
              {doctor.logo_data_url ? (
                <div className="relative flex-shrink-0">
                  <img src={doctor.logo_data_url} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200 bg-gray-50" />
                  <button onClick={() => onChange({ ...doctor, logo_data_url: '' })}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0 bg-gray-50">
                  <Upload className="w-5 h-5 text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {doctor.logo_data_url ? 'Cambiar logo' : 'Subir logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG o SVG. Recomendado cuadrado.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={onSaveToProfile} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-colors">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar datos del médico
      </button>
    </div>
  )
}

// ─── Tab: Diseño ──────────────────────────────────────────────────────────────

function TabDiseno({ design, onChange }: { design: DesignConfig; onChange: (d: DesignConfig) => void }) {
  return (
    <div className="space-y-5 max-w-2xl">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-4 flex gap-3 items-start">
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 text-purple-500">
          <FileText size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 leading-tight">Diseño de la receta</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Elige colores, tipografía y estilo. Se aplica a todas tus recetas.</p>
        </div>
      </div>
      {/* Style */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estilo de hoja</p>
        <div className="grid grid-cols-4 gap-2">
          {STYLES.map(s => (
            <button key={s.id} onClick={() => onChange({ ...design, style: s.id })}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                design.style === s.id ? 'border-[#33C7BE] bg-teal-50 text-[#33C7BE]' : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}>
              <span className="text-xs font-mono">{s.icon}</span>
              <span className="text-[11px] font-semibold">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Header alignment */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alineación del encabezado</p>
        <div className="flex gap-2">
          {([['left','Izquierda'],['center','Centro'],['right','Derecha']] as const).map(([val, label]) => (
            <button key={val} onClick={() => onChange({ ...design, header_align: val })}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${
                design.header_align === val ? 'border-[#33C7BE] bg-teal-50 text-[#33C7BE]' : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Paper size */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tamaño de papel</p>
        <div className="flex gap-2">
          {([['media_carta','Media carta\n13.5×21.5 cm'],['carta','Carta\n21.5×28 cm'],['a4','A4\n21×29.7 cm']] as const).map(([val, lbl]) => {
            const [title, sub] = lbl.split('\n')
            return (
              <button key={val} onClick={() => onChange({ ...design, paper_size: val })}
                className={`flex-1 py-2 px-1 text-sm font-semibold rounded-xl border-2 transition-all ${
                  design.paper_size === val ? 'border-[#33C7BE] bg-teal-50 text-[#33C7BE]' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                }`}>
                <span className="block text-xs font-bold">{title}</span>
                <span className="block text-[10px] font-normal opacity-70">{sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Accent color */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Color de acento</p>
        <div className="flex items-center gap-3 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button key={c.value} onClick={() => onChange({ ...design, accent_color: c.value })}
              className={`w-9 h-9 rounded-xl transition-transform hover:scale-110 ${design.accent_color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
              style={{ background: c.value }}
              title={c.label} />
          ))}
          <div className="flex items-center gap-2">
            <input type="color" value={design.accent_color} onChange={e => onChange({ ...design, accent_color: e.target.value })}
              className="w-9 h-9 rounded-xl cursor-pointer border border-gray-200 p-0.5" />
            <span className="text-xs text-gray-400 font-mono">{design.accent_color}</span>
          </div>
        </div>
      </div>

      {/* Font */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipografía</p>
        <div className="space-y-2">
          {FONTS.map(f => (
            <button key={f.value} onClick={() => onChange({ ...design, font: f.value })}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                design.font === f.value ? 'border-[#33C7BE] bg-teal-50' : 'border-gray-100 hover:border-gray-200'
              }`}>
              <span style={{ fontFamily: f.value }} className="text-sm text-gray-800">{f.label}</span>
              {design.font === f.value && <Check className="w-4 h-4 text-[#33C7BE]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Opciones adicionales */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opciones adicionales</p>
        <div className="space-y-2">
          {([
            ['show_watermark', 'Mostrar marca de agua', 'Texto diagonal "RECETA MÉDICA" semitransparente'],
            ['show_cofepris',  'Mostrar leyenda COFEPRIS', 'Texto legal NOM-072-SSA1-2012 al pie'],
            ['show_folio',     'Mostrar folio', 'Número de folio en la esquina inferior derecha'],
            ['show_dividers',  'Líneas divisorias entre medicamentos', 'Separador visual entre cada medicamento'],
          ] as const).map(([key, title, desc]) => {
            const opts = design.options ?? { show_watermark:false, show_cofepris:false, show_folio:true, show_dividers:false }
            return (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input type="checkbox" checked={opts[key]} className="sr-only peer"
                    onChange={e => onChange({ ...design, options: { ...opts, [key]: e.target.checked } })} />
                  <div className="w-9 h-5 bg-gray-200 peer-checked:bg-[#33C7BE] rounded-full transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 leading-none mb-0.5">{title}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Receta ──────────────────────────────────────────────────────────────

function TabReceta({
  draft, onChange, patients, onSelectPatient,
  templates, onApplyTemplate, onSaveAsTemplate,
}: {
  draft: DraftState
  onChange: (d: DraftState) => void
  patients: PatientProfileLite[]
  onSelectPatient: (id: string, name: string) => void
  templates: Prescription[]
  onApplyTemplate: (t: Prescription) => void
  onSaveAsTemplate: () => void
}) {
  const [patientQ, setPatientQ] = useState('')
  const [showDD, setShowDD] = useState(false)
  const [allergyInput, setAllergyInput] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const ddRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ddRef.current && !ddRef.current.contains(e.target as Node)) setShowDD(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredPatients = patients.filter(p => (p.full_name ?? '').toLowerCase().includes(patientQ.toLowerCase())).slice(0, 8)

  function set<K extends keyof DraftState>(key: K, val: DraftState[K]) { onChange({ ...draft, [key]: val }) }
  function setVital(key: keyof Vitals, val: string | boolean) { onChange({ ...draft, vitals: { ...draft.vitals, [key]: val } }) }
  function addAllergy() {
    const a = allergyInput.trim()
    if (!a || draft.allergies.includes(a)) return
    onChange({ ...draft, allergies: [...draft.allergies, a] })
    setAllergyInput('')
  }

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none'
  const smallInp = 'w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none'

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-500">
          <ClipboardList size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 leading-tight">Prescripción médica</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Paciente, medicamentos y dosis. Guarda para registrar, imprime para entregar.</p>
        </div>
      </div>
      {/* Patient */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><User className="w-3 h-3" /> Datos del paciente</p>

        {/* Patient autocomplete */}
        <div className="relative" ref={ddRef}>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Nombre del paciente *</label>
          <input value={draft.patient_name}
            onChange={e => { set('patient_name', e.target.value); setPatientQ(e.target.value); setShowDD(true) }}
            onFocus={() => setShowDD(true)}
            placeholder="Nombre completo"
            className={inp} />
          {showDD && filteredPatients.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {filteredPatients.map(p => (
                <button key={p.id} onMouseDown={() => { onSelectPatient(p.id, p.full_name ?? ''); setShowDD(false); setPatientQ('') }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-teal-50 text-left transition-colors">
                  {p.avatar_url
                    ? <img src={p.avatar_url} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                    : <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {(p.full_name ?? 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                  }
                  <span className="font-medium text-gray-800 text-sm">{p.full_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Edad</label>
              <input className={smallInp} placeholder="35 años" value={draft.patient_age} onChange={e => set('patient_age', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Sexo</label>
              <select className={smallInp} value={draft.patient_sex} onChange={e => set('patient_sex', e.target.value)}>
                <option value="">—</option>
                <option value="Masculino">Masc.</option>
                <option value="Femenino">Fem.</option>
                <option value="Indeterminado">Ind.</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Peso</label>
              <input className={smallInp} placeholder="70 kg" value={draft.patient_weight} onChange={e => set('patient_weight', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Fecha *</label>
              <input type="date" className={`${smallInp} w-full`} value={draft.issued_at} onChange={e => set('issued_at', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Folio</label>
              <input className={smallInp} value={draft.folio} onChange={e => set('folio', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Diagnosis (hidden from print) */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Diagnóstico <span className="normal-case font-normal">(no aparece en receta impresa)</span></label>
          <input className={inp} placeholder="Colon irritable, Hipertensión arterial..." value={draft.diagnosis} onChange={e => set('diagnosis', e.target.value)} />
        </div>

        {/* Allergies */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-400" /> Alergias conocidas
          </label>
          <div className="flex gap-2">
            <input className={inp + ' flex-1'} placeholder="Ej. Penicilina, AINES, Sulfas…"
              value={allergyInput} onChange={e => setAllergyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAllergy()} />
            <button onClick={addAllergy} className="px-3 py-2 bg-orange-50 text-orange-600 font-semibold text-sm rounded-xl hover:bg-orange-100 transition-colors flex-shrink-0">
              Agregar
            </button>
          </div>
          {draft.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {draft.allergies.map(a => (
                <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-lg">
                  {a}
                  <button onClick={() => onChange({ ...draft, allergies: draft.allergies.filter(x => x !== a) })} className="hover:text-red-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Sin alergias registradas</p>
          )}
        </div>
      </div>

      {/* Medications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Medicamentos</p>
          <button onClick={() => setShowTemplates(true)} className="text-xs text-[#33C7BE] font-semibold flex items-center gap-1 hover:underline">
            <ClipboardList className="w-3 h-3" /> Plantilla
          </button>
        </div>
        {draft.medications.length === 0
          ? <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">No hay medicamentos. Haz clic en "Agregar medicamento" para comenzar.</p>
          : <div className="space-y-3">{draft.medications.map((med, i) => (
              <MedRow key={med.id} med={med} index={i}
                onChange={m => onChange({ ...draft, medications: draft.medications.map(x => x.id === m.id ? m : x) })}
                onRemove={() => onChange({ ...draft, medications: draft.medications.filter(x => x.id !== med.id) })} />
            ))}</div>
        }
        <button onClick={() => onChange({ ...draft, medications: [...draft.medications, newMed()] })}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-400 hover:border-[#33C7BE] hover:text-[#33C7BE] transition-colors flex items-center justify-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Agregar medicamento
        </button>
      </div>

      {/* Vitals */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Heart className="w-3 h-3" /> Signos vitales</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* BP */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Presión arterial</label>
            <div className="flex items-center gap-1">
              <input className={smallInp + ' text-center'} placeholder="120" value={draft.vitals.bp_systolic} onChange={e => setVital('bp_systolic', e.target.value)} style={{ width: 56 }} />
              <span className="text-gray-400 text-sm">/</span>
              <input className={smallInp + ' text-center'} placeholder="80" value={draft.vitals.bp_diastolic} onChange={e => setVital('bp_diastolic', e.target.value)} style={{ width: 56 }} />
              <span className="text-xs text-gray-400">mmHg</span>
            </div>
          </div>
          {/* Glucose */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Glucosa</label>
            <div className="flex items-center gap-1.5">
              <input className={smallInp} placeholder="90" value={draft.vitals.glucose} onChange={e => setVital('glucose', e.target.value)} />
              <span className="text-xs text-gray-400 flex-shrink-0">mg/dL</span>
            </div>
            <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
              <input type="checkbox" checked={draft.vitals.glucose_fasting} onChange={e => setVital('glucose_fasting', e.target.checked)} className="rounded text-[#33C7BE]" />
              <span className="text-xs text-gray-500">Ayunas</span>
            </label>
          </div>
          {/* Temp */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Temperatura</label>
            <div className="flex items-center gap-1.5">
              <input className={smallInp} placeholder="36.5" value={draft.vitals.temperature} onChange={e => setVital('temperature', e.target.value)} />
              <div className="flex text-xs rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                {(['C','F'] as const).map(u => (
                  <button key={u} onClick={() => setVital('temp_unit', u)}
                    className={`px-2 py-1 transition-colors ${draft.vitals.temp_unit === u ? 'bg-[#33C7BE] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    °{u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* HR */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Frec. cardíaca</label>
            <div className="flex items-center gap-1.5">
              <input className={smallInp} placeholder="72" value={draft.vitals.heart_rate} onChange={e => setVital('heart_rate', e.target.value)} />
              <span className="text-xs text-gray-400 flex-shrink-0">lpm</span>
            </div>
          </div>
          {/* O2 */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Saturación O₂</label>
            <div className="flex items-center gap-1.5">
              <input className={smallInp} placeholder="98" value={draft.vitals.o2_sat} onChange={e => setVital('o2_sat', e.target.value)} />
              <span className="text-xs text-gray-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Indicaciones generales</p>
        <textarea value={draft.indications} onChange={e => set('indications', e.target.value)}
          placeholder="Dieta baja en residuos. Evitar alimentos irritantes. Regresar en 30 días."
          rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none resize-none" />
      </div>

      {/* Template actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setShowTemplates(true)} className="flex items-center justify-center gap-2 py-2.5 border-2 border-[#33C7BE] rounded-xl text-sm font-semibold text-[#33C7BE] hover:bg-teal-50 transition-colors">
          <ClipboardList className="w-4 h-4" /> Usar plantilla
        </button>
        <button onClick={onSaveAsTemplate} className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-400 hover:border-[#33C7BE] hover:text-[#33C7BE] transition-colors">
          <BookMarked className="w-4 h-4" /> Guardar como plantilla
        </button>
      </div>

      {/* Legal disclaimer */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Aviso legal
        </p>
        <p className="text-xs text-amber-800 leading-relaxed">
          Esta receta es un documento médico confidencial emitido bajo la responsabilidad del médico firmante. Su uso está autorizado exclusivamente para el paciente indicado. La reproducción, alteración o uso fraudulento constituye un delito federal conforme al Código Penal Federal y la Ley General de Salud.
        </p>
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Marco normativo:</strong> NOM-072-SSA1-2012 (Etiquetado de medicamentos) · Ley General de Salud Art. 226 · COFEPRIS — Comisión Federal para la Protección contra Riesgos Sanitarios.
        </p>
      </div>

      {showTemplates && <TemplateModal templates={templates} onSelect={t => { onApplyTemplate(t); setShowTemplates(false) }} onClose={() => setShowTemplates(false)} />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type MainTab = 'medico' | 'diseno' | 'receta'
type PageView = 'list' | 'editor'

// ─── COFEPRIS Compliance ──────────────────────────────────────────────────────
// Basado en: Reglamento de Insumos para la Salud Arts. 28-30 + LGS Art. 240

interface ComplianceCheck { label: string; ok: boolean; legal: string }

function getCofeprisChecks(draft: DraftState, doctor: DoctorConfig): { section: string; checks: ComplianceCheck[] }[] {
  const meds = draft.medications.filter(m => m.name.trim())
  const medChecks: ComplianceCheck[] = meds.length === 0 ? [
    { label: 'Al menos un medicamento', ok: false, legal: 'Art. 30 RIS' },
  ] : meds.flatMap((m, i) => {
    const prefix = meds.length > 1 ? `Med. ${i + 1}: ` : ''
    return [
      { label: `${prefix}Nombre genérico`,          ok: !!m.name.trim(),          legal: 'Art. 30 RIS' },
      { label: `${prefix}Forma farmacéutica`,        ok: !!m.form,                 legal: 'Art. 30 RIS' },
      { label: `${prefix}Concentración / dosis`,     ok: !!m.concentration.trim(), legal: 'Art. 30 RIS' },
      { label: `${prefix}Cantidad (número y letra)`, ok: !!m.quantity.trim() && !!m.quantity_text.trim(), legal: 'Art. 30 RIS + ISSEA' },
      { label: `${prefix}Vía, frecuencia y duración`,ok: !!m.instructions.trim(),  legal: 'Art. 30 RIS' },
    ]
  })

  return [
    {
      section: 'Datos del médico',
      checks: [
        { label: 'Nombre completo del médico',  ok: !!doctor.full_name.trim(),            legal: 'Art. 240 LGS' },
        { label: 'Cédula profesional',          ok: !!doctor.professional_license.trim(), legal: 'Art. 240 LGS' },
        { label: 'Domicilio del consultorio',   ok: !!doctor.address.trim(),              legal: 'Art. 29 RIS'  },
        { label: 'Firma autógrafa / nombre en firma', ok: !!(doctor.signature_name?.trim() || doctor.full_name.trim()), legal: 'Art. 29 RIS' },
      ],
    },
    {
      section: 'Datos del paciente',
      checks: [
        { label: 'Nombre del paciente', ok: !!draft.patient_name.trim(), legal: 'Art. 28 RIS' },
        { label: 'Edad del paciente',   ok: !!draft.patient_age.trim(),  legal: 'Art. 28 RIS' },
        { label: 'Fecha de emisión',    ok: !!draft.issued_at,           legal: 'Art. 29 RIS' },
      ],
    },
    {
      section: 'Medicamentos',
      checks: medChecks,
    },
  ]
}

function CofeprisCompliance({ draft, doctor }: { draft: DraftState; doctor: DoctorConfig }) {
  const sections = getCofeprisChecks(draft, doctor)
  const allChecks = sections.flatMap(s => s.checks)
  const totalOk = allChecks.filter(c => c.ok).length
  const pct = allChecks.length === 0 ? 0 : Math.round((totalOk / allChecks.length) * 100)
  const color = pct === 100 ? '#16A34A' : pct >= 70 ? '#D97706' : '#DC2626'
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header — always visible */}
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Cumplimiento COFEPRIS</p>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
        <span className="text-sm font-bold ml-3 flex-shrink-0" style={{ color }}>{pct}%</span>
      </button>

      {/* Detail — toggle */}
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          {sections.map(s => {
            const sOk = s.checks.filter(c => c.ok).length
            return (
              <div key={s.section}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.section}</p>
                  <span className="text-[10px] font-semibold text-gray-400">{sOk}/{s.checks.length}</span>
                </div>
                <div className="space-y-1">
                  {s.checks.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 text-xs">{c.ok ? '✅' : '❌'}</span>
                      <span className={`text-xs flex-1 ${c.ok ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>{c.label}</span>
                      <span className="text-[9px] text-gray-300 flex-shrink-0 font-mono">{c.legal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {pct === 100 && (
            <p className="text-xs font-semibold text-green-600 pt-1">✓ Receta válida para dispensación</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Recetas() {
  const { user } = useAuth()
  const [view, setView] = useState<PageView>('list')
  const [mainTab, setMainTab] = useState<MainTab>('receta')

  const [doctor, setDoctor] = useState<DoctorConfig>(defaultDoctor())
  const [design, setDesign] = useState<DesignConfig>(defaultDesign())
  const [draft, setDraft] = useState<DraftState>(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [templates, setTemplates] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<PatientProfileLite[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [saving, setSaving] = useState(false)
  const [savingDoctor, setSavingDoctor] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  useEffect(() => {
    let s = document.getElementById('rx-print-css') as HTMLStyleElement | null
    if (!s) { s = document.createElement('style'); s.id = 'rx-print-css'; document.head.appendChild(s) }
    s.textContent = PRINT_STYLE
    injectFont()
  }, [])

  useEffect(() => {
    const PAGE_SIZES: Record<string, string> = {
      media_carta: '135mm 215mm',
      carta:       '215.9mm 279.4mm',
      a4:          '210mm 297mm',
    }
    let el = document.getElementById('rx-page-size-css') as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = 'rx-page-size-css'
      document.head.appendChild(el)
    }
    el.textContent = `@media print { @page { size: ${PAGE_SIZES[design.paper_size] ?? PAGE_SIZES.media_carta}; margin: 10mm; } }`
  }, [design.paper_size])

  useEffect(() => {
    if (!user) return
    loadAll()
    loadStoredConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function loadStoredConfig() {
    try {
      const d = localStorage.getItem(`healthpal_rx_doctor_${user!.id}`)
      const des = localStorage.getItem(`healthpal_rx_design_${user!.id}`)
      if (d) {
        const parsed = JSON.parse(d)
        setDoctor({
          ...defaultDoctor(), ...parsed,
          specialty: parsed.specialty?.includes('_') ? formatSpecialty(parsed.specialty) : (parsed.specialty ?? ''),
          phone: formatMexPhone(parsed.phone ?? ''),
        })
      }
      if (des) {
        const parsed = JSON.parse(des)
        setDesign({ ...defaultDesign(), ...parsed, options: { ...defaultDesign().options, ...(parsed.options ?? {}) } })
      }
    } catch { /* ignore */ }
  }

  async function loadAll() {
    setLoadingData(true)
    try {
      const [myProfile, doctorProf, rxList, tplList, pts] = await Promise.all([
        getMyProfile(),
        getDoctorProfile(user!.id),
        getPrescriptions(),
        getTemplates(),
        listDoctorPatients(user!.id).catch(() => [] as PatientProfileLite[]),
      ])
      // Always apply logo/signature from DB (source of truth), merge over localStorage
      const stored = localStorage.getItem(`healthpal_rx_doctor_${user!.id}`)
      if (!stored) {
        setDoctor(d => ({
          ...d,
          full_name: myProfile?.full_name ?? '',
          specialty: formatSpecialty(doctorProf?.specialty) ?? '',
          professional_license: doctorProf?.professional_license ?? '',
          clinic_name: doctorProf?.clinic_name ?? '',
          address: doctorProf?.address_text ?? '',
          phone: formatMexPhone(myProfile?.phone ?? ''),
          email: myProfile?.email ?? '',
          logo_data_url: (doctorProf as unknown as Record<string, string>)?.rx_logo_url ?? '',
          signature_name: (doctorProf as unknown as Record<string, string>)?.rx_signature_name ?? '',
        }))
      } else {
        // Merge DB logo/signature over cached local values
        setDoctor(d => ({
          ...d,
          logo_data_url: (doctorProf as unknown as Record<string, string>)?.rx_logo_url || d.logo_data_url,
          signature_name: (doctorProf as unknown as Record<string, string>)?.rx_signature_name || d.signature_name,
        }))
      }
      setPrescriptions(rxList)
      setTemplates(tplList)
      setPatients(pts)
    } finally {
      setLoadingData(false)
    }
  }

  function saveDoctorLocally(d: DoctorConfig) {
    localStorage.setItem(`healthpal_rx_doctor_${user!.id}`, JSON.stringify(d))
    setDoctor(d)
  }

  function saveDesignLocally(d: DesignConfig) {
    localStorage.setItem(`healthpal_rx_design_${user!.id}`, JSON.stringify(d))
    setDesign(d)
  }

  function handlePrint() {
    const el = document.getElementById('rx-print-area')
    if (!el) return
    const PAGE_SIZES: Record<string, string> = {
      media_carta: '135mm 215mm',
      carta:       '215.9mm 279.4mm',
      a4:          '210mm 297mm',
    }
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
    // Wait for fonts/images then print
    setTimeout(() => { win.focus(); win.print(); win.close() }, 600)
  }

  const [printingRx, setPrintingRx] = useState<Prescription | null>(null)

  function handlePrintRx(rx: Prescription) { setPrintingRx(rx) }

  useEffect(() => {
    if (!printingRx) return
    // Wait one frame for the hidden RecetaPreview to render, then print
    const t = setTimeout(() => { handlePrint(); setPrintingRx(null) }, 100)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printingRx])

  async function handleSaveDoctorToProfile() {
    setSavingDoctor(true)
    try {
      let logoUrl = doctor.logo_data_url

      // If it's a base64 data URL, upload to Storage and replace with public URL
      if (logoUrl?.startsWith('data:')) {
        const mime = logoUrl.split(';')[0].split(':')[1]
        const ext  = mime === 'image/svg+xml' ? 'svg' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
        const path = `${user!.id}/logo.${ext}`
        // Convert base64 to Blob
        const base64 = logoUrl.split(',')[1]
        const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
        const blob   = new Blob([bytes], { type: mime })
        const { error: upErr } = await supabase.storage.from('doctor-logos').upload(path, blob, { upsert: true, contentType: mime })
        if (upErr) { logger.error('logo upload', upErr) }
        else {
          const { data: urlData } = supabase.storage.from('doctor-logos').getPublicUrl(path)
          logoUrl = urlData.publicUrl
        }
      }

      // Persist to doctor_profiles
      await supabase.from('doctor_profiles').update({
        rx_logo_url:       logoUrl?.startsWith('data:') ? null : (logoUrl || null),
        rx_signature_name: doctor.signature_name || null,
      }).eq('doctor_id', user!.id)

      // Save locally with resolved URL (not base64)
      saveDoctorLocally({ ...doctor, logo_data_url: logoUrl?.startsWith('data:') ? logoUrl : (logoUrl ?? '') })
      showToast('Datos del médico guardados', 'success')
    } catch (err) {
      logger.error('handleSaveDoctorToProfile', err)
      showToast('Error al guardar', 'error')
    }
    setSavingDoctor(false)
  }

  async function handleSelectPatient(patientId: string, name: string) {
    setDraft(d => ({ ...d, patient_id: patientId, patient_name: name }))
    try {
      const [profRes, medRes, chRes] = await Promise.all([
        supabase.from('profiles').select('full_name, birthdate, sex').eq('id', patientId).single(),
        supabase.from('patient_profiles').select('weight_kg, allergies').eq('patient_id', patientId).maybeSingle(),
        supabase.from('clinical_histories').select('allergies').eq('patient_id', patientId).maybeSingle(),
      ])
      const prof = profRes.data
      const med = medRes.data
      const ch = chRes.data

      // Parse allergies: clinical_history first (doctor-entered), fallback to patient_profiles
      // allergies can be JSON array of {name:string} objects or plain comma-separated string
      const parseAllergies = (raw: string | null | undefined): string[] => {
        if (!raw?.trim()) return []
        try {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) return arr.map((a: { name?: string }) => a?.name ?? String(a)).filter(Boolean)
        } catch { /* plain string */ }
        return raw.split(',').map(a => a.trim()).filter(Boolean)
      }

      const resolvedAllergies = parseAllergies(ch?.allergies) || parseAllergies(med?.allergies)

      setDraft(d => ({
        ...d,
        patient_name: prof?.full_name ?? name,
        patient_age: prof?.birthdate ? calcAge(prof.birthdate) : d.patient_age,
        patient_sex: prof?.sex ? ({ male: 'Masculino', female: 'Femenino', other: 'Indeterminado' }[prof.sex] ?? d.patient_sex) : d.patient_sex,
        patient_weight: med?.weight_kg ? `${med.weight_kg} kg` : d.patient_weight,
        allergies: resolvedAllergies.length ? resolvedAllergies : d.allergies,
      }))
    } catch (err) {
      logger.warn('handleSelectPatient: could not fetch patient data', err)
    }
  }

  function applyTemplate(t: Prescription) {
    setDraft(d => ({
      ...d,
      medications: t.medications.length ? t.medications.map(m => ({ ...m, id: crypto.randomUUID() })) : d.medications,
      indications: t.indications ?? d.indications,
    }))
    showToast(`Plantilla "${t.template_name}" aplicada`, 'success')
  }

  async function handleSave() {
    if (!draft.patient_name.trim()) { showToast('Ingresa el nombre del paciente', 'error'); return }
    if (draft.medications.some(m => !m.name.trim())) { showToast('Todos los medicamentos necesitan nombre', 'error'); return }
    setSaving(true)
    const payload = {
      patient_id: draft.patient_id ?? null,
      appointment_id: null,
      folio: draft.folio || null,
      issued_at: draft.issued_at,
      patient_name: draft.patient_name,
      patient_age: draft.patient_age || null,
      patient_sex: draft.patient_sex || null,
      patient_weight: draft.patient_weight || null,
      diagnosis: draft.diagnosis || null,
      allergies: draft.allergies,
      medications: draft.medications,
      indications: draft.indications || null,
      is_template: false, template_name: null,
    }
    let result: Prescription | null
    if (editingId) { result = await updatePrescription(editingId, payload) }
    else           { result = await createPrescription(payload) }
    if (result) {
      if (editingId) setPrescriptions(prev => prev.map(r => r.id === editingId ? result! : r))
      else           setPrescriptions(prev => [result!, ...prev])
      showToast('Receta guardada', 'success')
      setView('list')
    } else {
      showToast('Error al guardar', 'error')
    }
    setSaving(false)
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) { showToast('Ingresa nombre de plantilla', 'error'); return }
    setSavingTemplate(true)
    const result = await createPrescription({
      patient_id: null, appointment_id: null, folio: null, issued_at: todayIso(),
      patient_name: null, patient_age: null, patient_sex: null,
      diagnosis: draft.diagnosis || null,
      medications: draft.medications.filter(m => m.name.trim()),
      indications: draft.indications || null,
      is_template: true, template_name: templateName.trim(),
    })
    if (result) {
      setTemplates(prev => [...prev, result])
      setTemplateName(''); setShowSaveTemplate(false)
      showToast('Plantilla guardada', 'success')
    } else {
      showToast('Error al guardar plantilla', 'error')
    }
    setSavingTemplate(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    if (await deletePrescription(id)) {
      setPrescriptions(prev => prev.filter(r => r.id !== id))
      showToast('Receta eliminada', 'success')
    } else {
      showToast('Error al eliminar', 'error')
    }
    setDeleting(null)
  }

  function openNew() { setDraft(emptyDraft()); setEditingId(null); setMainTab('medico'); setView('editor') }
  function openEdit(rx: Prescription) {
    setDraft({
      patient_id: rx.patient_id,
      patient_name: rx.patient_name ?? '',
      patient_age: rx.patient_age ?? '',
      patient_sex: rx.patient_sex ?? '',
      patient_weight: rx.patient_weight ?? '',
      issued_at: rx.issued_at,
      folio: rx.folio ?? '',
      diagnosis: rx.diagnosis ?? '',
      allergies: rx.allergies ?? [],
      medications: rx.medications.length ? rx.medications : [],
      vitals: emptyDraft().vitals,
      indications: rx.indications ?? '',
    })
    setEditingId(rx.id); setMainTab('receta'); setView('editor')
  }

  const TABS: { id: MainTab; label: string }[] = [
    { id: 'medico', label: 'Médico' },
    { id: 'diseno', label: 'Diseño' },
    { id: 'receta', label: 'Receta' },
  ]

  // ── List view ──────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recetas Médicas</h1>
              <p className="hidden sm:block text-sm text-gray-500 mt-0.5">Genera y gestiona recetas para tus pacientes</p>
            </div>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Nueva receta
            </button>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-[#33C7BE] animate-spin" /></div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 flex items-center justify-center"><FileText className="w-8 h-8 text-[#33C7BE]" /></div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Sin recetas aún</h3>
              <p className="text-sm text-gray-500 mb-5">Crea tu primera receta médica</p>
              <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 transition-colors">
                <Plus className="w-4 h-4" /> Nueva receta
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {prescriptions.map(rx => (
                <div key={rx.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{rx.patient_name ?? 'Paciente'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatIssuedAt(rx.issued_at)}
                        {rx.folio && <span className="ml-2 font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{rx.folio}</span>}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(rx.id)} disabled={deleting === rx.id} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                      {deleting === rx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {rx.medications.length > 0 && (
                    <p className="text-xs text-gray-500 truncate">{rx.medications.map(m => m.name).join(', ')}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEdit(rx)} className="flex-1 py-1.5 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50">Editar</button>
                    <button onClick={() => handlePrintRx(rx)}
                      className="flex-1 py-1.5 text-xs font-semibold bg-[#33C7BE] text-white rounded-xl hover:bg-teal-600 flex items-center justify-center gap-1.5">
                      <Printer className="w-3 h-3" /> Imprimir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Hidden print area for list-view printing */}
        {printingRx && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, width: 800, visibility: 'hidden', pointerEvents: 'none' }}>
            <RecetaPreview
              draft={{
                patient_id: printingRx.patient_id, patient_name: printingRx.patient_name ?? '',
                patient_age: printingRx.patient_age ?? '', patient_sex: printingRx.patient_sex ?? '',
                patient_weight: '', issued_at: printingRx.issued_at, folio: printingRx.folio ?? '',
                diagnosis: printingRx.diagnosis ?? '', allergies: [],
                medications: printingRx.medications, vitals: emptyDraft().vitals,
                indications: printingRx.indications ?? '',
              }}
              doctor={doctor}
              design={design}
            />
          </div>
        )}
      </DashboardLayout>
    )
  }

  // ── Editor view ────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('list')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">{editingId ? 'Editar receta' : 'Nueva receta'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePrint()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">
              <Printer className="w-4 h-4" /><span className="hidden sm:inline">Imprimir</span>
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#33C7BE] text-white font-semibold text-sm rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-5">
          {TABS.map((t, i) => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              className={`px-5 py-2.5 text-sm font-semibold relative transition-colors ${
                mainTab === t.id ? 'text-[#33C7BE]' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {i + 1} {t.label}
              {mainTab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#33C7BE] rounded-t" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Left: form */}
          <div>
            {mainTab === 'medico' && (
              <TabMedico doctor={doctor} onChange={saveDoctorLocally} onSaveToProfile={handleSaveDoctorToProfile} saving={savingDoctor} />
            )}
            {mainTab === 'diseno' && (
              <TabDiseno design={design} onChange={saveDesignLocally} />
            )}
            {mainTab === 'receta' && (
              <TabReceta
                draft={draft} onChange={setDraft}
                patients={patients} onSelectPatient={handleSelectPatient}
                templates={templates} onApplyTemplate={applyTemplate}
                onSaveAsTemplate={() => setShowSaveTemplate(true)}
              />
            )}

            {/* Tab navigation arrows */}
            <div className="flex items-center justify-between mt-5">
              {mainTab !== 'medico'
                ? <button onClick={() => setMainTab(mainTab === 'receta' ? 'diseno' : 'medico')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#33C7BE] transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {mainTab === 'receta' ? 'Diseño' : 'Médico'}
                  </button>
                : <div />
              }
              {mainTab !== 'receta'
                ? <button onClick={() => setMainTab(mainTab === 'medico' ? 'diseno' : 'receta')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#33C7BE] transition-colors">
                    {mainTab === 'medico' ? 'Diseño' : 'Receta'} <ArrowRight className="w-4 h-4" />
                  </button>
                : <div />
              }
            </div>
          </div>

          {/* Right: preview */}
          <div className="xl:sticky xl:top-6 xl:self-start space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vista previa</p>
              <span className="text-[10px] text-gray-400 font-mono">
                {{ media_carta: '13.5×21.5 cm', carta: '21.5×28 cm', a4: '21×29.7 cm' }[design.paper_size]}
              </span>
            </div>
            <div style={{
              maxWidth: design.paper_size === 'media_carta' ? 360 : 480,
              margin: '0 auto',
            }}>
              <RecetaPreview draft={draft} doctor={doctor} design={design} />
            </div>
            <CofeprisCompliance draft={draft} doctor={doctor} />
          </div>
        </div>
      </div>

      {/* Save template modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveTemplate(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Guardar como plantilla</h3>
            <p className="text-sm text-gray-500">Se guardarán medicamentos e indicaciones sin datos del paciente.</p>
            <input autoFocus value={templateName} onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
              placeholder="Nombre de la plantilla"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33C7BE]/30 focus:outline-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowSaveTemplate(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm">Cancelar</button>
              <button onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()}
                className="flex-1 py-2.5 bg-[#33C7BE] text-white font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
