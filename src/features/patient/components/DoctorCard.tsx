import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageCircle, Star, MoreVertical, MapPin, Stethoscope, Clock, DollarSign, UserX, ShieldCheck, BadgeCheck } from 'lucide-react';
import { DoctorWithProfile, unlinkDoctorFromPatient } from '@/features/patient/services/doctors';
import { showToast } from '@/shared/components/ui/Toast';
import { logger } from '@/shared/lib/logger';
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
    if (!doctor.id) {
      logger.error('DoctorCard:handleSendMessage', new Error('Missing doctor.id'));
      showToast('Error: No se pudo identificar al doctor', 'error');
      return;
    }
    try {
      navigate(`/dashboard/mensajes?with=${doctor.id}`);
    } catch (err) {
      logger.error('DoctorCard:navigate', err);
    }
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
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#33C7BE] hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar mensaje
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
