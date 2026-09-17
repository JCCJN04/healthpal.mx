import { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, CalendarClock, Loader2 } from 'lucide-react'
import { logger } from '@/shared/lib/logger'
import { SpotlightCard } from '@/shared/components/ui/SpotlightCard'

interface Preferences {
  emailNotifications: boolean
  whatsappNotifications: boolean
  appointmentReminders: boolean
}

interface PreferencesCardProps {
  initialPreferences: Preferences
  onSave: (preferences: Preferences) => Promise<void>
  isLoading?: boolean
}

const PreferencesCard = ({
  initialPreferences,
  onSave,
  isLoading = false,
}: PreferencesCardProps) => {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [updatingKey, setUpdatingKey] = useState<keyof Preferences | null>(null)

  useEffect(() => {
    setPreferences(initialPreferences)
  }, [initialPreferences])

  const handleToggle = async (key: keyof Preferences) => {
    const newValue = !preferences[key]
    const oldPreferences = { ...preferences }

    setPreferences({
      ...preferences,
      [key]: newValue,
    })

    setUpdatingKey(key)

    try {
      await onSave({
        ...preferences,
        [key]: newValue,
      })
    } catch (error) {
      logger.error('PreferencesCard.toggle', error)
      setPreferences(oldPreferences)
    } finally {
      setUpdatingKey(null)
    }
  }

  const Toggle = ({
    enabled,
    onChange,
    isUpdating,
  }: {
    enabled: boolean
    onChange: () => void
    isUpdating?: boolean
  }) => (
    <button
      onClick={onChange}
      disabled={isUpdating}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-[#33C7BE]' : 'bg-gray-200'
      }`}
    >
      {isUpdating ? (
        <Loader2 className="absolute inset-0 m-auto w-3 h-3 text-white animate-spin" />
      ) : (
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      )}
    </button>
  )

  return (
    <SpotlightCard
      spotlightColor="rgba(51, 199, 190, 0.15)"
      enableHoverLift={false}
      className="rounded-3xl border border-gray-200/80 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100/70 flex items-center justify-center text-[#33C7BE]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Preferencias de Notificaciones</h3>
            <p className="text-xs text-gray-500">
              Elige los canales y avisos que deseas recibir de HealthPal
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 divide-y divide-gray-100">
        {isLoading ? (
          <div className="space-y-4 py-2">
            <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* WhatsApp Notifications */}
            <div className="flex items-center justify-between py-4 first:pt-0">
              <div className="flex items-center gap-3.5 flex-1 pr-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-gray-900">Avisos por WhatsApp</h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Confirmaciones directas, solicitudes de documentos y enlaces seguros a tu
                    celular
                  </p>
                </div>
              </div>
              <Toggle
                enabled={preferences.whatsappNotifications}
                onChange={() => handleToggle('whatsappNotifications')}
                isUpdating={updatingKey === 'whatsappNotifications'}
              />
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3.5 flex-1 pr-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Notificaciones por Email</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Recibe recibos, recetas emitidas y resúmenes de actividad en tu bandeja de
                    entrada
                  </p>
                </div>
              </div>
              <Toggle
                enabled={preferences.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
                isUpdating={updatingKey === 'emailNotifications'}
              />
            </div>

            {/* Appointment Reminders */}
            <div className="flex items-center justify-between py-4 last:pb-0">
              <div className="flex items-center gap-3.5 flex-1 pr-4">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5 text-[#33C7BE]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Recordatorios de citas</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Recordatorios preventivos 24 horas y 2 horas antes de cada consulta agendada
                  </p>
                </div>
              </div>
              <Toggle
                enabled={preferences.appointmentReminders}
                onChange={() => handleToggle('appointmentReminders')}
                isUpdating={updatingKey === 'appointmentReminders'}
              />
            </div>
          </>
        )}
      </div>
    </SpotlightCard>
  )
}

export default PreferencesCard
