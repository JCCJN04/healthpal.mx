import { useState, useEffect } from 'react';
import { Edit2, Save, X, Mail, Phone, Calendar, User, MapPin, Loader2, CreditCard } from 'lucide-react';
import { logger } from '@/shared/lib/logger';
import { validateCurp, normalizeCurp, INEGI_STATES } from '@/shared/lib/curp';

interface PersonalInfo {
  fullName: string;
  birthDate: string;
  email: string;
  phone: string;
  bio: string;
  address: string;
  primerApellido: string;
  segundoApellido: string;
  estadoNacimiento: string;
  curp: string;
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

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const [year, month, day] = birthDate.split('-').map(Number);
    const birth = new Date(year, month - 1, day);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PersonalInfo, string>> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'El nombre es requerido';
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
    if (!formData.birthDate) newErrors.birthDate = 'La fecha de nacimiento es requerida';

    // CURP optional but validated if provided
    if (formData.curp.trim()) {
      const curpResult = validateCurp(formData.curp.trim())
      if (!curpResult.valid) newErrors.curp = curpResult.error
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validateForm()) {
      setIsSaving(true);
      try {
        const normalized = {
          ...formData,
          curp: normalizeCurp(formData.curp) ?? '',
        }
        await onSave(normalized);
        setIsEditing(false);
      } catch (error) {
        logger.error('PersonalInfoCard.save', error);
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
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const age = calculateAge(formData.birthDate);

  const estadoLabel = INEGI_STATES.find(s => s.code === formData.estadoNacimiento)?.name ?? '';

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
        {saveError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {saveError}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primer apellido */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Primer apellido
              </label>
              {isEditing ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#33C7BE] focus-within:bg-white transition-colors">
                  <User className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.primerApellido}
                    onChange={(e) => handleChange('primerApellido', e.target.value)}
                    className="flex-1 bg-transparent outline-none text-gray-900"
                    placeholder="Primer apellido"
                  />
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">
                  {formData.primerApellido || <span className="text-gray-400 font-normal italic">No especificado</span>}
                </p>
              )}
            </div>

            {/* Segundo apellido */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Segundo apellido
              </label>
              {isEditing ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#33C7BE] focus-within:bg-white transition-colors">
                  <User className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.segundoApellido}
                    onChange={(e) => handleChange('segundoApellido', e.target.value)}
                    className="flex-1 bg-transparent outline-none text-gray-900"
                    placeholder="Segundo apellido (opcional)"
                  />
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">
                  {formData.segundoApellido || <span className="text-gray-400 font-normal italic">No especificado</span>}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Nombre(s)
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
                      placeholder="Nombre(s)"
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
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
                  {errors.birthDate && <p className="text-xs text-red-600 mt-1">{errors.birthDate}</p>}
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">{formatDate(formData.birthDate)}</p>
              )}
            </div>

            {/* Age (read-only) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Edad
              </label>
              <p className="text-base font-semibold text-gray-900">{age} años</p>
            </div>

            {/* Estado de nacimiento */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Estado de nacimiento
              </label>
              {isEditing ? (
                <select
                  value={formData.estadoNacimiento}
                  onChange={(e) => handleChange('estadoNacimiento', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#33C7BE] focus:bg-white transition-colors outline-none text-gray-900 appearance-none"
                >
                  <option value="">Selecciona un estado</option>
                  {INEGI_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-base font-semibold text-gray-900">
                  {estadoLabel || <span className="text-gray-400 font-normal italic">No especificado</span>}
                </p>
              )}
            </div>

            {/* CURP */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                CURP
              </label>
              {isEditing ? (
                <div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#33C7BE] focus-within:bg-white transition-colors">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.curp}
                      onChange={(e) => handleChange('curp', e.target.value.toUpperCase())}
                      className="flex-1 bg-transparent outline-none text-gray-900 font-mono tracking-wider"
                      placeholder="18 caracteres — ej. ABCD800101HMCXYZ01"
                      maxLength={18}
                    />
                  </div>
                  {errors.curp && <p className="text-xs text-red-600 mt-1">{errors.curp}</p>}
                  <p className="text-xs text-gray-400 mt-1">Opcional. Puedes consultarla en renapo.gob.mx</p>
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900 font-mono tracking-wider">
                  {formData.curp || <span className="text-gray-400 font-normal font-sans tracking-normal italic">No registrada</span>}
                </p>
              )}
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
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
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
                      placeholder="+52 00 0000 0000"
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">{formData.phone}</p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Dirección
              </label>
              {isEditing ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#33C7BE] focus-within:bg-white transition-colors">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="flex-1 bg-transparent outline-none text-gray-900"
                    placeholder="Calle, colonia, ciudad"
                  />
                </div>
              ) : (
                <p className="text-base font-semibold text-gray-900">
                  {formData.address || <span className="text-gray-400 font-normal italic">No especificada</span>}
                </p>
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
                  {formData.bio || 'No hay descripción disponible.'}
                </p>
              )}
            </div>
          </div>
        )}

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
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></>
              ) : (
                <><Save className="w-4 h-4" /><span>Guardar cambios</span></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoCard;
