import React, { useState } from 'react';
import {
  Star, MoreVertical, MapPin, Stethoscope,
  Clock, DollarSign, UserX, ShieldCheck,
} from 'lucide-react';
import { DoctorWithProfile, unlinkDoctorFromPatient } from '@/features/patient/services/doctors';
import { showToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/app/providers/AuthContext';
import { formatSpecialty } from '@/shared/lib/specialties';

interface DoctorCardProps {
  doctor: DoctorWithProfile;
  onRemoved?: () => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onRemoved }) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const profile = doctor.doctor_profile;
  const stats = doctor.review_stats;

  const initials = doctor.full_name
    ? doctor.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'DR';

  const handleSendMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = doctor.phone;
    if (!phone) {
      showToast('Este doctor no tiene número de WhatsApp registrado', 'error');
      setShowMenu(false);
      return;
    }
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('52') ? cleaned : `52${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
    setShowMenu(false);
  };

  const handleRemove = async () => {
    setShowMenu(false);
    if (!user?.id) return;
    const success = await unlinkDoctorFromPatient(user.id, doctor.id);
    if (success) {
      showToast('Doctor removido de tu lista', 'success');
      onRemoved?.();
    } else {
      showToast('Error al remover doctor', 'error');
    }
  };

  const hasRating = stats && stats.avg_rating > 0;

  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden
      hover:shadow-[0_24px_48px_rgba(21,28,39,0.06)] transition-all duration-300 flex flex-col">

      {/* Decorative circle */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

      <div className="p-5 flex flex-col flex-1 relative">
        {/* Header: avatar + name + specialty + rating + menu */}
        <div className="flex gap-4 mb-5">
          {doctor.avatar_url ? (
            <img
              src={doctor.avatar_url}
              alt={doctor.full_name || 'Doctor'}
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">
                  {doctor.full_name || 'Doctor'}
                </h3>
                <p className="text-primary font-semibold text-sm mt-0.5 flex items-center gap-1 truncate">
                  <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" />
                  {formatSpecialty(profile?.specialty)}
                </p>
              </div>

              {/* 3-dot menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-20">
                      <button
                        onClick={handleRemove}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Quitar de mis doctores
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mt-1.5">
              <Star className={`w-3.5 h-3.5 ${hasRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
              <span className="text-xs font-bold text-gray-900">
                {hasRating ? stats.avg_rating.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-gray-500">
                ({stats?.review_count ?? 0} reseña{stats?.review_count !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-2.5 mb-5">
          {profile?.years_experience && (
            <div className="flex items-center gap-2.5 text-gray-500 text-sm">
              <Clock className="w-4 h-4 text-primary/60 flex-shrink-0" />
              <span>{profile.years_experience} años de experiencia</span>
            </div>
          )}
          {profile?.consultation_price_mxn ? (
            <div className="flex items-center gap-2.5 text-gray-500 text-sm">
              <DollarSign className="w-4 h-4 text-primary/60 flex-shrink-0" />
              <span>${profile.consultation_price_mxn.toLocaleString('es-MX')} MXN por consulta</span>
            </div>
          ) : null}
          {profile?.professional_license && (
            <div className="flex items-center gap-2.5 text-gray-500 text-sm">
              <ShieldCheck className="w-4 h-4 text-primary/60 flex-shrink-0" />
              <span>Céd. Prof. {profile.professional_license}</span>
            </div>
          )}
          {(profile?.clinic_name || profile?.address_text) && (
            <div className="flex items-start gap-2.5 text-gray-500 text-sm">
              <MapPin className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed line-clamp-2">
                {profile.clinic_name}
                {profile.clinic_name && profile.address_text ? ' · ' : ''}
                {profile.address_text}
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={handleSendMessage}
            className="w-full bg-[#25D366]/10 text-[#075E54] py-2.5 rounded-xl font-bold text-sm
              flex items-center justify-center gap-1.5 hover:bg-[#25D366]/20 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
