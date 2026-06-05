import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, FileText, Heart, Mail, ExternalLink, CheckCircle2 } from 'lucide-react'
import OnboardingLayout from './OnboardingLayout'
import Stepper from '@/shared/components/ui/Stepper'
import Button from '@/shared/components/ui/Button'
import { saveLegalConsent } from '@/shared/lib/queries/legalConsents'
import { saveOnboardingStep } from '@/shared/lib/queries/profile'
import { useAuth } from '@/app/providers/AuthContext'
import { showToast } from '@/shared/components/ui/Toast'
import { logger } from '@/shared/lib/logger'

const STEPS = ['Rol', 'Información', 'Contacto', 'Detalles', 'Legal', 'Listo']

interface ConsentState {
    terms: boolean
    privacy: boolean
    medical: boolean
    marketing: boolean
}

const CONSENTS = [
    {
        key: 'terms' as const,
        required: true,
        icon: FileText,
        title: 'Términos y Condiciones',
        description: 'He leído y acepto los Términos y Condiciones de uso de Healthpal.mx.',
        link: '/legal',
        linkLabel: 'Leer términos',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
    },
    {
        key: 'privacy' as const,
        required: true,
        icon: Shield,
        title: 'Aviso de Privacidad',
        description: 'He leído y acepto el Aviso de Privacidad. Consiento el tratamiento de mis datos personales conforme a la LFPDPPP.',
        link: '/privacidad',
        linkLabel: 'Leer aviso',
        color: 'text-teal-600',
        bg: 'bg-teal-50',
    },
    {
        key: 'medical' as const,
        required: true,
        icon: Heart,
        title: 'Tratamiento de datos de salud',
        description: 'Consiento expresamente el tratamiento de mis datos sensibles de salud (expedientes, estudios, diagnósticos) por Healthpal.mx, conforme al Art. 9 de la LFPDPPP.',
        link: '/privacidad#datos-sensibles',
        linkLabel: 'Ver detalles',
        color: 'text-red-500',
        bg: 'bg-red-50',
    },
    {
        key: 'marketing' as const,
        required: false,
        icon: Mail,
        title: 'Comunicaciones y novedades',
        description: 'Acepto recibir correos sobre actualizaciones, nuevas funciones y comunicados de Healthpal.mx. Puedes darte de baja en cualquier momento.',
        link: null,
        linkLabel: null,
        color: 'text-purple-500',
        bg: 'bg-purple-50',
    },
]

export default function OnboardingLegal() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [consent, setConsent] = useState<ConsentState>({
        terms: false,
        privacy: false,
        medical: false,
        marketing: false,
    })
    const [loading, setLoading] = useState(false)

    const requiredAccepted = consent.terms && consent.privacy && consent.medical

    const toggle = (key: keyof ConsentState) =>
        setConsent(prev => ({ ...prev, [key]: !prev[key] }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!requiredAccepted) {
            showToast('Debes aceptar los tres consentimientos obligatorios', 'error')
            return
        }
        if (!user) return

        setLoading(true)
        try {
            await saveLegalConsent(user.id, {
                terms_accepted: consent.terms,
                privacy_accepted: consent.privacy,
                medical_data_consent: consent.medical,
                marketing_consent: consent.marketing,
            })
            await saveOnboardingStep('done')
            await new Promise(r => setTimeout(r, 50))
            navigate('/onboarding/done')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            logger.error('OnboardingLegal.submit', error)
            showToast(error?.message || 'Error al guardar consentimientos', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <OnboardingLayout
            title="Consentimientos legales"
            description="Revisa y acepta los términos antes de continuar. Los marcados con * son obligatorios."
        >
            <Stepper currentStep={5} totalSteps={6} steps={STEPS} />

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                {CONSENTS.map(({ key, required, icon: Icon, title, description, link, linkLabel, color, bg }) => {
                    const checked = consent[key]
                    return (
                        <label
                            key={key}
                            className={`flex gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                checked
                                    ? 'border-[#33C7BE] bg-[#33C7BE]/5'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                        >
                            {/* Checkbox */}
                            <div className="flex-shrink-0 mt-0.5">
                                <div
                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                        checked
                                            ? 'bg-[#33C7BE] border-[#33C7BE]'
                                            : 'border-gray-300 bg-white'
                                    }`}
                                >
                                    {checked && <CheckCircle2 size={13} className="text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(key)}
                                    className="sr-only"
                                />
                            </div>

                            {/* Icon */}
                            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon size={18} className={color} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-sm font-bold text-gray-900">{title}</span>
                                    {required && (
                                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                                            Obligatorio
                                        </span>
                                    )}
                                    {!required && (
                                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                            Opcional
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
                                {link && linkLabel && (
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className={`inline-flex items-center gap-1 mt-1.5 text-xs font-semibold ${color} hover:underline`}
                                    >
                                        <ExternalLink size={11} />
                                        {linkLabel}
                                    </a>
                                )}
                            </div>
                        </label>
                    )
                })}

                {/* Summary notice */}
                <p className="text-[11px] text-gray-400 text-center px-2">
                    Al continuar confirmas que leíste y comprendes los documentos.
                </p>

                <div className="flex justify-between items-center pt-2">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        ← Atrás
                    </button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={!requiredAccepted || loading}
                    >
                        {loading ? 'Guardando...' : 'Aceptar y continuar'}
                    </Button>
                </div>
            </form>
        </OnboardingLayout>
    )
}
