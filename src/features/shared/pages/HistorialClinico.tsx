import { useState, useEffect, useRef } from 'react'
import { Activity, ShieldCheck, Plus, Pencil, ChevronDown, ChevronUp, Trash, Save, Loader2 } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthContext'
import DashboardLayout from '@/app/layout/DashboardLayout'
import ClinicalHistoryTab from '@/features/doctor/components/ClinicalHistoryTab'
import { getPatientProfile, upsertPatientProfile } from '@/features/patient/services/patientProfile'
import { PatientProfile, PatientInsurance, BiometricRecord } from '@/shared/types/database'
import {
  getMyInsurances,
  upsertInsurance,
  deleteInsurance,
  updateInsurance,
  INSURANCE_PROVIDERS,
  HOLDER_RELATIONSHIPS,
  COVERAGE_TYPES,
  insuranceDisplayName,
} from '@/shared/lib/queries/insurance'
import { getBiometricHistory, insertBiometricRecord } from '@/shared/lib/queries/biometrics'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

export default function HistorialClinico() {
  const { user, profile: authProfile } = useAuth()
  const isPatient = authProfile?.role === 'patient'

  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)
  const [biometricHistory, setBiometricHistory] = useState<BiometricRecord[]>([])
  const medicalFormInitialized = useRef(false)

  const [medicalForm, setMedicalForm] = useState({
    height_cm: '' as string | number,
    weight_kg: '' as string | number,
    blood_type: '',
  })
  const [isSavingMedical, setIsSavingMedical] = useState(false)

  // Insurance state
  const [insurances, setInsurances] = useState<PatientInsurance[]>([])
  const [showInsuranceForm, setShowInsuranceForm] = useState(false)
  const [editingInsurance, setEditingInsurance] = useState<PatientInsurance | null>(null)
  const [isSavingInsurance, setIsSavingInsurance] = useState(false)
  const [expandedInsurance, setExpandedInsurance] = useState<string | null>(null)
  const [insuranceForm, setInsuranceForm] = useState({
    provider_name: '',
    provider_other: '',
    policy_number: '',
    group_number: '',
    member_id: '',
    holder_name: '',
    holder_relationship: 'self',
    phone_claims: '',
    phone_emergency: '',
    valid_from: '',
    valid_until: '',
    coverage_type: 'individual',
    is_primary: true,
    notes: '',
  })

  useEffect(() => {
    if (!user || !isPatient) return
    getPatientProfile(user.id).then(setPatientProfile).catch(() => {})
    getMyInsurances(user.id).then(setInsurances).catch(() => {})
    getBiometricHistory(user.id).then(setBiometricHistory).catch(() => {})
  }, [user, isPatient])

  useEffect(() => {
    if (patientProfile && !medicalFormInitialized.current) {
      medicalFormInitialized.current = true
      setMedicalForm({
        height_cm: patientProfile.height_cm ?? '',
        weight_kg: patientProfile.weight_kg ?? '',
        blood_type: patientProfile.blood_type ?? '',
      })
    }
  }, [patientProfile])

  const validatePhone = (val: string): boolean => {
    if (!val) return true
    const digits = val.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15
  }

  const sanitizePhone = (val: string): string =>
    val.replace(/[^\d+\s\-()]/g, '').slice(0, 20)

  const handleSavePatientProfile = async (data: object) => {
    if (!user) return
    const updated = await upsertPatientProfile(user.id, data)
    setPatientProfile(updated)
  }

  const handleSaveMedical = async () => {
    if (!user) return
    try {
      setIsSavingMedical(true)
      const heightNum = medicalForm.height_cm !== '' ? Number(medicalForm.height_cm) : null
      const weightNum = medicalForm.weight_kg !== '' ? Number(medicalForm.weight_kg) : null
      await handleSavePatientProfile({
        ...medicalForm,
        height_cm: heightNum,
        weight_kg: weightNum,
      })
      if (heightNum !== null || weightNum !== null || medicalForm.blood_type) {
        const record = await insertBiometricRecord({
          patient_id: user.id,
          recorded_at: new Date().toISOString(),
          height_cm: heightNum,
          weight_kg: weightNum,
          blood_type: medicalForm.blood_type || null,
          notes: null,
        })
        if (record) setBiometricHistory(prev => [record, ...prev])
      }
      showToast('Datos biométricos guardados', 'success')
    } catch (err) {
      logger.error('HistorialClinico:saveMedical', err)
      showToast('Error al guardar datos', 'error')
    } finally {
      setIsSavingMedical(false)
    }
  }

  const resetInsuranceForm = () => setInsuranceForm({
    provider_name: '', provider_other: '', policy_number: '', group_number: '',
    member_id: '', holder_name: '', holder_relationship: 'self', phone_claims: '',
    phone_emergency: '', valid_from: '', valid_until: '', coverage_type: 'individual',
    is_primary: true, notes: '',
  })

  const openNewInsuranceForm = () => {
    resetInsuranceForm()
    setEditingInsurance(null)
    setShowInsuranceForm(true)
  }

  const openEditInsuranceForm = (ins: PatientInsurance) => {
    setEditingInsurance(ins)
    setInsuranceForm({
      provider_name: ins.provider_name,
      provider_other: ins.provider_other || '',
      policy_number: ins.policy_number || '',
      group_number: ins.group_number || '',
      member_id: ins.member_id || '',
      holder_name: ins.holder_name || '',
      holder_relationship: ins.holder_relationship || 'self',
      phone_claims: ins.phone_claims || '',
      phone_emergency: ins.phone_emergency || '',
      valid_from: ins.valid_from || '',
      valid_until: ins.valid_until || '',
      coverage_type: ins.coverage_type || 'individual',
      is_primary: ins.is_primary,
      notes: ins.notes || '',
    })
    setShowInsuranceForm(true)
  }

  const handleSaveInsurance = async () => {
    if (!user || !insuranceForm.provider_name) return
    if (!validatePhone(insuranceForm.phone_emergency)) {
      showToast('Tel. urgencias inválido (10–15 dígitos)', 'error')
      return
    }
    if (!validatePhone(insuranceForm.phone_claims)) {
      showToast('Tel. reclamaciones inválido (10–15 dígitos)', 'error')
      return
    }
    setIsSavingInsurance(true)
    try {
      const payload = {
        ...insuranceForm,
        provider_other: insuranceForm.provider_name === 'Otro' ? insuranceForm.provider_other || null : null,
        policy_number: insuranceForm.policy_number || null,
        group_number: insuranceForm.group_number || null,
        member_id: insuranceForm.member_id || null,
        holder_name: insuranceForm.holder_name || null,
        phone_claims: insuranceForm.phone_claims || null,
        phone_emergency: insuranceForm.phone_emergency || null,
        valid_from: insuranceForm.valid_from || null,
        valid_until: insuranceForm.valid_until || null,
        notes: insuranceForm.notes || null,
      }
      if (editingInsurance) {
        await updateInsurance(editingInsurance.id, payload)
      } else {
        await upsertInsurance(user.id, payload)
        await upsertPatientProfile(user.id, {
          insurance_provider: insuranceForm.provider_name === 'Otro'
            ? (insuranceForm.provider_other || null)
            : insuranceForm.provider_name,
        })
      }
      const updated = await getMyInsurances(user.id)
      setInsurances(updated)
      setShowInsuranceForm(false)
      resetInsuranceForm()
      setEditingInsurance(null)
      showToast('Seguro guardado', 'success')
    } catch (err) {
      logger.error('HistorialClinico:saveInsurance', err)
      showToast('Error al guardar seguro', 'error')
    } finally {
      setIsSavingInsurance(false)
    }
  }

  const handleDeleteInsurance = async (id: string) => {
    if (!confirm('¿Eliminar este seguro?')) return
    const { ok } = await deleteInsurance(id)
    if (ok) {
      setInsurances(prev => prev.filter(i => i.id !== id))
      showToast('Seguro eliminado', 'success')
    }
  }

  if (!isPatient) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
          <p className="text-gray-500 text-sm">Esta sección es solo para pacientes.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F8F9FB] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Historial Clínico</h1>
            <p className="text-sm text-gray-500">Tu información médica, seguros y antecedentes</p>
          </div>

          {/* Datos biométricos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#33C7BE]" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Datos biométricos</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Altura (cm)</label>
                <input type="number" min={0} max={300} value={medicalForm.height_cm} onChange={e => setMedicalForm(f => ({ ...f, height_cm: e.target.value }))} placeholder="170" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Peso (kg)</label>
                <input type="number" min={0} max={500} value={medicalForm.weight_kg} onChange={e => setMedicalForm(f => ({ ...f, weight_kg: e.target.value }))} placeholder="70" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo de sangre</label>
                <select value={medicalForm.blood_type} onChange={e => setMedicalForm(f => ({ ...f, blood_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] bg-white">
                  <option value="">--</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveMedical} disabled={isSavingMedical} className="inline-flex items-center gap-2 px-5 py-2 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-[#2ab5ac] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                {isSavingMedical ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><Save className="w-4 h-4" />Guardar</>}
              </button>
            </div>

            {biometricHistory.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Historial de medidas</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {biometricHistory.map((rec) => {
                    const date = new Date(rec.recorded_at).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                    return (
                      <div key={rec.id} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg text-xs">
                        <span className="text-gray-400 w-24 flex-shrink-0">{date}</span>
                        <div className="flex items-center gap-3 flex-wrap">
                          {rec.height_cm !== null && (
                            <span className="text-gray-700"><span className="text-gray-400">Altura:</span> {rec.height_cm} cm</span>
                          )}
                          {rec.weight_kg !== null && (
                            <span className="text-gray-700"><span className="text-gray-400">Peso:</span> {rec.weight_kg} kg</span>
                          )}
                          {rec.blood_type && (
                            <span className="text-gray-700"><span className="text-gray-400">Sangre:</span> {rec.blood_type}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Seguro médico */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Seguro médico</h3>
              </div>
              {!showInsuranceForm && (
                <button
                  onClick={openNewInsuranceForm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#33C7BE] border border-[#33C7BE]/30 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              )}
            </div>

            {insurances.length === 0 && !showInsuranceForm && (
              <p className="text-sm text-gray-400 text-center py-4">No has registrado seguros médicos.</p>
            )}

            {insurances.map((ins) => {
              const isExpanded = expandedInsurance === ins.id
              const displayName = insuranceDisplayName(ins)
              return (
                <div key={ins.id} className="border border-gray-200 rounded-xl mb-3 overflow-hidden">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                        <p className="text-[11px] text-gray-400">{ins.policy_number ? `Póliza: ${ins.policy_number}` : 'Sin número de póliza'}</p>
                      </div>
                      {ins.is_primary && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Principal</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEditInsuranceForm(ins)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteInsurance(ins.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setExpandedInsurance(isExpanded ? null : ins.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-3 bg-gray-50 grid grid-cols-2 gap-2 text-xs">
                      {ins.member_id && <div><span className="text-gray-400">ID Miembro:</span> <span className="font-semibold text-gray-700">{ins.member_id}</span></div>}
                      {ins.group_number && <div><span className="text-gray-400">Grupo:</span> <span className="font-semibold text-gray-700">{ins.group_number}</span></div>}
                      {ins.holder_name && <div><span className="text-gray-400">Titular:</span> <span className="font-semibold text-gray-700">{ins.holder_name}</span></div>}
                      {ins.coverage_type && <div><span className="text-gray-400">Cobertura:</span> <span className="font-semibold text-gray-700">{COVERAGE_TYPES.find(c => c.value === ins.coverage_type)?.label || ins.coverage_type}</span></div>}
                      {ins.valid_until && <div><span className="text-gray-400">Vigencia:</span> <span className="font-semibold text-gray-700">hasta {ins.valid_until}</span></div>}
                      {ins.phone_emergency && <div><span className="text-gray-400">Tel. urgencias:</span> <span className="font-semibold text-gray-700">{ins.phone_emergency}</span></div>}
                      {ins.phone_claims && <div><span className="text-gray-400">Tel. reclamaciones:</span> <span className="font-semibold text-gray-700">{ins.phone_claims}</span></div>}
                      {ins.notes && <div className="col-span-2"><span className="text-gray-400">Notas:</span> <span className="font-semibold text-gray-700">{ins.notes}</span></div>}
                    </div>
                  )}
                </div>
              )
            })}

            {showInsuranceForm && (
              <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/30 space-y-3 mt-3">
                <p className="text-xs font-bold text-gray-700">{editingInsurance ? 'Editar seguro' : 'Nuevo seguro'}</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Aseguradora *</label>
                  <select value={insuranceForm.provider_name} onChange={e => setInsuranceForm(f => ({ ...f, provider_name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]">
                    <option value="">Seleccionar aseguradora</option>
                    {INSURANCE_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {insuranceForm.provider_name === 'Otro' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre de la aseguradora</label>
                    <input type="text" value={insuranceForm.provider_other} onChange={e => setInsuranceForm(f => ({ ...f, provider_other: e.target.value }))} placeholder="Nombre" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Núm. póliza</label>
                    <input type="text" value={insuranceForm.policy_number} onChange={e => setInsuranceForm(f => ({ ...f, policy_number: e.target.value }))} placeholder="Ej: GNP-123456" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ID Miembro / Afiliado</label>
                    <input type="text" value={insuranceForm.member_id} onChange={e => setInsuranceForm(f => ({ ...f, member_id: e.target.value }))} placeholder="Núm. afiliado" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Núm. grupo</label>
                    <input type="text" value={insuranceForm.group_number} onChange={e => setInsuranceForm(f => ({ ...f, group_number: e.target.value }))} placeholder="Grupo" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de cobertura</label>
                    <select value={insuranceForm.coverage_type} onChange={e => setInsuranceForm(f => ({ ...f, coverage_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]">
                      {COVERAGE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del titular</label>
                    <input type="text" value={insuranceForm.holder_name} onChange={e => setInsuranceForm(f => ({ ...f, holder_name: e.target.value }))} placeholder="Nombre del titular" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Relación con titular</label>
                    <select value={insuranceForm.holder_relationship} onChange={e => setInsuranceForm(f => ({ ...f, holder_relationship: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]">
                      {HOLDER_RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Vigencia desde</label>
                    <input type="date" value={insuranceForm.valid_from} onChange={e => setInsuranceForm(f => ({ ...f, valid_from: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Vigencia hasta</label>
                    <input type="date" value={insuranceForm.valid_until} onChange={e => setInsuranceForm(f => ({ ...f, valid_until: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tel. urgencias</label>
                    <input type="tel" value={insuranceForm.phone_emergency} onChange={e => setInsuranceForm(f => ({ ...f, phone_emergency: sanitizePhone(e.target.value) }))} placeholder="8001234567" maxLength={20} className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] ${insuranceForm.phone_emergency && !validatePhone(insuranceForm.phone_emergency) ? 'border-red-400' : 'border-gray-200'}`} />
                    {insuranceForm.phone_emergency && !validatePhone(insuranceForm.phone_emergency) && (
                      <p className="text-[11px] text-red-500 mt-1">Debe tener 10–15 dígitos</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tel. reclamaciones</label>
                    <input type="tel" value={insuranceForm.phone_claims} onChange={e => setInsuranceForm(f => ({ ...f, phone_claims: sanitizePhone(e.target.value) }))} placeholder="8001234567" maxLength={20} className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] ${insuranceForm.phone_claims && !validatePhone(insuranceForm.phone_claims) ? 'border-red-400' : 'border-gray-200'}`} />
                    {insuranceForm.phone_claims && !validatePhone(insuranceForm.phone_claims) && (
                      <p className="text-[11px] text-red-500 mt-1">Debe tener 10–15 dígitos</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Notas adicionales</label>
                  <textarea value={insuranceForm.notes} onChange={e => setInsuranceForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Coberturas especiales, restricciones, etc." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] resize-none" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_primary" checked={insuranceForm.is_primary} onChange={e => setInsuranceForm(f => ({ ...f, is_primary: e.target.checked }))} className="accent-[#33C7BE]" />
                  <label htmlFor="is_primary" className="text-xs font-semibold text-gray-600">Seguro principal</label>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => { setShowInsuranceForm(false); setEditingInsurance(null); resetInsuranceForm() }} disabled={isSavingInsurance} className="px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100">Cancelar</button>
                  <button onClick={handleSaveInsurance} disabled={isSavingInsurance || !insuranceForm.provider_name} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-[#2ab5ac] disabled:opacity-50 transition-colors">
                    {isSavingInsurance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clinical History */}
          {user && <ClinicalHistoryTab patientId={user.id} editorId={user.id} />}
        </div>
      </div>
    </DashboardLayout>
  )
}
