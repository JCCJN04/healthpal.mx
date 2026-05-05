import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Award,
  Star,
  Clock,
  Loader2,
  XCircle,
  Stethoscope,
  Building2,
  BadgeCheck,
  DollarSign,
  FileText,
  Phone,
  ExternalLink,
} from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import {
  getDoctorById,
  DoctorWithProfile,
} from '@/features/patient/services/doctors';
import MapboxMap from '@/shared/components/ui/MapboxMap';
import type { DoctorLocation } from '@/shared/types/database';
import { geocodeAddress } from '@/shared/lib/geocoding';
import { formatSpecialty } from '@/shared/lib/specialties';

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateDoctor = (location.state as { doctor?: DoctorWithProfile } | null)?.doctor ?? null;
  const [doctor, setDoctor] = useState<DoctorWithProfile | null>(stateDoctor);
  const [loading, setLoading] = useState(!stateDoctor);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'>('info');
  const [geocodedCoords, setGeocodedCoords] = useState<DoctorLocation | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!id) return;

    loadDoctor();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDoctor = async () => {
    if (!id) return;
    // Only show full-page spinner if we have no data yet
    if (!stateDoctor) {
      setLoading(true);
    }
    setError(null);

    const data = await getDoctorById(id);
    if (!data) {
      if (!stateDoctor) {
        setError('No se pudo cargar la información del doctor');
      }
      setLoading(false);
      return;
    }

    setDoctor(data);
    setLoading(false);

    // Start geocoding if needed
    const loc = data.doctor_profile?.location as DoctorLocation | null;
    const hasStoredCoords = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
    if (!hasStoredCoords && data.doctor_profile?.address_text) {
      setGeocoding(true);
      geocodeAddress(data.doctor_profile.address_text)
        .then((result) => {
          if (result) setGeocodedCoords({ lat: result.lat, lng: result.lng });
        })
        .finally(() => setGeocoding(false));
    }
  };

  const handleSendMessage = () => {
    if (!doctor) return;
    const phone = doctor.phone;
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('52') ? cleaned : `52${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
              <Loader2 className="w-14 h-14 text-primary animate-spin" />
            </div>
            <p className="text-gray-500 font-medium">Cargando perfil…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Error ─── */
  if (error || !doctor) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Error al cargar el perfil</h3>
            <p className="text-gray-500 text-sm mb-6">{error || 'El doctor no existe'}</p>
            <Link
              to="/dashboard/doctores"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al directorio
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const profile = doctor.doctor_profile;
  const loc = profile?.location as DoctorLocation | null;
  const storedCoords = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' ? loc : null;
  const coords = storedCoords ?? geocodedCoords;

  const initials = doctor.full_name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'D';

  const tabs = [
    { id: 'info' as const, label: 'Información', icon: FileText },
  ];

  const specialtyLabel = formatSpecialty(profile?.specialty);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard/doctores')}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Volver al directorio
        </button>

        {/* ─── Hero Card ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">

          {/* Gradient banner */}
          <div className="h-24 sm:h-28 rounded-t-2xl overflow-hidden relative bg-gradient-to-r from-[#2bbdb4] via-[#33C7BE] to-emerald-500">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
            <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 1440 60" preserveAspectRatio="none">
              <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="white"/>
            </svg>
          </div>

          <div className="px-5 sm:px-8 pb-6">
            {/* Identity row — only the avatar overlaps the banner via negative margin */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-5">

              {/* Left: avatar (overlapping) + name block */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">

                {/* Avatar — negative margin only here */}
                <div className="self-center sm:self-auto flex-shrink-0 -mt-10 sm:-mt-12 relative z-10">
                  {doctor.avatar_url ? (
                    <img
                      src={doctor.avatar_url}
                      alt={doctor.full_name || 'Doctor'}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-[3px] border-white shadow-md ring-1 ring-black/5"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#33C7BE] to-teal-700 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold border-[3px] border-white shadow-md select-none">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Name + meta — anchored in white card, no negative margin */}
                <div className="text-center sm:text-left mt-2.5 sm:mt-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                      {doctor.full_name || 'Doctor'}
                    </h1>
                    {!!(profile as Record<string, unknown>)?.is_sep_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
                        <BadgeCheck className="w-3 h-3" />
                        Verificado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <Stethoscope className="w-3.5 h-3.5 text-primary" />
                      {specialtyLabel}
                    </span>
                    {profile?.clinic_name && (
                      <>
                        <span className="text-gray-300 hidden sm:inline">·</span>
                        <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {profile.clinic_name}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Disponible para citas
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA buttons — desktop: top-right, aligned to text top */}
              <div className="hidden sm:flex items-center gap-2.5 flex-shrink-0 mt-2">
                <button
                  onClick={() => navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-teal-400 text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                >
                  <Clock className="w-4 h-4" />
                  Agendar cita
                </button>
                <button
                  onClick={handleSendMessage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:bg-[#1ebe5d] active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 border border-gray-100 rounded-xl overflow-hidden divide-x divide-gray-100 mb-5">
              <StatCell
                icon={<Award className="w-4 h-4 text-violet-500" />}
                value={profile?.years_experience ? `${profile.years_experience}+` : '—'}
                label="Años de exp."
              />
              <StatCell
                icon={<Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                value="—"
                label="Calificación"
              />
              <StatCell
                icon={<DollarSign className="w-4 h-4 text-blue-500" />}
                value={
                  profile?.consultation_price_mxn
                    ? `$${profile.consultation_price_mxn.toLocaleString('es-MX')}`
                    : '—'
                }
                label="Consulta"
              />
            </div>

            {/* CTA buttons — mobile only */}
            <div className="sm:hidden flex flex-col gap-2.5">
              <button
                onClick={() => navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary to-teal-400 text-white font-semibold rounded-xl hover:opacity-90 active:scale-[0.99] transition-all text-sm"
              >
                <Clock className="w-4 h-4" />
                Agendar cita
              </button>
              <button
                onClick={handleSendMessage}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#1ebe5d] active:scale-[0.99] transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* ─── Tabbed Content ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab bar */}
          <div className="border-b border-gray-100 px-4 sm:px-6">
            <nav className="flex -mb-px" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-1.5 px-3 sm:px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none
                      ${isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab panel */}
          <div className="p-5 sm:p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Bio */}
                {profile?.bio && (
                  <div>
                    <SectionHeading>Acerca del doctor</SectionHeading>
                    <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Details grid */}
                <div>
                  <SectionHeading>Información profesional</SectionHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile?.specialty && (
                      <DetailCard
                        icon={<Stethoscope className="w-4 h-4 text-primary" />}
                        label="Especialidad"
                        value={specialtyLabel}
                      />
                    )}
                    {profile?.professional_license && (
                      <DetailCard
                        icon={<BadgeCheck className="w-4 h-4 text-emerald-500" />}
                        label="Cédula Profesional"
                        value={profile.professional_license}
                      />
                    )}
                    {profile?.consultation_price_mxn && (
                      <DetailCard
                        icon={<DollarSign className="w-4 h-4 text-blue-500" />}
                        label="Precio de consulta"
                        value={`$${profile.consultation_price_mxn.toLocaleString('es-MX')} MXN`}
                      />
                    )}
                    {profile?.clinic_name && (
                      <DetailCard
                        icon={<Building2 className="w-4 h-4 text-gray-400" />}
                        label="Consultorio"
                        value={profile.clinic_name}
                      />
                    )}
                    {doctor.phone && (
                      <DetailCard
                        icon={<Phone className="w-4 h-4 text-emerald-500" />}
                        label="Teléfono"
                        value={doctor.phone}
                      />
                    )}
                  </div>
                </div>

                {/* Map */}
                {(profile?.address_text || coords) && (
                  <div>
                    <SectionHeading>Ubicación del consultorio</SectionHeading>
                    {profile?.address_text && (
                      <div className="flex items-start gap-3 mb-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {profile.address_text}
                          </p>
                          <a
                            href={
                              coords
                                ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address_text)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-primary hover:text-teal-700 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Abrir en Google Maps
                          </a>
                        </div>
                      </div>
                    )}
                    {geocoding && (
                      <div className="h-[260px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    )}
                    {!geocoding && coords && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                        <MapboxMap
                          lat={coords.lat}
                          lng={coords.lng}
                          address={profile?.address_text ?? undefined}
                          height="260px"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{children}</h3>
  );
}

function StatCell({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 py-4 px-2 bg-gray-50 hover:bg-gray-100/70 transition-colors">
      <div className="mb-1">{icon}</div>
      <p className="text-base font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50/70 border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-medium leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800 leading-snug">{value}</p>
      </div>
    </div>
  );
}
