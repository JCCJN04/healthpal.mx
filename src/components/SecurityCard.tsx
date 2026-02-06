import { useState } from 'react';
import { Shield, Key, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface SecurityCardProps {
  lastPasswordChange?: string;
  onUpdatePassword: (currentPassword: string, newPassword: string) => void;
}

const SecurityCard = ({ lastPasswordChange, onUpdatePassword }: SecurityCardProps) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatLastChange = (dateString?: string): string => {
    if (!dateString) return 'Nunca actualizada';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 30) return `Hace ${diffDays} días`;
    if (diffDays < 60) return 'Hace 1 mes';
    
    const diffMonths = Math.floor(diffDays / 30);
    return `Hace ${diffMonths} meses`;
  };

  const validatePassword = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Ingresa tu contraseña actual';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Ingresa una nueva contraseña';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = 'Debe incluir mayúsculas, minúsculas y números';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu nueva contraseña';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePassword()) {
      onUpdatePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    }
  };

  const handleCancel = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    if (password.length < 8) return { strength: 'Débil', color: 'text-red-600' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 'Media', color: 'text-yellow-600' };
    }
    if (password.length >= 12 && /(?=.*[!@#$%^&*])/.test(password)) {
      return { strength: 'Muy fuerte', color: 'text-green-600' };
    }
    return { strength: 'Fuerte', color: 'text-teal-600' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#33C7BE]" />
            <h3 className="text-lg font-bold text-gray-900">Seguridad</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona la seguridad de tu cuenta
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Password Section */}
          <div className="flex items-start justify-between pb-6 border-b border-gray-100">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-gray-400" />
                <h4 className="font-semibold text-gray-900">Contraseña</h4>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Última actualización: {formatLastChange(lastPasswordChange)}
              </p>
              <p className="text-xs text-gray-500">
                Te recomendamos cambiar tu contraseña cada 3 meses
              </p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
            >
              Actualizar contraseña
            </button>
          </div>

          {/* Future Feature: Session Management */}
          <div className="flex items-start justify-between opacity-60">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-gray-400" />
                <h4 className="font-semibold text-gray-900">Sesiones activas</h4>
              </div>
              <p className="text-sm text-gray-600">
                Cierra sesión en todos los dispositivos excepto este
              </p>
            </div>
            <button
              disabled
              className="px-5 py-2.5 border border-gray-200 text-gray-400 text-sm font-semibold rounded-lg cursor-not-allowed"
            >
              Próximamente
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Actualizar contraseña</h3>
              <p className="text-sm text-gray-600 mt-1">
                Asegúrate de usar una contraseña segura
              </p>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errors.currentPassword) {
                      setErrors((prev) => ({ ...prev, currentPassword: '' }));
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg outline-none transition-colors ${
                    errors.currentPassword
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#33C7BE]'
                  }`}
                  placeholder="••••••••"
                />
                {errors.currentPassword && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) {
                      setErrors((prev) => ({ ...prev, newPassword: '' }));
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg outline-none transition-colors ${
                    errors.newPassword
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#33C7BE]'
                  }`}
                  placeholder="••••••••"
                />
                {passwordStrength.strength && (
                  <p className={`text-xs mt-1 font-medium ${passwordStrength.color}`}>
                    Seguridad: {passwordStrength.strength}
                  </p>
                )}
                {errors.newPassword && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.newPassword}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg outline-none transition-colors ${
                    errors.confirmPassword
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#33C7BE]'
                  }`}
                  placeholder="••••••••"
                />
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Las contraseñas coinciden
                  </p>
                )}
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  Requisitos de contraseña:
                </p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Mínimo 8 caracteres</li>
                  <li>• Al menos una letra mayúscula</li>
                  <li>• Al menos una letra minúscula</li>
                  <li>• Al menos un número</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
                >
                  Actualizar contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SecurityCard;
