import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, CheckCircle, XCircle, Save, Loader2, Phone, UserCircle2, Plus, X } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { supabase } from '@/shared/lib/supabase';
import { getMyProfile, updateMyProfile, uploadAvatar, deleteMyAccount } from '@/shared/lib/queries/profile';
import { getMySettings, updateMySettings } from '@/shared/lib/queries/settings';
import DashboardLayout from '@/app/layout/DashboardLayout';
import ProfileCard from '@/shared/components/settings/ProfileCard';
import PersonalInfoCard from '@/shared/components/settings/PersonalInfoCard';
import SecurityCard from '@/shared/components/settings/SecurityCard';
import PreferencesCard from '@/shared/components/settings/PreferencesCard';
import { getPatientProfile, upsertPatientProfile } from '@/features/patient/services/patientProfile';
import { getDoctorProfile } from '@/shared/lib/queries/profile';
import DoctorVerificationCard from '@/shared/components/settings/DoctorVerificationCard';
import PatientConsentManager from '@/shared/components/settings/PatientConsentManager'
import GoogleCalendarCard from '@/shared/components/settings/GoogleCalendarCard';
import { countPendingRequests } from '@/shared/lib/queries/consent';
import { getDoctorAssistants, addAssistant, removeAssistant, type DoctorAssistant } from '@/shared/lib/queries/assistants';
import { PatientProfile, DoctorProfile } from '@/shared/types/database';
import { logger } from '@/shared/lib/logger';

type TabType = 'general' | 'documents' | 'permissions' | 'assistants';

