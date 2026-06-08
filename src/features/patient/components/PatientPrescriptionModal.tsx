// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useState } from 'react'
import { X, Printer, Loader2 } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Prescription } from '@/shared/lib/queries/prescriptions'
import { formatSpecialty } from '@/shared/lib/specialties'

interface DoctorInfo {
  full_name: string | null
  phone: string | null
  email: string | null
  specialty: string | null
  professional_license: string | null
  cedula_especialidad: string | null
  clinic_name: string | null
  address_text: string | null
  rx_logo_url: string | null
  rx_signature_name: string | null
}

interface Props {
  prescription: Prescription
  onClose: () => void
}

function formatMexPhone(raw: string | null): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('52')) {
    return `+52 ${d.slice(2, 4)} ${d.slice(4, 8)} ${d.slice(8)}`
  }
  if (d.length === 10) return `+52 ${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`
  return raw
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

// Mirrors doctor's RecetaPreview "clasico" layout exactly
function PreviewContent({ rx, doc }: { rx: Prescription; doc: DoctorInfo | null }) {
  const ac = '#33C7BE'
  const font = 'Arial, sans-serif'

  const headerLeft = (
    <div style={{ fontFamily: font, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      {doc?.rx_logo_url && (
        <img src={doc.rx_logo_url} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
      )}
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111' }}>{doc?.full_name ?? '—'}</p>
        {doc?.specialty && (
          <p style={{ fontSize: 13, fontWeight: 600, color: ac, margin: '2px 0 0' }}>{formatSpecialty(doc.specialty)}</p>
        )}
        <div style={{ marginTop: 4, fontSize: 11, color: '#666', lineHeight: 1.6 }}>
          {doc?.professional_license && (
            <span>Cédula Prof.: <strong style={{ color: '#333' }}>{doc.professional_license}</strong></span>
          )}
          {doc?.professional_license && doc?.cedula_especialidad && <span style={{ marginLeft: 12 }} />}
          {doc?.cedula_especialidad && (
            <span>Esp.: <strong style={{ color: '#333' }}>{doc.cedula_especialidad}</strong></span>
          )}
        </div>
      </div>
    </div>
  )

  const headerRight = (
    <div style={{ textAlign: 'right', fontFamily: font, fontSize: 11, color: '#555', lineHeight: 1.7 }}>
      {doc?.clinic_name && <p style={{ margin: 0, fontWeight: 600, color: '#333' }}>{doc.clinic_name}</p>}
      {doc?.address_text && <p style={{ margin: 0 }}>{doc.address_text}</p>}
      {doc?.phone && <p style={{ margin: 0 }}>{formatMexPhone(doc.phone)}</p>}
      {doc?.email && <p style={{ margin: 0 }}>{doc.email}</p>}
    </div>
  )

  const patientSection = (
    <div style={{ fontFamily: font, padding: '10px 0', borderBottom: '1px solid #eee' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
        {[
          { label: 'Paciente', value: rx.patient_name || '—' },
          { label: 'Edad', value: rx.patient_age || '—' },
          { label: 'Sexo', value: rx.patient_sex || '—' },
          { label: 'Peso', value: rx.patient_weight || '—' },
          { label: 'Fecha', value: formatDate(rx.issued_at) },
        ].map(f => (
          <div key={f.label}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</p>
            <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#111' }}>{f.value}</p>
          </div>
        ))}
      </div>
      {rx.allergies && rx.allergies.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11 }}>
          <span style={{ fontWeight: 700, color: '#DC2626', fontSize: 10 }}>⚠ ALERGIAS: </span>
          <span style={{ color: '#DC2626' }}>{rx.allergies.join(', ')}</span>
        </div>
      )}
    </div>
  )

  const rxBody = (
    <div style={{ fontFamily: font, paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#ddd' }} />
      </div>
      {rx.diagnosis && (
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#444' }}>
          <strong>Diagnóstico:</strong> {rx.diagnosis}
        </p>
      )}
      {rx.medications.length === 0 ? (
        <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: 12 }}>Sin medicamentos</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rx.medications.map((med, i) => (
            <div key={med.id}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                {i + 1}. {med.name || '—'}
                {med.brand && <span style={{ fontWeight: 400, color: '#666', marginLeft: 6 }}>({med.brand})</span>}
              </p>
              <p style={{ margin: '2px 0 0 16px', color: '#444', fontSize: 12 }}>
                {[med.form, med.concentration].filter(Boolean).join(' ')}
                {med.quantity && <> — Cantidad: <strong>{med.quantity}</strong>{med.quantity_text ? ` (${med.quantity_text})` : ''}</>}
              </p>
              {med.instructions && (
                <p style={{ margin: '2px 0 0 16px', fontSize: 12, fontStyle: 'italic', color: '#333' }}>{med.instructions}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {rx.indications && (
        <div style={{ marginTop: 14, padding: '10px 12px', background: '#f0fffe', border: `1px solid ${ac}30`, borderRadius: 6 }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>Indicaciones generales</p>
          <p style={{ margin: 0, fontSize: 12, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{rx.indications}</p>
        </div>
      )}
      <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px dashed #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ textAlign: 'center' }}>
          {doc?.rx_signature_name && (
            <p style={{ margin: '0 0 2px', fontSize: 13, fontStyle: 'italic', color: '#333', fontFamily: 'Georgia, serif' }}>{doc.rx_signature_name}</p>
          )}
          <div style={{ width: 140, borderTop: '1px solid #999', paddingTop: 4, marginTop: doc?.rx_signature_name ? 4 : 32 }}>
            <p style={{ margin: 0, fontSize: 10, color: '#888' }}>Firma del médico</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10, color: '#aaa' }}>
          {rx.folio && <p style={{ margin: 0 }}>Folio: <strong>{rx.folio}</strong></p>}
          <p style={{ margin: '2px 0 0' }}>Documento confidencial</p>
        </div>
      </div>
      <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #eee', fontSize: 9, color: '#aaa', textAlign: 'center', lineHeight: 1.6 }}>
        Receta expedida conforme a la NOM-072-SSA1-2012 y demás disposiciones sanitarias aplicables.
      </div>
    </div>
  )

  return (
    <div
      id="patient-rx-print-area"
      style={{ position: 'relative', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
    >
      {/* Header band */}
      <div style={{ padding: '20px 28px 14px', borderBottom: `4px solid ${ac}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          {headerLeft}
          {headerRight}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '0 28px 24px' }}>
        {patientSection}
        {rxBody}
      </div>
    </div>
  )
}

export function PatientPrescriptionModal({ prescription, onClose }: Props) {
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [profRes, dpRes] = await Promise.all([
          supabase.from('profiles').select('full_name, phone, email').eq('id', prescription.doctor_id).single(),
          supabase.from('doctor_profiles').select('specialty, professional_license, cedula_especialidad, clinic_name, address_text, rx_logo_url, rx_signature_name').eq('doctor_id', prescription.doctor_id).single(),
        ])
        setDoctorInfo({
          full_name: profRes.data?.full_name ?? null,
          phone: profRes.data?.phone ?? null,
          email: profRes.data?.email ?? null,
          specialty: dpRes.data?.specialty ?? null,
          professional_license: dpRes.data?.professional_license ?? null,
          cedula_especialidad: dpRes.data?.cedula_especialidad ?? null,
          clinic_name: dpRes.data?.clinic_name ?? null,
          address_text: dpRes.data?.address_text ?? null,
          rx_logo_url: dpRes.data?.rx_logo_url ?? null,
          rx_signature_name: dpRes.data?.rx_signature_name ?? null,
        })
      } catch (err) {
        logger.error('PatientPrescriptionModal.load', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [prescription.doctor_id])

  function handlePrint() {
    const area = document.getElementById('patient-rx-print-area')
    if (!area) return
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { window.print(); return }
    win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Receta</title>
<style>
@page { margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
img { max-width: 100%; }
#patient-rx-print-area { border: none !important; box-shadow: none !important; border-radius: 0 !important; width: 100% !important; }
</style>
</head><body>${area.outerHTML}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print(); win.close() }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Receta médica</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(prescription.issued_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Printer size={14} /> Imprimir
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <PreviewContent rx={prescription} doc={doctorInfo} />
          )}
        </div>
      </div>
    </div>
  )
}
