import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { supabase } from '@/shared/lib/supabase';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate email
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (resetError) {
        setError(resetError.message || 'Error al enviar el correo de recuperación');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Error al procesar tu solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Correo enviado!
            </h1>
            <p className="text-gray-600">
              Hemos enviado un enlace de recuperación a
            </p>
            <p className="text-[#33C7BE] font-semibold mt-2">{email}</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Si no recibes el correo en unos minutos, revisa tu carpeta de spam o correo no deseado.
            </p>
          </div>

          <Link to="/login">
            <Button variant="primary" fullWidth>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Login
            </Button>
          </Link>

          <button
            onClick={() => setSuccess(false)}
            className="w-full mt-3 text-sm text-gray-600 hover:text-[#33C7BE] transition-colors"
          >
            Enviar a otro correo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F8F9FB] p-8">
        <div className="max-w-md w-full">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#33C7BE] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Volver</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Recuperar contraseña
              </h1>
              <p className="text-gray-600">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="tu@ejemplo.com"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#33C7BE] focus:ring-2 focus:ring-[#33C7BE]/20 transition-colors"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
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
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </Button>
            </form>

            {/* Additional Help */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-center text-gray-600">
                ¿Recordaste tu contraseña?{' '}
                <Link
                  to="/login"
                  className="text-[#33C7BE] font-semibold hover:underline"
                >
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-[#33C7BE] to-teal-600 p-12">
        <div className="h-full flex flex-col justify-center items-center text-white">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6">
              No te preocupes
            </h2>
            <p className="text-xl text-teal-50 leading-relaxed">
              Recuperar tu acceso es fácil. Solo necesitamos verificar tu correo electrónico y podrás establecer una nueva contraseña de forma segura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
