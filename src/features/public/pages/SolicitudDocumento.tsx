import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
  Lock,
  User,
  Mail,
  KeyRound,
  ArrowRight,
} from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { getDocumentRequestByToken, fulfillDocumentRequest } from '@/shared/lib/queries/documentRequests'
import { uploadDocument } from '@/shared/lib/queries/documents'
import { updateMyProfile, saveOnboardingStep } from '@/shared/lib/queries/profile'
import { validateFile } from '@/shared/lib/errors'
import { logger } from '@/shared/lib/logger'
import type { DocumentRequestWithDoctor } from '@/shared/lib/queries/documentRequests'

function inferCategory(docType: string): 'radiology' | 'prescription' | 'history' | 'lab' | 'insurance' | 'other' {
  const t = docType.toLowerCase()
  if (/radiograf|resonancia|tomograf|ultrasonido|imagen|rx|eco|densito|electro/.test(t)) return 'radiology'
  if (/receta|prescripci/.test(t)) return 'prescription'
  if (/historial|expediente|vacuna/.test(t)) return 'history'
  if (/laboratorio|análisis|analisis|sangre|orina|cultivo|biometría|biometria|glucosa/.test(t)) return 'lab'
  if (/seguro|póliza|poliza/.test(t)) return 'insurance'
  return 'other'
}

type Step = 'loading' | 'invalid' | 'expired' | 'fulfilled' | 'auth' | 'upload' | 'done'
type AuthMode = 'login' | 'register'

