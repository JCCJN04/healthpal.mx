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
  Building2,
  ExternalLink,
  Video,
  Globe,
  Briefcase,
  MessageSquareText,
} from 'lucide-react';
import PublicLayout from '@/features/public/components/PublicLayout';
import MapboxMap from '@/shared/components/ui/MapboxMap';
import StickyBookingWidget from '@/features/public/components/StickyBookingWidget';
import DoctorExperienceTab from '@/features/public/components/DoctorExperienceTab';
import DoctorServicesTab from '@/features/public/components/DoctorServicesTab';
import DoctorReviewsTab from '@/features/public/components/DoctorReviewsTab';
import {
  getPublicDoctorDetail,
  type PublicDoctorEnriched,
} from '@/shared/lib/queries/publicDoctors';
import { geocodeAddress } from '@/shared/lib/geocoding';
import { formatSpecialty } from '@/shared/lib/specialties';
import { buildPhysicianJsonLd } from '@/shared/lib/seoJsonLd';

type TabId = 'experiencia' | 'servicios' | 'opiniones';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'experiencia', label: 'Experiencia', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'servicios', label: 'Servicios y Precios', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'opiniones', label: 'Opiniones', icon: <MessageSquareText className="w-4 h-4" /> },
];

export default function PerfilDoctor() {
  const { slug } = useParams<{ slug: string }>();

  const [doctor, setDoctor] = useState<PublicDoctorEnriched | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('experiencia');

  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadDoctor(slug);
  }, [slug]);

  const loadDoctor = async (s: string) => {
    setLoading(true);
    setError(false);

    const data = await getPublicDoctorDetail(s);
    if (!data) {
      setError(true);
      setLoading(false);
      return;
    }

    setDoctor(data);
    setLoading(false);

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
    ? `${doctor.display_name} — ${formatSpecialty(doctor.specialty)} | HealthPal.mx`
    : 'Perfil de Doctor | HealthPal.mx';

  const pageDesc = doctor
    ? `${doctor.display_name}, ${formatSpecialty(doctor.specialty)} con ${doctor.years_experience ?? ''} años de experiencia. ${doctor.clinic_name ? 'Consultorio: ' + doctor.clinic_name + '.' : ''} Agenda tu cita en HealthPal.mx`
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
        <script type="application/ld+json">{JSON.stringify(buildPhysicianJsonLd(doctor))}</script>
      </Helmet>

      {/* ─── Full-width hero gradient ─── */}
      <div className="relative bg-gradient-to-br from-[#33C7BE] via-teal-500 to-emerald-600">
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
                  {formatSpecialty(doctor.specialty)}
                </span>
                {doctor.clinic_name && (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4" />
                    {doctor.clinic_name}
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                {doctor.accepts_video && (
                  <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                    <Video className="w-3.5 h-3.5" />
                    Videoconsulta disponible
                  </span>
                )}
                {doctor.languages && doctor.languages.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                    <Globe className="w-3.5 h-3.5" />
                    {doctor.languages.join(', ')}
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
          {/* ─── Left column (2/3) ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabbed navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Tab bar */}
              <div className="border-b border-gray-100">
                <nav className="flex">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab content */}
              <div className="p-5 sm:p-6">
                {activeTab === 'experiencia' && (
                  <DoctorExperienceTab doctor={doctor} />
                )}
                {activeTab === 'servicios' && (
                  <DoctorServicesTab doctor={doctor} />
                )}
                {activeTab === 'opiniones' && (
                  <DoctorReviewsTab
                    doctorSlug={slug!}
                    avgRating={doctor.avg_rating}
                    reviewCount={doctor.review_count}
                  />
                )}
              </div>
            </div>

            {/* Map */}
            {(doctor.address_text || coords) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Ubicación del consultorio</h2>
                </div>
                <div className="px-5 sm:px-6 py-5">
                  {doctor.address_text && (
                    <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-gray-50">
                      <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-sm leading-relaxed mb-2">
                          {doctor.address_text}
                          {doctor.city && (
                            <span className="text-gray-400"> · {doctor.city}</span>
                          )}
                        </p>
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
                </div>
              </div>
            )}
          </div>

          {/* ─── Right column: Sticky Booking Widget ─── */}
          <div className="hidden lg:block">
            <StickyBookingWidget
              doctorSlug={slug!}
              displayName={doctor.display_name}
              consultationPrice={doctor.consultation_price}
              acceptsVideo={doctor.accepts_video}
              address={doctor.address_text}
            />
          </div>

          {/* Mobile booking widget (non-sticky, at bottom) */}
          <div className="lg:hidden">
            <StickyBookingWidget
              doctorSlug={slug!}
              displayName={doctor.display_name}
              consultationPrice={doctor.consultation_price}
              acceptsVideo={doctor.accepts_video}
              address={doctor.address_text}
            />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

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