export default function Configuracion() {
  const { user, profile: authProfile, refreshProfile, signOut } = useAuth();
  const isPatient = authProfile?.role === 'patient';
  const isDoctor = authProfile?.role === 'doctor';
  const isAssistant = authProfile?.role === 'assistant';
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Profile data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  // Error states
  const [profileError, setProfileError] = useState<string | null>(null);

  // Emergency contact form state
  const [medicalForm, setMedicalForm] = useState({
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [isSavingEmergency, setIsSavingEmergency] = useState(false);

  // Consent pending count (patients only)
  const [pendingConsentCount, setPendingConsentCount] = useState(0);

  // Assistants (doctors only)
  const [assistants, setAssistants] = useState<DoctorAssistant[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [newAssistantEmail, setNewAssistantEmail] = useState('');
  const [addingAssistant, setAddingAssistant] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoadingProfile(true);
        const profileData = await getMyProfile();
        setProfile(profileData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        logger.error('Configuracion:loadProfile', error);
        setProfileError('Error al cargar perfil');
      } finally {
        setIsLoadingProfile(false);
      }
    }

    if (user) {
      loadProfile();
      if (isPatient) {
        loadPatientProfile();
        countPendingRequests(user.id).then(setPendingConsentCount).catch(() => {});
      }
      if (isDoctor) {
        loadDoctorProfile();
        loadAssistants();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAssistants = async () => {
    if (!user) return;
    setAssistantsLoading(true);
    getDoctorAssistants(user.id).then(data => {
      setAssistants(data);
      setAssistantsLoading(false);
    });
  };

  const handleAddAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAssistantEmail.trim()) return;
    setAddingAssistant(true);
    const result = await addAssistant(user.id, newAssistantEmail.trim());
    if (result.ok) {
      setToast({ message: 'Asistente agregado. Se le notificará al aceptar la invitación.', type: 'success' });
      setNewAssistantEmail('');
      loadAssistants();
    } else {
      setToast({ message: result.error ?? 'Error al agregar asistente', type: 'error' });
    }
    setAddingAssistant(false);
  };

  const handleRemoveAssistant = async (id: string) => {
    const result = await removeAssistant(id);
    if (result.ok) {
      setAssistants(prev => prev.filter(a => a.id !== id));
      setToast({ message: 'Asistente eliminado', type: 'success' });
    } else {
      setToast({ message: result.error ?? 'Error al eliminar', type: 'error' });
    }
  };

  // Sync emergency contact form when patient profile loads
  useEffect(() => {
    if (patientProfile) {
      setMedicalForm({
        emergency_contact_name: patientProfile.emergency_contact_name ?? '',
        emergency_contact_phone: patientProfile.emergency_contact_phone ?? '',
      });
    }
  }, [patientProfile]);

  // Fetch patient profile
  async function loadPatientProfile() {
    try {
      if (!user) return;
      const data = await getPatientProfile(user.id);
      setPatientProfile(data);
    } catch (error) {
      logger.error('Configuracion:loadPatientProfile', error);
    }
  }

  // Fetch doctor profile
  async function loadDoctorProfile() {
    try {
      if (!user) return;
      const data = await getDoctorProfile(user.id);
      setDoctorProfile(data as DoctorProfile | null);
    } catch (error) {
      logger.error('Configuracion:loadDoctorProfile', error);
    }
  }

  // Fetch settings
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoadingSettings(true);
        const settingsData = await getMySettings();
        setSettings(settingsData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        logger.error('Configuracion:loadSettings', error);
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

  const handleChangePhoto = async (file: File) => {
    try {
      if (!user) {
        setToast({ message: 'No hay sesión activa', type: 'error' });
        throw new Error('No user session');
      }

      const publicUrl = await uploadAvatar(user.id, file);

      // Update profile with new avatar URL
      const updated = await updateMyProfile({
        avatar_url: publicUrl
      });

      setProfile(updated);
      await refreshProfile(); // Update global context
      setToast({ message: '¡Foto de perfil actualizada!', type: 'success' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Configuracion:uploadPhoto', error);
      setToast({ message: `Error al subir la foto: ${error?.message || 'desconocido'}`, type: 'error' });
      throw error; // Re-throw so ProfileCard can revert the preview
    }
  };

  const handleSavePersonalInfo = async (data: { fullName: string; birthDate: string; email: string; phone: string; bio: string; address: string }) => {
    try {
      setProfileError(null);

      const updated = await updateMyProfile({
        full_name: data.fullName,
        birthdate: data.birthDate,
        email: data.email,
        phone: data.phone,
      });

      // Save address to role-specific profile table
      if (user && isPatient) {
        await upsertPatientProfile(user.id, { address_text: data.address || null });
        setPatientProfile(prev => prev ? { ...prev, address_text: data.address || null } : prev);
      }

      setProfile(updated);
      setToast({ message: '¡Perfil actualizado exitosamente!', type: 'success' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Configuracion:updateProfile', error);
      const errorMessage = 'Error al actualizar el perfil. Intenta nuevamente.';
      setProfileError(errorMessage);
      setToast({ message: errorMessage, type: 'error' });
      throw error;
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setToast({ message: '¡Contraseña actualizada exitosamente!', type: 'success' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Configuracion:updatePassword', error);
      const errorMessage = 'Error al actualizar la contraseña. Intenta nuevamente.';
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Configuracion:updatePreferences', error);
      throw error;
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      await deleteMyAccount();

      setToast({ message: 'Cuenta eliminada exitosamente', type: 'success' });

      // Delay to show toast before signing out and redirecting
      setTimeout(async () => {
        await signOut();
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      logger.error('Configuracion:handleDeleteAccount', error);
      setToast({ message: 'Error al eliminar la cuenta. Intenta nuevamente.', type: 'error' });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSavePatientProfile = async (data: any) => {
    try {
      if (!user) return;

      const updated = await upsertPatientProfile(user.id, data);
      setPatientProfile(updated);
      setToast({ message: '¡Información médica actualizada!', type: 'success' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Configuracion:savePatientProfile', error);
      setToast({ message: 'Error al guardar la información médica. Intenta nuevamente.', type: 'error' });
      throw error;
    }
  };

  const handleSaveEmergency = async () => {
    if (medicalForm.emergency_contact_phone && !validatePhone(medicalForm.emergency_contact_phone)) {
      setToast({ message: 'Teléfono de contacto inválido (10–15 dígitos)', type: 'error' });
      return;
    }
    try {
      setIsSavingEmergency(true);
      await handleSavePatientProfile({
        emergency_contact_name: medicalForm.emergency_contact_name || null,
        emergency_contact_phone: medicalForm.emergency_contact_phone || null,
      });
    } finally {
      setIsSavingEmergency(false);
    }
  };

  // Validates a phone string: strips formatting, expects 10–15 digits
  const validatePhone = (val: string): boolean => {
    if (!val) return true; // optional field
    const digits = val.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };

  // Sanitizes phone input: only allow +, digits, spaces, dashes, parens
  const sanitizePhone = (val: string): string =>
    val.replace(/[^\d+\s\-()]/g, '').slice(0, 20);

  // Calculate age from birthdate
  const calculateAge = (birthdate: string | null): number => {
    if (!birthdate) return 0;
    const today = new Date();
    const [year, month, day] = birthdate.split('-').map(Number);
    const birth = new Date(year, month - 1, day);

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
    location: isDoctor
      ? (doctorProfile?.address_text || '')
      : (patientProfile?.address_text || ''),
    avatarUrl: profile.avatar_url || undefined,
  } : null;

  const personalInfo = profile ? {
    fullName: profile.full_name || '',
    birthDate: profile.birthdate || '',
    email: profile.email || '',
    phone: profile.phone || '',
    bio: '',
    address: isPatient
      ? (patientProfile?.address_text || '')
      : (doctorProfile?.address_text || ''),
  } : null;

  const preferences = settings ? {
    emailNotifications: settings.email_notifications,
    whatsappNotifications: settings.whatsapp_notifications,
    appointmentReminders: settings.appointment_reminders,
  } : null;

  const tabs: { id: TabType; label: string; enabled: boolean; badge?: number }[] = isPatient
    ? [
        { id: 'general', label: 'General', enabled: true },
        { id: 'permissions', label: 'Permisos', enabled: true, badge: pendingConsentCount },
        { id: 'documents', label: 'Documentos del paciente', enabled: false },
      ]
    : isDoctor
    ? [
        { id: 'general',    label: 'General',    enabled: true },
        { id: 'assistants', label: 'Asistentes', enabled: true },
      ]
    : [
        { id: 'general', label: 'General', enabled: true },
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 overflow-x-auto">
            <div className="flex min-w-max gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!tab.enabled}
                  className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.id
                    ? 'bg-[#33C7BE] text-white shadow-sm'
                    : tab.enabled
                      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {tab.label}
                  {!tab.enabled && (
                    <span className="ml-2 text-xs opacity-75">(Próximamente)</span>
                  )}
                  {tab.badge && tab.badge > 0 ? (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                      {tab.badge}
                    </span>
                  ) : null}
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
                  onChangePhoto={handleChangePhoto}
                  onValidationError={(msg) => setToast({ message: msg, type: 'error' })}
                />
              )}

              {/* Doctor Verification Card — only shown to doctors */}
              {isDoctor && (
                <DoctorVerificationCard
                  doctorProfile={doctorProfile}
                  userId={user?.id ?? ''}
                  isLoading={isLoadingProfile}
                  onSaved={(updated) => {
                    setDoctorProfile(updated);
                    setToast({ message: '¡Perfil médico actualizado!', type: 'success' });
                  }}
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

              {/* Emergency Contact — patients only */}
              {isPatient && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Contacto de emergencia</h3>
                      <p className="text-xs text-gray-500">Persona a contactar en caso de urgencia</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nombre completo</label>
                      <input
                        type="text"
                        value={medicalForm.emergency_contact_name}
                        onChange={e => setMedicalForm(f => ({ ...f, emergency_contact_name: e.target.value }))}
                        placeholder="Nombre del contacto"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Teléfono</label>
                      <input
                        type="tel"
                        value={medicalForm.emergency_contact_phone}
                        onChange={e => setMedicalForm(f => ({ ...f, emergency_contact_phone: sanitizePhone(e.target.value) }))}
                        placeholder="55 1234 5678"
                        maxLength={20}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33C7BE]/40 focus:border-[#33C7BE] ${medicalForm.emergency_contact_phone && !validatePhone(medicalForm.emergency_contact_phone) ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {medicalForm.emergency_contact_phone && !validatePhone(medicalForm.emergency_contact_phone) && (
                        <p className="text-[11px] text-red-500 mt-1">Debe tener 10–15 dígitos</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleSaveEmergency}
                      disabled={isSavingEmergency || (!!medicalForm.emergency_contact_phone && !validatePhone(medicalForm.emergency_contact_phone))}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-[#2ab5ac] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSavingEmergency ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><Save className="w-4 h-4" />Guardar</>}
                    </button>
                  </div>
                </div>
              )}

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

              {/* Google Calendar Integration — doctors only */}
              {isDoctor && (
                <GoogleCalendarCard
                  onToast={(msg, type) => setToast({ message: msg, type })}
                />
              )}

              {/* Danger Zone */}
              {!isAssistant && <div className="bg-red-50 border-2 border-red-100 rounded-xl p-6">
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
              </div>}
            </div>
          )}

          {activeTab === 'permissions' && isPatient && (
            <PatientConsentManager />
          )}

          {activeTab === 'assistants' && isDoctor && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Asistentes</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Tus asistentes solo pueden ver y gestionar tu agenda. No tienen acceso a información clínica ni documentos de pacientes.
                </p>

                {/* Add assistant form */}
                <form onSubmit={handleAddAssistant} className="flex gap-3 mb-6">
                  <input
                    type="email"
                    placeholder="Correo del asistente"
                    value={newAssistantEmail}
                    onChange={e => setNewAssistantEmail(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    required
                  />
                  <button
                    type="submit"
                    disabled={addingAssistant || !newAssistantEmail.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {addingAssistant ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Agregar
                  </button>
                </form>

                {/* Assistants list */}
                {assistantsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-gray-400" />
                  </div>
                ) : assistants.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <UserCircle2 size={32} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">Aún no tienes asistentes registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assistants.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {a.assistant?.avatar_url
                            ? <img src={a.assistant.avatar_url} className="w-9 h-9 object-cover" />
                            : <UserCircle2 size={18} className="text-gray-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {a.assistant?.full_name ?? a.assistant_email}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{a.assistant_email}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                          a.status === 'active'    ? 'bg-green-50 text-green-600 border-green-100' :
                          a.status === 'pending'   ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                     'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {a.status === 'active' ? 'Activo' : a.status === 'pending' ? 'Pendiente' : 'Suspendido'}
                        </span>
                        <button
                          onClick={() => handleRemoveAssistant(a.id)}
                          title="Eliminar asistente"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  disabled={isDeletingAccount}
                  className="flex-1 px-5 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeletingAccount ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    'Sí, eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] ${toast.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
            }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`flex-1 text-sm font-medium ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'
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
