import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Star, MoreVertical, MapPin, Stethoscope, Clock, DollarSign, UserX, ShieldCheck } from 'lucide-react';
import { DoctorWithProfile, unlinkDoctorFromPatient } from '@/features/patient/services/doctors';
import { showToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/app/providers/AuthContext';
import { formatSpecialty } from '@/shared/lib/specialties';

interface DoctorCardProps {
  doctor: DoctorWithProfile;
  onRemoved?: () => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onRemoved }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const profile = doctor.doctor_profile;
  const stats = doctor.review_stats;

  const initials = doctor.full_name
    ? doctor.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'DR';

  const handleViewProfile = () => navigate(`/dashboard/doctores/${doctor.id}`);
  const handleSchedule = () => navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`);

  const handleSendMessage = (e: React.MouseEvent) => {
    e.preventDefault();
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

  return (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#33C7BE]/30 transition-all duration-200 flex flex-col">
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#33C7BE] to-teal-400" />

      <div className="p-5 flex flex-col flex-1">
        {/* Header: avatar + name + specialty */}
        <div className="flex items-start gap-4 mb-4">
          {doctor.avatar_url ? (
            <img
              src={doctor.avatar_url}
              alt={doctor.full_name || 'Doctor'}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#33C7BE] to-teal-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-gray-900 text-base truncate cursor-pointer hover:text-[#33C7BE] transition-colors"
              onClick={handleViewProfile}
            >
              {doctor.full_name || 'Doctor'}
            </h3>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <Stethoscope className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{formatSpecialty(profile?.specialty)}</span>
            </p>
          </div>

          {/* Menu */}
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
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => { handleViewProfile(); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Ver perfil completo
                  </button>
                  <div className="border-t border-gray-100 my-1" />
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

        {/* Rating + experience row */}
        <div className="flex items-center gap-3 mb-3 text-sm">
          <div className="flex items-center gap-1">
            <Star className={`w-4 h-4 ${stats && stats.avg_rating > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
            <span className="font-semibold text-gray-900">
              {stats && stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '—'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {stats && stats.review_count > 0
              ? `${stats.review_count} reseña${stats.review_count !== 1 ? 's' : ''}`
              : 'Sin reseñas'}
          </span>
          {profile?.years_experience && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {profile.years_experience} años exp.
              </span>
            </>
          )}
        </div>

        {/* Key info chips: Price + License */}
        <div className="flex flex-wrap gap-2 mb-3">
          {profile?.consultation_price_mxn ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
              <DollarSign className="w-3 h-3" />
              ${profile.consultation_price_mxn.toLocaleString('es-MX')} MXN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 text-xs">
              <DollarSign className="w-3 h-3" />
              Precio no publicado
            </span>
          )}
          {profile?.professional_license && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <ShieldCheck className="w-3 h-3" />
              Céd. {profile.professional_license}
            </span>
          )}
        </div>

        {/* Bio preview */}
        {profile?.bio && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{profile.bio}</p>
        )}

        {/* Location / Clinic — lower priority */}
        {(profile?.clinic_name || profile?.address_text) && (
          <p className="text-xs text-gray-400 flex items-start gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-300" />
            <span className="line-clamp-1">
              {profile.clinic_name}
              {profile.clinic_name && profile.address_text ? ' · ' : ''}
              {profile.address_text}
            </span>
          </p>
        )}

        <div className="mb-2" />

        {/* CTAs */}
        <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={handleSchedule}
            className="w-full px-4 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            Agendar cita
          </button>

          <button
            onClick={handleSendMessage}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#25D366] hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
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
