import { useState, useEffect } from 'react';
import { Edit2, Save, X, Mail, Phone, Calendar, User, Loader2 } from 'lucide-react';

interface PersonalInfo {
  fullName: string;
  birthDate: string;
  email: string;
  phone: string;
  bio: string;
}

interface PersonalInfoCardProps {
  initialData: PersonalInfo;
  onSave: (data: PersonalInfo) => Promise<void>;
  isLoading?: boolean;
  saveError?: string | null;
}

const PersonalInfoCard = ({ initialData, onSave, isLoading = false, saveError = null }: PersonalInfoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInfo, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Update form data when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    // Parse "YYYY-MM-DD" manually to avoid UTC conversion
    const [year, month, day] = birthDate.split('-').map(Number);
    const birth = new Date(year, month - 1, day); // Local time constructor

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PersonalInfo, string>> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\+?[\d\s-]+$/.test(formData.phone)) {
      newErrors.phone = 'Teléfono inválido';
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'La fecha de nacimiento es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validateForm()) {
      setIsSaving(true);
      try {
        await onSave(formData);
        setIsEditing(false);
      } catch (error) {
        console.error('Error saving profile:', error);
        // Error is handled by parent component
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData(initialData);
    setErrors({});
    setIsEditing(false);
  };

  const handleChange = (field: keyof PersonalInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const age = calculateAge(formData.birthDate);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Información personal</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#33C7BE] hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Editar información</span>
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Show error message if save failed */}
        {saveError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* Show loading skeleton */}
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Nombre completo
              </label>
              {isEditing ? (
                <div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#33C7BE] focus-within:bg-white transition-colors">
                    <User className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      className="flex-1 bg-transparent outline-none text-gray-900"
                      placeholder="Nombre completo"
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
                  )}
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">{formData.fullName}</p>
              )}
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Fecha de nacimiento
              </label>
              {isEditing ? (
                <div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#33C7BE] focus-within:bg-white transition-colors">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleChange('birthDate', e.target.value)}
                      className="flex-1 bg-transparent outline-none text-gray-900"
                    />
                  </div>
                  {errors.birthDate && (
                    <p className="text-xs text-red-600 mt-1">{errors.birthDate}</p>
                  )}
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">
                  {formatDate(formData.birthDate)}
                </p>
              )}
            </div>

            {/* Age (derived, always read-only) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Edad
              </label>
              <p className="text-base font-semibold text-gray-900">{age} años</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Correo electrónico
              </label>
              {isEditing ? (
                <div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#33C7BE] focus-within:bg-white transition-colors">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="flex-1 bg-transparent outline-none text-gray-900"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">{formData.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Número telefónico
              </label>
              {isEditing ? (
                <div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#33C7BE] focus-within:bg-white transition-colors">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="flex-1 bg-transparent outline-none text-gray-900"
                      placeholder="+52 81 2192 1877"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">{formData.phone}</p>
              )}
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Bio / Descripción
              </label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  disabled={isSaving}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#33C7BE] focus:bg-white transition-colors outline-none resize-none min-h-[100px] text-gray-900"
                  placeholder="Cuéntanos un poco sobre ti..."
                />
              ) : (
                <p className="text-base text-gray-700 leading-relaxed">
                  {formData.bio || "No hay descripción disponible."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Edit Actions */}
        {isEditing && (
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              <span>Cancelar</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoCard;
