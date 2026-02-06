import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import ProfileCard from '../components/ProfileCard';
import PersonalInfoCard from '../components/PersonalInfoCard';
import SecurityCard from '../components/SecurityCard';
import PreferencesCard from '../components/PreferencesCard';

type TabType = 'general' | 'medical' | 'documents';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Mock user data
  const [userData] = useState({
    name: 'Daniel Vazquez',
    gender: 'Male',
    age: 21,
    location: 'Monterrey, Nuevo León, México',
    avatarUrl: undefined as string | undefined,
  });

  const [personalInfo, setPersonalInfo] = useState({
    fullName: 'Danial Vazquez',
    birthDate: '2005-06-30',
    email: 'Danielvv2005@gmail.com',
    phone: '+52 81 2192 1877',
    bio: 'Estudiante de Licenciatura',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    whatsappNotifications: false,
    appointmentReminders: true,
    appointmentChanges: true,
  });

  const handleEditProfile = () => {
    console.log('Edit profile clicked');
    // Scroll to personal info card
    document.getElementById('personal-info')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChangePhoto = (file: File) => {
    console.log('Photo changed:', file.name);
    // In production, upload to server and update avatarUrl
  };

  const handleSavePersonalInfo = (data: typeof personalInfo) => {
    setPersonalInfo(data);
    console.log('Personal info saved:', data);
    // In production, send to API
  };

  const handleUpdatePassword = (currentPassword: string, newPassword: string) => {
    console.log('Password update requested');
    console.log('Current:', currentPassword.length, 'chars');
    console.log('New:', newPassword.length, 'chars');
    // In production, send to API
  };

  const handleSavePreferences = (newPreferences: typeof preferences) => {
    setPreferences(newPreferences);
    // In production, send to API
  };

  const handleDeleteAccount = () => {
    console.log('Account deletion requested');
    setShowDeleteModal(false);
    // In production, show confirmation and delete account
  };

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
              <ProfileCard
                name={userData.name}
                gender={userData.gender}
                age={userData.age}
                location={userData.location}
                avatarUrl={userData.avatarUrl}
                onEditProfile={handleEditProfile}
                onChangePhoto={handleChangePhoto}
              />

              {/* Personal Information Card */}
              <div id="personal-info">
                <PersonalInfoCard
                  initialData={personalInfo}
                  onSave={handleSavePersonalInfo}
                />
              </div>

              {/* Security Card */}
              <SecurityCard
                lastPasswordChange="2025-11-15"
                onUpdatePassword={handleUpdatePassword}
              />

              {/* Preferences Card */}
              <PreferencesCard
                initialPreferences={preferences}
                onSave={handleSavePreferences}
              />

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
    </DashboardLayout>
  );
}
