import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getMyProfile, updateMyProfile } from '../lib/queries/profile';
import { getMySettings, updateMySettings } from '../lib/queries/settings';
import DashboardLayout from '../components/DashboardLayout';
import ProfileCard from '../components/ProfileCard';
import PersonalInfoCard from '../components/PersonalInfoCard';
import SecurityCard from '../components/SecurityCard';
import PreferencesCard from '../components/PreferencesCard';

type TabType = 'general' | 'medical' | 'documents';

export default function Configuracion() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  // Profile data
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  
  // Error states
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoadingProfile(true);
        const profileData = await getMyProfile();
        setProfile(profileData);
      } catch (error: any) {
        console.error('Error loading profile:', error);
        setProfileError(error.message || 'Error al cargar perfil');
      } finally {
        setIsLoadingProfile(false);
      }
    }

    if (user) {
      loadProfile();
    }
  }, [user]);

  // Fetch settings
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoadingSettings(true);
        const settingsData = await getMySettings();
        setSettings(settingsData);
      } catch (error: any) {
        console.error('Error loading settings:', error);
        // Settings will stay null if there's an error
      } finally {
        setIsLoadingSettings(false);
      }
    }

    if (user) {
      loadSettings();
    }
  }, [user]);

  // Handlers
  const handleEditProfile = () => {
    document.getElementById('personal-info')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChangePhoto = async (file: File) => {
    // TODO: Implement avatar upload to Supabase Storage
    console.log('Photo upload not yet implemented:', file.name);
    setToast({ message: 'Subida de foto: próximamente', type: 'error' });
  };

  const handleSavePersonalInfo = async (data: { fullName: string; birthDate: string; email: string; phone: string; bio: string }) => {
    try {
      setProfileError(null);
      
      // Update profile in Supabase
      const updated = await updateMyProfile({
        full_name: data.fullName,
        birthdate: data.birthDate,
        email: data.email,
        phone: data.phone,
      });
      
      setProfile(updated);
      setToast({ message: '¡Perfil actualizado exitosamente!', type: 'success' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || 'Error al actualizar perfil';
      setProfileError(errorMessage);
      setToast({ message: errorMessage, type: 'error' });
      throw error; // Re-throw so component can handle it
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setToast({ message: '¡Contraseña actualizada exitosamente!', type: 'success' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      const errorMessage = error.message || 'Error al actualizar contraseña';
      setToast({ message: errorMessage, type: 'error' });
      throw error;
    }
  };

  const handleSavePreferences = async (newPreferences: { emailNotifications: boolean; whatsappNotifications: boolean; appointmentReminders: boolean }) => {
    try {
      const updated = await updateMySettings({
        email_notifications: newPreferences.emailNotifications,
        appointment_reminders: newPreferences.appointmentReminders,
        whatsapp_notifications: newPreferences.whatsappNotifications,
      });
      
      setSettings(updated);
      // Don't show toast for preferences - they update optimistically
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    console.log('Account deletion not yet implemented');
    setShowDeleteModal(false);
    setToast({ message: 'Eliminación de cuenta: próximamente', type: 'error' });
  };

  // Calculate age from birthdate
  const calculateAge = (birthdate: string | null): number => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Format sex enum for display
  const formatGender = (sex: string | null): string => {
    if (!sex) return 'No especificado';
    const map: Record<string, string> = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      unspecified: 'No especificado',
    };
    return map[sex] || sex;
  };

  // Prepare display data
  const userData = profile ? {
    name: profile.full_name || 'Usuario',
    gender: formatGender(profile.sex),
    age: calculateAge(profile.birthdate),
    location: 'Monterrey, Nuevo León, México', // TODO: Add location to profile
    avatarUrl: profile.avatar_url || undefined,
  } : null;

  const personalInfo = profile ? {
    fullName: profile.full_name || '',
    birthDate: profile.birthdate || '',
    email: profile.email || '',
    phone: profile.phone || '',
    bio: '', // patients don't have bio in base profile
  } : null;

  const preferences = settings ? {
    emailNotifications: settings.email_notifications,
    whatsappNotifications: settings.whatsapp_notifications,
    appointmentReminders: settings.appointment_reminders,
  } : null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'medical', label: 'Registro médico' },
    { id: 'documents', label: 'Documentos del paciente' },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F8F9FB] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Tu configuración</h1>
            <p className="text-base text-gray-600">
              Administra tu información personal, seguridad y preferencias
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={tab.id !== 'general'}
                  className={`flex-1 px-6 py-3 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#33C7BE] text-white shadow-sm'
                      : tab.id === 'general'
                      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {tab.label}
                  {tab.id !== 'general' && (
                    <span className="ml-2 text-xs opacity-75">(Próximamente)</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Profile Summary Card */}
              {userData && (
                <ProfileCard
                  name={userData.name}
                  gender={userData.gender}
                  age={userData.age}
                  location={userData.location}
                  avatarUrl={userData.avatarUrl}
                  onEditProfile={handleEditProfile}
                  onChangePhoto={handleChangePhoto}
                />
              )}

              {/* Personal Information Card */}
              <div id="personal-info">
                {personalInfo && (
                  <PersonalInfoCard
                    initialData={personalInfo}
                    onSave={handleSavePersonalInfo}
                    isLoading={isLoadingProfile}
                    saveError={profileError}
                  />
                )}
              </div>

              {/* Security Card */}
              <SecurityCard
                lastPasswordChange={undefined} // TODO: Track password changes
                onUpdatePassword={handleUpdatePassword}
              />

              {/* Preferences Card */}
              {preferences && (
                <PreferencesCard
                  initialPreferences={preferences}
                  onSave={handleSavePreferences}
                  isLoading={isLoadingSettings}
                />
              )}

              {/* Danger Zone */}
              <div className="bg-red-50 border-2 border-red-100 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-900 mb-2">Zona sensible</h3>
                    <p className="text-sm text-red-800 mb-4">
                      Estas acciones son permanentes y no se pueden deshacer. Por favor, procede con
                      precaución.
                    </p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-5 py-2.5 border-2 border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar mi cuenta</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-[#33C7BE]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Próximamente</h3>
              <p className="text-gray-600">
                La sección de registro médico estará disponible pronto
              </p>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-[#33C7BE]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Próximamente</h3>
              <p className="text-gray-600">
                La sección de documentos del paciente estará disponible pronto
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                ¿Eliminar tu cuenta?
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Esta acción es permanente. Se eliminarán todos tus datos, citas, documentos e historial
                médico. Esta acción no se puede deshacer.
              </p>

              <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                <p className="text-xs font-semibold text-red-900 mb-2">Se eliminará:</p>
                <ul className="text-xs text-red-800 space-y-1">
                  <li>• Información personal y perfil</li>
                  <li>• Historial de citas médicas</li>
                  <li>• Documentos y archivos subidos</li>
                  <li>• Mensajes y conversaciones</li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-5 py-3 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-5 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`flex-1 text-sm font-medium ${
              toast.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {toast.message}
            </p>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
