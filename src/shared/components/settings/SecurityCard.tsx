import { useState } from 'react';
import { Shield, Key, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface SecurityCardProps {
  lastPasswordChange?: string;
  onUpdatePassword: (newPassword: string) => Promise<void>;
}

const SecurityCard = ({ lastPasswordChange, onUpdatePassword }: SecurityCardProps) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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

    if (!newPassword) {
      newErrors.newPassword = 'Ingresa una nueva contraseña';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu nueva contraseña';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePassword()) {
      setIsUpdating(true);
      setUpdateError(null);
      try {
        await onUpdatePassword(newPassword);
        setUpdateSuccess(true);
        setTimeout(() => {
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          setErrors({});
          setUpdateSuccess(false);
        }, 2000);
      } catch (error: any) {
        setUpdateError('Error al actualizar la contraseña. Intenta nuevamente.');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleCancel = () => {
    setShowPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    if (password.length < 8) return { strength: 'Débil', color: 'text-red-600' };
    if (password.length >= 12 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) {
      return { strength: 'Muy fuerte', color: 'text-green-600' };
    }
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 'Fuerte', color: 'text-teal-600' };
    }
    return { strength: 'Media', color: 'text-yellow-600' };
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
              {/* Success Message */}
              {updateSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>¡Contraseña actualizada exitosamente!</span>
                </div>
              )}

              {/* Error Message */}
              {updateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>{updateError}</span>
                </div>
              )}

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
                    setUpdateError(null);
                  }}
                  disabled={isUpdating || updateSuccess}
                  className={`w-full px-4 py-3 border rounded-lg outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed ${
                    errors.newPassword
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#33C7BE]'
                  }`}
                  placeholder="Mínimo 8 caracteres"
                />
                {errors.newPassword && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.newPassword}
                  </p>
                )}
                {passwordStrength.strength && !errors.newPassword && (
                  <p className={`text-xs mt-1 font-medium ${passwordStrength.color}`}>
                    Seguridad: {passwordStrength.strength}
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
                    setUpdateError(null);
                  }}
                  disabled={isUpdating || updateSuccess}
                  className={`w-full px-4 py-3 border rounded-lg outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed ${
                    errors.confirmPassword
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#33C7BE]'
                  }`}
                  placeholder="Repite tu nueva contraseña"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
                {confirmPassword && newPassword === confirmPassword && !errors.confirmPassword && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Las contraseñas coinciden
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isUpdating || updateSuccess}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || updateSuccess}
                  className="px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : updateSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Actualizada</span>
                    </>
                  ) : (
                    <span>Actualizar contraseña</span>
                  )}
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
