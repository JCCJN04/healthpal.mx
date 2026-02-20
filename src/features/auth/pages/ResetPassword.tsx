import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { supabase } from '@/shared/lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getPasswordStrength = (pwd: string): { strength: string; color: string } => {
    if (pwd.length === 0) return { strength: '', color: '' };
    if (pwd.length < 8) return { strength: 'Débil', color: 'text-red-600' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)) {
      return { strength: 'Media', color: 'text-yellow-600' };
    }
    if (pwd.length >= 12 && /(?=.*[!@#$%^&*])/.test(pwd)) {
      return { strength: 'Muy fuerte', color: 'text-green-600' };
    }
    return { strength: 'Fuerte', color: 'text-teal-600' };
  };

  const validatePassword = (): string | null => {
    if (!password) return 'Por favor ingresa una contraseña';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Debe incluir mayúsculas, minúsculas y números';
    }
    if (!confirmPassword) return 'Por favor confirma tu contraseña';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      if (updateError) {
        setError(updateError.message || 'Error al actualizar la contraseña');
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError('Error al procesar tu solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Contraseña actualizada!
          </h1>
          <p className="text-gray-600 mb-4">
            Tu contraseña se ha actualizado correctamente.
          </p>
          <p className="text-sm text-gray-500">
            Redirigiendo al login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F8F9FB] p-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Nueva contraseña
              </h1>
              <p className="text-gray-600">
                Ingresa tu nueva contraseña. Asegúrate de que sea segura.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#33C7BE] focus:ring-2 focus:ring-[#33C7BE]/20 transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordStrength.strength && (
                  <p className={`text-xs mt-1 font-medium ${passwordStrength.color}`}>
                    Seguridad: {passwordStrength.strength}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#33C7BE] focus:ring-2 focus:ring-[#33C7BE]/20 transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Las contraseñas coinciden
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  Requisitos de contraseña:
                </p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className={password.length >= 8 ? 'text-green-600' : ''}>
                      {password.length >= 8 ? '✓' : '•'}
                    </span>
                    Mínimo 8 caracteres
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                      {/[A-Z]/.test(password) ? '✓' : '•'}
                    </span>
                    Al menos una letra mayúscula
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                      {/[a-z]/.test(password) ? '✓' : '•'}
                    </span>
                    Al menos una letra minúscula
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={/\d/.test(password) ? 'text-green-600' : ''}>
                      {/\d/.test(password) ? '✓' : '•'}
                    </span>
                    Al menos un número
                  </li>
                </ul>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
              >
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-[#33C7BE] to-teal-600 p-12">
        <div className="h-full flex flex-col justify-center items-center text-white">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6">
              Protege tu cuenta
            </h2>
            <p className="text-xl text-teal-50 leading-relaxed">
              Elige una contraseña segura que incluya letras mayúsculas, minúsculas y números para mantener tu información médica protegida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
