import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  MapPin,
  Award,
  Star,
  ShieldCheck,
  Stethoscope,
  DollarSign,
  Loader2,
  XCircle,
  UserPlus,
  Building2,
  BadgeCheck,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import PublicLayout from '@/features/public/components/PublicLayout';
import MapboxMap from '@/shared/components/ui/MapboxMap';
import {
  getPublicDoctorBySlug,
  getPublicDoctorReviews,
  type PublicDoctor,
  type PublicDoctorReview,
} from '@/shared/lib/queries/publicDoctors';
import { geocodeAddress } from '@/shared/lib/geocoding';

export default function PerfilDoctor() {
  const { slug } = useParams<{ slug: string }>();

  const [doctor, setDoctor] = useState<PublicDoctor | null>(null);
  const [reviews, setReviews] = useState<PublicDoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadDoctor(slug);
  }, [slug]);

  const loadDoctor = async (s: string) => {
    setLoading(true);
    setError(false);

    const data = await getPublicDoctorBySlug(s);
    if (!data) {
      setError(true);
      setLoading(false);
      return;
    }

    setDoctor(data);
    setLoading(false);

    getPublicDoctorReviews(s, 1, 10).then((r) => setReviews(r.data));

    const loc = data.location;
    const hasCoords = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
    if (!hasCoords && data.address_text) {
      setGeocoding(true);
      geocodeAddress(data.address_text)
        .then((result) => {
          if (result) setGeocodedCoords({ lat: result.lat, lng: result.lng });
        })
        .finally(() => setGeocoding(false));
    }
  };

  const pageTitle = doctor
    ? `${doctor.display_name} — ${doctor.specialty ?? 'Doctor'} | HealthPal.mx`
    : 'Perfil de Doctor | HealthPal.mx';

  const pageDesc = doctor
    ? `${doctor.display_name}, ${doctor.specialty ?? 'Médico'} con ${doctor.years_experience ?? ''} años de experiencia. ${doctor.clinic_name ? 'Consultorio: ' + doctor.clinic_name + '.' : ''} Agenda tu cita en HealthPal.mx`
    : 'Consulta el perfil de este doctor en HealthPal.mx';

  /* ─── Loading ─── */
  if (loading) {
    return (
      <PublicLayout>
        <Helmet><title>Cargando perfil... | HealthPal.mx</title></Helmet>
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-gray-500 font-medium">Cargando perfil del doctor…</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  /* ─── Error / Not Found ─── */
  if (error || !doctor) {
    return (
      <PublicLayout>
        <Helmet><title>Doctor no encontrado | HealthPal.mx</title></Helmet>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Doctor no encontrado</h2>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">
            El perfil que buscas no existe o ya no está disponible.
          </p>
          <Link
            to="/directorio"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al directorio
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const coords =
    doctor.location && typeof doctor.location.lat === 'number'
      ? doctor.location
      : geocodedCoords;

  const initials = doctor.display_name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'DR';

  return (
    <PublicLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Helmet>

      {/* ─── Full-width hero gradient ─── */}
      <div className="relative bg-gradient-to-br from-[#33C7BE] via-teal-500 to-emerald-600">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-32">
          {/* Breadcrumb */}
          <Link
            to="/directorio"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Directorio
          </Link>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6">
            {/* Avatar */}
            {doctor.avatar_url ? (
              <img
                src={doctor.avatar_url}
                alt={doctor.display_name}
                loading="lazy"
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-white/20 shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-4xl sm:text-5xl font-bold border-4 border-white/20 shadow-2xl">
                {initials}
              </div>
            )}

            <div className="text-center sm:text-left flex-1 pb-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  {doctor.display_name}
                </h1>
                {doctor.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verificado
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-white/80 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Stethoscope className="w-4 h-4" />
                  {doctor.specialty ?? 'Médico General'}
                </span>
                {doctor.clinic_name && (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4" />
                    {doctor.clinic_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats strip (overlaps hero) ─── */}
      <div className="relative -mt-16 sm:-mt-14 z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Star className="w-5 h-5 text-yellow-500" />}
            value={doctor.avg_rating > 0 ? doctor.avg_rating.toFixed(1) : '—'}
            label="Calificación"
          />
          <StatCard
            icon={<Award className="w-5 h-5 text-purple-500" />}
            value={doctor.years_experience ? `${doctor.years_experience}+` : '—'}
            label="Años exp."
          />
          <StatCard
            icon={<Star className="w-5 h-5 text-emerald-500" />}
            value={String(doctor.review_count)}
            label={doctor.review_count === 1 ? 'Reseña' : 'Reseñas'}
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-blue-500" />}
            value={
              doctor.consultation_price
                ? `$${doctor.consultation_price.toLocaleString('es-MX')}`
                : '—'
            }
            label="Consulta"
          />
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ─── Left column ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {doctor.bio && (
              <Section title="Acerca del doctor">
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {doctor.bio}
                </p>
              </Section>
            )}

            {/* Info card — shown here only on mobile (before map) */}
            <div className="lg:hidden">
              <InfoCard doctor={doctor} />
            </div>

            {/* Map */}
            {(doctor.address_text || coords) && (
              <Section title="Ubicación del consultorio">
                {doctor.address_text && (
                  <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-gray-50">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 text-sm leading-relaxed mb-2">{doctor.address_text}</p>
                      <a
                        href={
                          coords
                            ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.address_text)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-teal-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir en Google Maps
                      </a>
                    </div>
                  </div>
                )}
                {geocoding && (
                  <div className="h-[260px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
                {!geocoding && coords && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <MapboxMap
                      lat={coords.lat}
                      lng={coords.lng}
                      address={doctor.address_text ?? undefined}
                      height="260px"
                    />
                  </div>
                )}
              </Section>
            )}

            {/* Reviews */}
            <Section title={`Reseñas de pacientes (${doctor.review_count})`}>
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <Star className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">Este doctor aún no tiene reseñas.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reviews.map((r, i) => (
                    <ReviewItem key={i} review={r} />
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* ─── Right column (sidebar) ─── */}
          <div className="hidden lg:block">
            {/* Sticky wrapper: both CTA + Info scroll together */}
            <div className="sticky top-24 space-y-5">
              {/* CTA Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <p className="text-lg font-bold text-gray-900 mb-1">
                  Agenda una cita
                </p>
                <p className="text-sm text-gray-500 mb-5">
                  Crea tu cuenta gratuita y reserva una consulta al instante.
                </p>

                <Link
                  to={`/register?ref=doctor&slug=${slug}`}
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 active:scale-[0.98] transition-all shadow-sm shadow-teal-200"
                >
                  <UserPlus className="w-5 h-5" />
                  Regístrate gratis
                </Link>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
                  >
                    ¿Ya tienes cuenta?{' '}
                    <span className="font-semibold text-primary">Inicia sesión</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Info card — desktop only (mobile rendered in left column) */}
              <InfoCard doctor={doctor} />
            </div>
          </div>

          {/* CTA on mobile — after reviews, at the bottom */}
          <div className="lg:hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-lg font-bold text-gray-900 mb-1">
                Agenda una cita
              </p>
              <p className="text-sm text-gray-500 mb-5">
                Crea tu cuenta gratuita y reserva una consulta al instante.
              </p>

              <Link
                to={`/register?ref=doctor&slug=${slug}`}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 active:scale-[0.98] transition-all shadow-sm shadow-teal-200"
              >
                <UserPlus className="w-5 h-5" />
                Regístrate gratis
              </Link>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  ¿Ya tienes cuenta?{' '}
                  <span className="font-semibold text-primary">Inicia sesión</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 sm:px-6 py-5">{children}</div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 flex flex-col items-center text-center gap-1 hover:shadow-lg transition-shadow">
      <div className="mb-0.5">{icon}</div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function ReviewItem({ review }: { review: PublicDoctorReview }) {
  return (
    <div className="flex gap-3 py-4">
      {/* Avatar circle */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-sm font-bold text-primary">
        {review.reviewer.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {review.reviewer}
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(review.created_at).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-0.5 mb-1.5">
          {Array.from({ length: 5 }).map((_, j) => (
            <Star
              key={j}
              className={`w-3.5 h-3.5 ${
                j < review.rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-200'
              }`}
            />
          ))}
        </div>

        {review.comment && (
          <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
        )}
      </div>
    </div>
  );
}

function InfoCard({ doctor }: { doctor: PublicDoctor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
      <div className="px-5 py-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Información
        </h3>
      </div>

      {doctor.specialty && (
        <InfoRow
          icon={<Stethoscope className="w-4 h-4 text-primary" />}
          label="Especialidad"
          value={doctor.specialty}
        />
      )}
      {doctor.years_experience && (
        <InfoRow
          icon={<Clock className="w-4 h-4 text-purple-500" />}
          label="Experiencia"
          value={`${doctor.years_experience} años`}
        />
      )}
      {doctor.consultation_price && (
        <InfoRow
          icon={<DollarSign className="w-4 h-4 text-blue-500" />}
          label="Consulta"
          value={`$${doctor.consultation_price.toLocaleString('es-MX')} MXN`}
        />
      )}
      {doctor.is_verified && (
        <InfoRow
          icon={<BadgeCheck className="w-4 h-4 text-emerald-500" />}
          label="Verificación"
          value="Cédula verificada por SEP"
        />
      )}
      {doctor.clinic_name && (
        <InfoRow
          icon={<Building2 className="w-4 h-4 text-gray-400" />}
          label="Consultorio"
          value={doctor.clinic_name}
        />
      )}
    </div>
  );
}
