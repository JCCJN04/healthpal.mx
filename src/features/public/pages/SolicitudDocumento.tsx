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
import { validateFile } from '@/shared/lib/errors'
import { logger } from '@/shared/lib/logger'
import type { DocumentRequestWithDoctor } from '@/shared/lib/queries/documentRequests'

const DOC_TYPE_LABELS: Record<string, string> = {
  radiology: 'Radiología / Imagen',
  prescription: 'Receta médica',
  history: 'Historial médico',
  lab: 'Resultados de laboratorio',
  insurance: 'Seguro médico',
  other: 'Documento médico',
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docTitle, setDocTitle] = useState('')
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

    // Check if user is already logged in
    const { data: session } = await supabase.auth.getSession()
    if (session.session?.user) {
      setCurrentUserId(session.session.user.id)
      setStep('upload')
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
        setCurrentUserId(data.user.id)

        // Wait a moment for the profile trigger to run
        await new Promise(r => setTimeout(r, 1500))
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
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validateFile(file, 'document')
    if (validationError) { setUploadError(validationError); return }
    setSelectedFile(file)
    setUploadError('')
    if (!docTitle) setDocTitle(file.name.replace(/\.[^.]+$/, ''))
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !currentUserId || !request) return
    setUploading(true)
    setUploadError('')

    try {
      const category = (request.document_type as any) || 'other'
      const result = await uploadDocument(selectedFile, currentUserId, {
        title: docTitle || selectedFile.name,
        category,
        notes: request.description || undefined,
      })

      if (!result.success || !result.documentId) {
        setUploadError(result.error || 'Error al subir el documento')
        return
      }

      // Share document with the doctor
      await (supabase.from('document_shares') as any).insert({
        document_id: result.documentId,
        shared_with: request.doctor_id,
        shared_by: currentUserId,
      })

      // Mark request as fulfilled
      await fulfillDocumentRequest(token!, currentUserId, result.documentId)

      setStep('done')
    } catch (err) {
      logger.error('solicitudDocumento:upload', err)
      setUploadError('Error inesperado al subir el documento')
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
  const docTypeLabel = DOC_TYPE_LABELS[request?.document_type || 'other'] || 'Documento médico'

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

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
            <button
              className={`flex-1 py-2 transition-colors ${authMode === 'register' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setAuthMode('register')}
            >
              Crear cuenta
            </button>
            <button
              className={`flex-1 py-2 transition-colors ${authMode === 'login' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setAuthMode('login')}
            >
              Ya tengo cuenta
            </button>
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
            {/* File drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                selectedFile ? 'border-primary/50 bg-primary/5' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="space-y-1">
                  <FileText size={32} className="mx-auto text-primary" />
                  <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="text-xs text-primary">Clic para cambiar el archivo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload size={32} className="mx-auto text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">Selecciona tu documento</p>
                  <p className="text-xs text-gray-400">PDF, imagen o Word · Máx 10 MB</p>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del documento</label>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="Ej. Radiografía de tórax"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {uploadError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {uploadError}
              </p>
            )}

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Subiendo documento...' : 'Enviar documento'}
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
          Tu documento fue subido con éxito y está disponible para <strong>{doctorName}</strong>.
          También quedó guardado en tu expediente personal.
        </p>
        <button
          onClick={() => navigate('/dashboard/documentos')}
          className="mt-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Ver mis documentos
        </button>
      </div>
    </div>
  )
}
