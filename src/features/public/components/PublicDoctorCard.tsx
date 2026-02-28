import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, ShieldCheck, Stethoscope, Clock, Video, Globe } from 'lucide-react';
import type { PublicDoctor } from '@/shared/lib/queries/publicDoctors';
import { formatSpecialty } from '@/shared/lib/specialties';
import AvailabilityCarousel from './AvailabilityCarousel';

interface PublicDoctorCardProps {
  doctor: PublicDoctor;
}

export default function PublicDoctorCard({ doctor }: PublicDoctorCardProps) {
  const navigate = useNavigate();

  const initials = doctor.display_name
    ? doctor.display_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'DR';

  return (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col">
      {/* Top accent */}
      <div className="h-1.5 bg-gradient-to-r from-[#33C7BE] to-teal-400" />

      <div className="p-5 flex flex-col flex-1">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-3">
          {/* Avatar */}
          <Link to={`/directorio/${doctor.slug}`} className="shrink-0">
            {doctor.avatar_url ? (
              <img
                src={doctor.avatar_url}
                alt={doctor.display_name}
                loading="lazy"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#33C7BE] to-teal-500 flex items-center justify-center text-white text-lg font-bold">
                {initials}
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/directorio/${doctor.slug}`}
                className="text-lg font-bold text-gray-900 truncate hover:text-primary transition-colors"
              >
                {doctor.display_name}
              </Link>
              {doctor.is_verified && (
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" aria-label="Verificado" />
              )}
            </div>

            {doctor.specialty && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                {formatSpecialty(doctor.specialty)}
              </p>
            )}

            {/* Badges row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {doctor.accepts_video && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                  <Video className="w-3 h-3" />
                  Videoconsulta
                </span>
              )}
              {doctor.languages && doctor.languages.length > 1 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                  <Globe className="w-3 h-3" />
                  {doctor.languages.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-900">
              {doctor.avg_rating > 0 ? doctor.avg_rating.toFixed(1) : '—'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {doctor.review_count > 0
              ? `${doctor.review_count} reseña${doctor.review_count !== 1 ? 's' : ''}`
              : 'Sin reseñas aún'}
          </span>
          {doctor.years_experience && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {doctor.years_experience} años exp.
              </span>
            </>
          )}
        </div>

        {/* Bio preview */}
        {doctor.bio && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{doctor.bio}</p>
        )}

        {/* Location + price row */}
        <div className="flex items-center justify-between mb-3">
          {(doctor.clinic_name || doctor.address_text) && (
            <p className="text-xs text-gray-500 flex items-start gap-1.5 flex-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              <span className="line-clamp-1">
                {doctor.city || doctor.clinic_name}
                {(doctor.city || doctor.clinic_name) && doctor.address_text ? ' · ' : ''}
                {doctor.address_text}
              </span>
            </p>
          )}
          {doctor.consultation_price ? (
            <p className="text-sm font-semibold text-gray-900 shrink-0 ml-2">
              ${doctor.consultation_price.toLocaleString('es-MX')}
            </p>
          ) : null}
        </div>

        {/* ─── Availability Carousel ─── */}
        <div className="border-t border-gray-100 pt-3 mt-auto">
          <AvailabilityCarousel
            doctorSlug={doctor.slug}
            columns={3}
            maxSlotsPerDay={3}
            compact
            onSlotClick={(slot) => {
              const params = new URLSearchParams({
                date: slot.slot_date,
                time: slot.slot_time,
              });
              navigate(`/agendar/${doctor.slug}?${params.toString()}`);
            }}
          />
        </div>

        {/* Profile link */}
        <Link
          to={`/directorio/${doctor.slug}`}
          className="mt-3 flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ver perfil completo →
        </Link>
      </div>
    </div>
  );
}
