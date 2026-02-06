import { useState } from 'react';
import { Edit2, Save, X, Mail, Phone, Calendar, User } from 'lucide-react';

interface PersonalInfo {
  fullName: string;
  birthDate: string;
  email: string;
  phone: string;
  bio: string;
}

interface PersonalInfoCardProps {
  initialData: PersonalInfo;
  onSave: (data: PersonalInfo) => void;
}

const PersonalInfoCard = ({ initialData, onSave }: PersonalInfoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInfo, string>>>({});

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
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

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      setIsEditing(false);
      console.log('Perfil actualizado:', formData);
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

      {/* Content */}
      <div className="p-6">
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
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#33C7BE] focus:bg-white transition-colors text-gray-900 resize-none"
                placeholder="Cuéntanos un poco sobre ti..."
              />
            ) : (
              <p className="text-base text-gray-700">{formData.bio || 'No especificado'}</p>
            )}
          </div>
        </div>

        {/* Action Buttons (only shown when editing) */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Cancelar</span>
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Guardar cambios</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoCard;
