import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Award,
  Star,
  Calendar,
  MessageSquare,
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
  getDoctorReviews,
  getDoctorSchedule,
  getReviewableAppointmentId,
  submitDoctorReview,
  DoctorWithProfile,
  DoctorReview,
  ScheduleDay,
} from '@/features/patient/services/doctors';
import MapboxMap from '@/shared/components/ui/MapboxMap';
import type { DoctorLocation } from '@/shared/types/database';
import { geocodeAddress } from '@/shared/lib/geocoding';
import { formatSpecialty } from '@/shared/lib/specialties';

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'reviews' | 'schedule'>('info');
  const [geocodedCoords, setGeocodedCoords] = useState<DoctorLocation | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [reviewableApptId, setReviewableApptId] = useState<string | null | undefined>(undefined);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    loadDoctor();
  }, [id]);

  const loadDoctor = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const data = await getDoctorById(id);
    if (!data) {
      setError('No se pudo cargar la información del doctor');
      setLoading(false);
      return;
    }

    setDoctor(data);
    setLoading(false);

    // Load reviews, schedule, and reviewable appointment in parallel
    setReviewsLoading(true);
    setScheduleLoading(true);
    getDoctorReviews(id).then(setReviews).finally(() => setReviewsLoading(false));
    getDoctorSchedule(id).then(setSchedule).finally(() => setScheduleLoading(false));
    getReviewableAppointmentId(id).then(setReviewableApptId);

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

  const handleScheduleAppointment = () => {
    if (!doctor) return;
    navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`);
  };

  const handleSendMessage = () => {
    if (!doctor) return;
    navigate(`/dashboard/mensajes?doctorId=${doctor.id}`);
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
    { id: 'reviews' as const, label: 'Reseñas', icon: Star },
    { id: 'schedule' as const, label: 'Horarios', icon: Clock },
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
                  onClick={handleScheduleAppointment}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-teal-600 active:scale-[0.98] transition-all shadow-sm shadow-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Calendar className="w-4 h-4" />
                  Agendar cita
                </button>
                <button
                  onClick={handleSendMessage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-primary hover:text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MessageSquare className="w-4 h-4" />
                  Mensaje
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
                value="4.9"
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
                onClick={handleScheduleAppointment}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 active:scale-[0.99] transition-all shadow-sm shadow-teal-100 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Calendar className="w-4 h-4" />
                Agendar cita
              </button>
              <button
                onClick={handleSendMessage}
                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar mensaje
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

            {activeTab === 'reviews' && (
              <div className="space-y-6">

                {/* Review submission form — only if patient has a reviewable appointment */}
                {reviewableApptId && !reviewSuccess && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                    <h4 className="font-bold text-gray-900 mb-1 text-sm">Deja tu reseña</h4>
                    <p className="text-xs text-gray-400 mb-4">Comparte tu experiencia con este médico.</p>

                    {/* Star picker */}
                    <div className="flex items-center gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewRating(n)}
                          className="focus-visible:outline-none"
                          aria-label={`${n} estrellas`}
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              n <= reviewRating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200 fill-gray-200 hover:text-amber-300 hover:fill-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-semibold text-gray-600">{reviewRating}/5</span>
                    </div>

                    {/* Comment textarea */}
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Cuéntanos sobre tu experiencia (opcional)…"
                      rows={3}
                      className="w-full text-sm rounded-xl border border-gray-200 px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-gray-300"
                    />

                    {reviewError && (
                      <p className="text-xs text-red-500 mt-2">{reviewError}</p>
                    )}

                    <button
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={async () => {
                        if (!reviewableApptId || !doctor) return;
                        setReviewSubmitting(true);
                        setReviewError(null);
                        const res = await submitDoctorReview(
                          doctor.id,
                          reviewableApptId,
                          reviewRating,
                          reviewComment,
                        );
                        if (res.ok) {
                          setReviewSuccess(true);
                          setReviewableApptId(null);
                          getDoctorReviews(doctor.id).then(setReviews);
                        } else {
                          setReviewError(res.error ?? 'Error al enviar la reseña');
                        }
                        setReviewSubmitting(false);
                      }}
                      className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {reviewSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                      Publicar reseña
                    </button>
                  </div>
                )}

                {reviewSuccess && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3">
                    <BadgeCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-emerald-700">¡Reseña publicada! Gracias por tu opinión.</p>
                  </div>
                )}

                {/* Reviews list */}
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Sin reseñas todavía</p>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">
                      Las reseñas aparecen aquí despues de que los pacientes completen una cita.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Summary bar */}
                    <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-center">
                        <p className="text-3xl font-extrabold text-gray-900 leading-none">
                          {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                        </p>
                        <div className="flex justify-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                            return (
                              <Star
                                key={n}
                                className={`w-3.5 h-3.5 ${
                                  n <= Math.round(avg)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-gray-200 fill-gray-200'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = reviews.filter((r) => r.rating === star).length;
                          const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-3">{star}</span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Review cards */}
                    <div className="space-y-3">
                      {reviews.map((review) => (
                        <div key={review.id} className="p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-teal-700 flex items-center justify-center text-white text-xs font-bold select-none">
                                {review.reviewer_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{review.reviewer_name}</p>
                                <div className="flex gap-0.5 mt-0.5">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <Star
                                      key={n}
                                      className={`w-3 h-3 ${
                                        n <= review.rating
                                          ? 'text-amber-400 fill-amber-400'
                                          : 'text-gray-200 fill-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {new Date(review.created_at).toLocaleDateString('es-MX', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="mt-2.5 text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div>
                <SectionHeading>Horario de atención</SectionHeading>
                {scheduleLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : schedule.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm text-gray-400">El médico aún no ha configurado sus horarios.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    {schedule.map((item, i) => {
                      const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                      const label = DAY_NAMES[item.day_of_week] ?? `Día ${item.day_of_week}`;
                      const fmt = (t: string) => {
                        const [h, m] = t.split(':').map(Number);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
                      };
                      return (
                        <div
                          key={item.day_of_week}
                          className={`flex items-center justify-between px-4 py-3.5 ${
                            i < schedule.length - 1 ? 'border-b border-gray-50' : ''
                          } ${!item.is_active ? 'bg-gray-50/60' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.is_active ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                            <span className={`text-sm font-medium ${item.is_active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
                          </div>
                          <span className={`text-sm ${item.is_active ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                            {item.is_active ? `${fmt(item.open_time)} – ${fmt(item.close_time)}` : 'Cerrado'}
                          </span>
                        </div>
                      );
                    })}
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
