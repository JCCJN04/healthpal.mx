import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Calendar, Loader2 } from 'lucide-react';

interface Preferences {
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  appointmentReminders: boolean;
}

interface PreferencesCardProps {
  initialPreferences: Preferences;
  onSave: (preferences: Preferences) => Promise<void>;
  isLoading?: boolean;
}

const PreferencesCard = ({ initialPreferences, onSave, isLoading = false }: PreferencesCardProps) => {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [updatingKey, setUpdatingKey] = useState<keyof Preferences | null>(null);

  // Update local state when initial data changes
  useEffect(() => {
    setPreferences(initialPreferences);
  }, [initialPreferences]);

  const handleToggle = async (key: keyof Preferences) => {
    // Optimistic update
    const newValue = !preferences[key];
    const oldPreferences = { ...preferences };
    
    setPreferences({
      ...preferences,
      [key]: newValue,
    });
    
    setUpdatingKey(key);
    
    try {
      // Save to backend
      await onSave({
        ...preferences,
        [key]: newValue,
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Revert on error
      setPreferences(oldPreferences);
    } finally {
      setUpdatingKey(null);
    }
  };

  const Toggle = ({ enabled, onChange, isUpdating }: { enabled: boolean; onChange: () => void; isUpdating?: boolean }) => (
    <button
      onClick={onChange}
      disabled={isUpdating}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-[#33C7BE]' : 'bg-gray-300'
      }`}
    >
      {isUpdating ? (
        <Loader2 className="absolute inset-0 m-auto w-3 h-3 text-white animate-spin" />
      ) : (
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      )}
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#33C7BE]" />
          <h3 className="text-lg font-bold text-gray-900">Preferencias</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Personaliza cómo y cuándo recibes notificaciones
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-5 animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ) : (
          <>
            {/* Email Notifications */}
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Notificaciones por email</h4>
                  <p className="text-sm text-gray-600">
                    Recibe actualizaciones importantes en tu correo electrónico
                  </p>
                </div>
              </div>
              <Toggle
                enabled={preferences.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
                isUpdating={updatingKey === 'emailNotifications'}
              />
            </div>

            <div className="border-t border-gray-100"></div>

            {/* WhatsApp Notifications - Placeholder */}
            <div className="flex items-start justify-between py-3 opacity-60">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Notificaciones por WhatsApp
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">
                      Próximamente
                    </span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    Mensajes directos con recordatorios y actualizaciones
                  </p>
                </div>
              </div>
              <Toggle
                enabled={preferences.whatsappNotifications}
                onChange={() => {}}
                isUpdating={false}
              />
            </div>

            <div className="border-t border-gray-100"></div>

            {/* Appointment Reminders */}
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Recordatorios de citas</h4>
                  <p className="text-sm text-gray-600">
                    Te avisamos antes de tus citas médicas programadas
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

      {/* Footer Info */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Nota:</span> Las notificaciones críticas relacionadas con tu
          salud siempre serán enviadas, independientemente de tu configuración.
        </p>
      </div>
    </div>
  );
};

export default PreferencesCard;
