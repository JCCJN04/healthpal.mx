import { Link } from 'react-router-dom';
import { MapPin, Star, ShieldCheck, Stethoscope, Clock, UserPlus } from 'lucide-react';
import type { PublicDoctor } from '@/shared/lib/queries/publicDoctors';

interface PublicDoctorCardProps {
  doctor: PublicDoctor;
}

export default function PublicDoctorCard({ doctor }: PublicDoctorCardProps) {
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
      <div className="h-2 bg-gradient-to-r from-[#33C7BE] to-teal-400" />

      <div className="p-5 flex flex-col flex-1">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          {doctor.avatar_url ? (
            <img
              src={doctor.avatar_url}
              alt={doctor.display_name}
              loading="lazy"
              className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-gray-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#33C7BE] to-teal-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/directorio/${doctor.slug}`}
                className="text-lg font-bold text-gray-900 truncate hover:text-primary transition-colors"
              >
                {doctor.display_name}
              </Link>
              {doctor.is_verified && (
                <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" aria-label="Verificado" />
              )}
            </div>

            {doctor.specialty && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                {doctor.specialty}
              </p>
            )}
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

        {/* Location */}
        {(doctor.clinic_name || doctor.address_text) && (
          <p className="text-xs text-gray-500 flex items-start gap-1.5 mb-3">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
            <span className="line-clamp-1">
              {doctor.clinic_name}
              {doctor.clinic_name && doctor.address_text ? ' · ' : ''}
              {doctor.address_text}
            </span>
          </p>
        )}

        {/* Price */}
        {doctor.consultation_price ? (
          <p className="text-sm font-semibold text-gray-900 mb-4">
            ${doctor.consultation_price.toLocaleString('es-MX')} MXN
          </p>
        ) : (
          <p className="text-xs text-gray-400 mb-4">Precio no publicado</p>
        )}

        {/* CTAs */}
        <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-gray-100">
          <Link
            to={`/register?ref=doctor&slug=${doctor.slug}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 active:scale-[0.98] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Regístrate para reservar
          </Link>
          <Link
            to={`/directorio/${doctor.slug}`}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
          >
            Ver perfil completo →
          </Link>
        </div>
      </div>
    </div>
  );
}
