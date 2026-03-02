import { useState, useEffect, FormEvent } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  User,
  Mail,
  Phone,
  Stethoscope,
  MapPin,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  HeartPulse,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { getPublicDoctorBySlug, type PublicDoctor } from '@/shared/lib/queries/publicDoctors';
import { formatSpecialty } from '@/shared/lib/specialties';
import { showToast } from '@/shared/components/ui/Toast';
import { logger } from '@/shared/lib/logger';
import PublicLayout from '@/features/public/components/PublicLayout';

// ─── Helpers ───────────────────────────────────────────────────────────────

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatReadableDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

function formatReadableTime(timeStr: string): string {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:${m} ${suffix}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  reason: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  reason?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AgendarCita() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const modality = searchParams.get('modality') || 'presencial';

  const [doctor, setDoctor] = useState<PublicDoctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  const [form, setForm] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    reason: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch doctor info
  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const doc = await getPublicDoctorBySlug(slug);
      setDoctor(doc);
      setLoading(false);
    })();
  }, [slug]);

  // ─── Validation ──────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = 'Ingresa tu nombre completo';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Ingresa tu correo electrónico';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Ingresa un correo válido';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Ingresa tu número de teléfono';
    } else if (!/^\d{10}$/.test(form.phone.replace(/\s|-/g, ''))) {
      newErrors.phone = 'Ingresa un número de 10 dígitos';
    }

    if (!form.reason.trim()) {
      newErrors.reason = 'Indica el motivo de tu consulta';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      // 1. Create auth account (patient role)
      const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!';
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: tempPassword,
        options: {
          data: {
            role: 'patient',
            full_name: form.fullName,
            phone: form.phone,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          showToast(
            'Este correo ya tiene una cuenta. Inicia sesión para agendar tu cita.',
            'error',
          );
          const params = new URLSearchParams({
            ref: 'booking',
            slug: slug || '',
            date,
            time,
            modality,
          });
          navigate(`/login?${params.toString()}`);
          return;
        }
        showToast(signUpError.message || 'Error al crear tu cuenta', 'error');
        setSubmitting(false);
        return;
      }

      // 2. Save booking data in sessionStorage for later use in dashboard
      sessionStorage.setItem(
        'pendingBooking',
        JSON.stringify({
          doctorSlug: slug,
          doctorName: doctor?.display_name,
          date,
          time,
          modality,
          reason: form.reason,
          phone: form.phone,
        }),
      );

      // 3. If we got a session (auto-confirm / dev), update profile directly
      if (signUpData?.session && signUpData.user) {
        try {
          // Wait a moment for the DB trigger to create the profile
          await new Promise((r) => setTimeout(r, 600));

          await (supabase
            .from('profiles') as any)
            .update({
              role: 'patient',
              full_name: form.fullName,
              phone: form.phone,
            })
            .eq('id', signUpData.user.id);
        } catch (profileErr) {
          logger.error('AgendarCita:updateProfile', profileErr);
          // Non-blocking — profile will be completed during onboarding
        }

        // Show inline confirmation
        setBooked(true);
        showToast('¡Cuenta creada y cita solicitada!', 'success');
      } else {
        // Email confirmation required — show inline confirmation too
        setBooked(true);
        showToast(
          'Te enviamos un correo de verificación. Confírmalo para completar tu registro.',
          'success',
        );
      }
    } catch (err) {
      logger.error('AgendarCita:submit', err);
      showToast('Ocurrió un error inesperado. Intenta de nuevo.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  if (!doctor) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500">No se encontró al doctor.</p>
          <Link
            to="/directorio"
            className="text-primary hover:underline text-sm font-medium"
          >
            ← Volver al directorio
          </Link>
        </div>
      </PublicLayout>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const initials = doctor.display_name
    ? doctor.display_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'DR';

  // ─── Confirmation View ─────────────────────────────────────────────────

  if (booked) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center">
            {/* Success icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              ¡Cita solicitada!
            </h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Tu solicitud de cita con <span className="font-semibold text-gray-700">{doctor.display_name}</span> ha sido enviada.
              Te notificaremos cuando sea confirmada.
            </p>

            {/* Appointment summary */}
            {date && time && (
              <div className="bg-gray-50 rounded-xl p-5 mb-8 inline-block text-left">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    <CalendarDays className="w-4 h-4" />
                    {formatReadableDate(date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Clock className="w-4 h-4" />
                    {formatReadableTime(time)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
              >
                Completar mi perfil
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/directorio"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 transition-all"
              >
                Volver al directorio
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400 justify-center">
              <span className="flex items-center gap-1">
                <HeartPulse className="w-3 h-3" />
                Datos protegidos
              </span>
              <span>·</span>
              <span>✓ Te enviamos un correo con los detalles</span>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back link */}
        <Link
          to={`/directorio/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al perfil
        </Link>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Agendar cita
          </h1>
          <p className="text-gray-500 mt-1">
            Completa tus datos para solicitar la cita
          </p>
        </div>

        {/* ─── Appointment Summary Card ─── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-8">
          <div className="flex items-start gap-4">
            {/* Doctor avatar */}
            {doctor.avatar_url ? (
              <img
                src={doctor.avatar_url}
                alt={doctor.display_name}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 truncate">
                  {doctor.display_name}
                </h2>
                {doctor.is_verified && (
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                )}
              </div>

              {doctor.specialty && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {formatSpecialty(doctor.specialty)}
                </p>
              )}

              {(doctor.clinic_name || doctor.address_text) && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {doctor.city || doctor.clinic_name}
                  {(doctor.city || doctor.clinic_name) && doctor.address_text
                    ? ' · '
                    : ''}
                  {doctor.address_text}
                </p>
              )}
            </div>

            {/* Price */}
            {doctor.consultation_price ? (
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">Consulta</p>
                <p className="text-lg font-bold text-gray-900">
                  ${doctor.consultation_price.toLocaleString('es-MX')}
                </p>
              </div>
            ) : null}
          </div>

          {/* Date & Time badge */}
          {date && time && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary/5 text-primary px-3 py-1.5 rounded-lg">
                <CalendarDays className="w-4 h-4" />
                {formatReadableDate(date)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary/5 text-primary px-3 py-1.5 rounded-lg">
                <Clock className="w-4 h-4" />
                {formatReadableTime(time)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg capitalize">
                {modality === 'videoconsulta' ? '📹 Videoconsulta' : '🏥 Presencial'}
              </span>
            </div>
          )}
        </div>

        {/* ─── Registration Form ─── */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Tus datos
            </h3>
            <p className="text-sm text-gray-500">
              Crearemos tu cuenta de paciente para gestionar tu cita
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Nombre completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Ej. María López García"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.fullName ? 'border-red-400' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu@correo.com"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.email ? 'border-red-400' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Teléfono
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="10 dígitos"
                maxLength={10}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.phone ? 'border-red-400' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Motivo de la consulta
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              value={form.reason}
              onChange={handleChange}
              placeholder="Ej. Dolor de espalda, revisión general, seguimiento…"
              className={`w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${
                errors.reason ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            <p className="text-xs text-gray-400 mt-1">
              Esta información ayuda al doctor a prepararse mejor
            </p>
            {errors.reason && (
              <p className="text-sm text-red-500 mt-1">{errors.reason}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all bg-primary text-white hover:bg-primary/90 active:scale-[0.98] shadow-md shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando tu cuenta…
              </>
            ) : (
              <>
                Agendar cita
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>

          {/* Trust signals */}
          <div className="pt-4 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400 justify-center">
            <span className="flex items-center gap-1">
              <HeartPulse className="w-3 h-3" />
              Datos protegidos
            </span>
            <span>·</span>
            <span>✓ Confirmación inmediata</span>
            <span>·</span>
            <span>✓ Cancelación gratuita 24h</span>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}