export default function SolicitudDocumento() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('loading')
  const [request, setRequest] = useState<DocumentRequestWithDoctor | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [wrongSession, setWrongSession] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isNewAccount, setIsNewAccount] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!token) { setStep('invalid'); return }
    loadRequest()
  }, [token])

  async function loadRequest() {
    const { data, error } = await getDocumentRequestByToken(token!)
    if (error || !data) { setStep('invalid'); return }
    if (data.status === 'fulfilled') { setStep('fulfilled'); setRequest(data); return }
    if (new Date(data.expires_at) < new Date()) { setStep('expired'); setRequest(data); return }

    setRequest(data)

    // Pre-fill email from request
    setEmail(data.patient_email)

    // Check if the patient email is already registered
    const { data: emailExists } = await (supabase as any).rpc('check_email_registered', {
      p_email: data.patient_email,
    })
    setAuthMode(emailExists ? 'login' : 'register')

    // Check if user is already logged in
    const { data: session } = await supabase.auth.getSession()
    const sessionUser = session.session?.user

    if (sessionUser) {
      const sessionEmail = sessionUser.email?.toLowerCase().trim()
      const requestEmail = data.patient_email.toLowerCase().trim()

      if (sessionEmail === requestEmail) {
        setCurrentUserId(sessionUser.id)
        setStep('upload')
      } else {
        // Wrong account — sign out and show correct form
        await supabase.auth.signOut()
        setWrongSession(true)
        setStep('auth')
      }
    } else {
      setStep('auth')
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setAuthError('Correo o contraseña incorrectos'); return }
        setCurrentUserId(data.user!.id)
        setStep('upload')
      } else {
        // Register
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, role: 'patient' },
          },
        })
        if (error) { setAuthError(error.message); return }
        if (!data.user) { setAuthError('No se pudo crear la cuenta'); return }
        const newUserId = data.user.id
        setCurrentUserId(newUserId)

        // Wait for the profile DB trigger to run, then prepare onboarding in parallel
        await new Promise(r => setTimeout(r, 1500))

        // Run all post-registration setup concurrently during the wait window
        await Promise.allSettled([
          // Set role + advance onboarding step so OnboardingRole can redirect instantly
          updateMyProfile({ role: 'patient' }),
          saveOnboardingStep('basic'),
          // Auto-grant doctor full consent
          request
            ? (supabase.from('doctor_patient_consent') as any).upsert({
                doctor_id: request.doctor_id,
                patient_id: newUserId,
                status: 'accepted',
                share_basic_profile: true,
                share_contact: true,
                share_documents: true,
                share_appointments: true,
                share_medical_notes: true,
                responded_at: new Date().toISOString(),
              }, { onConflict: 'doctor_id,patient_id' })
            : Promise.resolve(),
        ])

        // Flag tells OnboardingRole to skip straight to /onboarding/basic (no DB calls needed there)
        sessionStorage.setItem('healthpal:from_solicitud', '1')
        setIsNewAccount(true)
        setStep('upload')
      }
    } catch (err) {
      logger.error('solicitudDocumento:auth', err)
      setAuthError('Error inesperado, intenta de nuevo')
    } finally {
      setAuthLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const errors: string[] = []
    const valid: File[] = []
    for (const f of files) {
      const err = validateFile(f, 'document')
      if (err) errors.push(`${f.name}: ${err}`)
      else valid.push(f)
    }

    if (errors.length) { setUploadError(errors.join(' · ')); return }
    setSelectedFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))]
    })
    setUploadError('')
    // Reset input so the same file can be re-added after removal
    e.target.value = ''
  }

  function removeFile(name: string) {
    setSelectedFiles(prev => prev.filter(f => f.name !== name))
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFiles.length || !currentUserId || !request) return
    setUploading(true)
    setUploadError('')
    setUploadProgress(0)

    try {
      const category = inferCategory(request.document_type || '')
      const uploadedIds: string[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const result = await uploadDocument(file, currentUserId, {
          title: file.name.replace(/\.[^.]+$/, ''),
          category,
          notes: request.description || undefined,
        })

        if (!result.success || !result.documentId) {
          setUploadError(`Error al subir "${file.name}": ${result.error || 'error desconocido'}`)
          setUploading(false)
          return
        }

        uploadedIds.push(result.documentId)

        // Share each document with the doctor
        await (supabase.from('document_shares') as any).insert({
          document_id: result.documentId,
          shared_with: request.doctor_id,
          shared_by: currentUserId,
        })

        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100))
      }

      // Mark request as fulfilled with the first document
      await fulfillDocumentRequest(token!, currentUserId, uploadedIds[0])

      setStep('done')
    } catch (err) {
      logger.error('solicitudDocumento:upload', err)
      setUploadError('Error inesperado al subir los documentos')
    } finally {
      setUploading(false)
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    )
  }

  // ─── Invalid / Expired / Already fulfilled ────────────────────────────────
  if (step === 'invalid' || step === 'expired' || step === 'fulfilled') {
    const msgs: Record<string, { icon: React.ReactNode; title: string; body: string }> = {
      invalid: {
        icon: <AlertCircle size={48} className="text-red-400" />,
        title: 'Enlace inválido',
        body: 'Este enlace no existe o ya no es válido.',
      },
      expired: {
        icon: <AlertCircle size={48} className="text-yellow-400" />,
        title: 'Enlace expirado',
        body: 'Este enlace ya no está activo. Pide a tu médico que genere uno nuevo.',
      },
      fulfilled: {
        icon: <CheckCircle2 size={48} className="text-green-400" />,
        title: 'Documento ya enviado',
        body: 'Este documento ya fue subido con éxito. No es necesario hacer nada más.',
      },
    }
    const m = msgs[step]
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">{m.icon}</div>
          <h1 className="text-xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-gray-500">{m.body}</p>
          <Link to="/" className="inline-block mt-2 text-primary font-medium hover:underline">
            Ir al inicio
          </Link>
        </div>
      </div>
    )
  }

  const doctorName = request?.doctor?.full_name || 'Tu médico'
  const specialty = request?.doctor?.doctor_profiles?.specialty || ''
  const clinic = request?.doctor?.doctor_profiles?.clinic_name || ''
  const docTypeLabel = request?.document_type || 'Documento médico'

  // ─── Shared header card ───────────────────────────────────────────────────
  const RequestCard = () => (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-start">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Stethoscope size={20} className="text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{doctorName}</p>
        {(specialty || clinic) && (
          <p className="text-xs text-gray-500">{[specialty, clinic].filter(Boolean).join(' · ')}</p>
        )}
        <p className="text-xs text-gray-600 mt-1">
          Solicita: <span className="font-medium">{docTypeLabel}</span>
        </p>
        {request?.description && (
          <p className="text-xs text-gray-500 mt-0.5 italic">"{request.description}"</p>
        )}
      </div>
    </div>
  )

  // ─── Auth step ────────────────────────────────────────────────────────────
  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md w-full space-y-5">
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-primary">Healthpal.mx</h1>
            <p className="text-sm text-gray-500 mt-1">Tu expediente médico digital</p>
          </div>

          <RequestCard />

          {wrongSession && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Esta solicitud es para <strong>{request?.patient_email}</strong>. Inicia sesión con esa cuenta o crea una nueva.
              </p>
            </div>
          )}

          <div className="text-center">
            <div className="flex items-center gap-2 justify-center text-gray-700">
              <Lock size={16} />
              <span className="text-sm font-medium">
                {authMode === 'register'
                  ? 'Crea tu cuenta gratuita para subir el documento'
                  : 'Inicia sesión para subir el documento'}
              </span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === 'register' && (
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {authLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {authMode === 'register' ? 'Crear cuenta y continuar' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            Tu información está protegida y solo será compartida con tu médico.
          </p>
        </div>
      </div>
    )
  }

  // ─── Upload step ──────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md w-full space-y-5">
          <div className="text-center">
            <h1 className="text-xl font-bold text-primary">Healthpal.mx</h1>
          </div>

          <RequestCard />

          <form onSubmit={handleUpload} className="space-y-4">
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-gray-50 rounded-xl p-5 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx"
                onChange={handleFileChange}
              />
              <Upload size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                {selectedFiles.length ? 'Agregar más archivos' : 'Selecciona uno o más documentos'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, imagen o Word · Máx 10 MB por archivo</p>
            </div>

            {/* File list */}
            {selectedFiles.length > 0 && (
              <ul className="space-y-2">
                {selectedFiles.map(f => (
                  <li key={f.name} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <FileText size={16} className="text-primary shrink-0" />
                    <span className="text-xs font-medium text-gray-800 flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    {!uploading && (
                      <button type="button" onClick={() => removeFile(f.name)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Progress bar while uploading */}
            {uploading && selectedFiles.length > 1 && (
              <div className="space-y-1">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-gray-500 text-center">{uploadProgress}% completado</p>
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {uploadError}
              </p>
            )}

            <button
              type="submit"
              disabled={!selectedFiles.length || uploading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading
                ? `Subiendo${selectedFiles.length > 1 ? ` (${uploadProgress}%)` : ''}…`
                : `Enviar ${selectedFiles.length > 1 ? `${selectedFiles.length} documentos` : 'documento'}`}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            El documento se guardará en tu expediente y será compartido con tu médico.
          </p>
        </div>
      </div>
    )
  }

  // ─── Done ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
        <CheckCircle2 size={56} className="mx-auto text-green-500" />
        <h1 className="text-xl font-bold text-gray-900">¡Documento enviado!</h1>
        <p className="text-gray-500 text-sm">
          {selectedFiles.length > 1
            ? `Tus ${selectedFiles.length} documentos fueron subidos con éxito`
            : 'Tu documento fue subido con éxito'} y están disponibles para <strong>{doctorName}</strong>.
          También quedaron guardados en tu expediente personal.
        </p>
        <button
          onClick={() => navigate(isNewAccount ? '/dashboard' : '/dashboard/documentos')}
          className="mt-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {isNewAccount ? 'Completar mi perfil' : 'Ver mis documentos'}
        </button>
      </div>
    </div>
  )
}
