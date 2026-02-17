import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageCircle, Eye, MoreVertical, Star, Briefcase } from 'lucide-react';
import { DoctorWithProfile } from '@/features/patient/services/doctors';
import { showToast } from '@/shared/components/ui/Toast';

interface DoctorCardProps {
  doctor: DoctorWithProfile;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const profile = doctor.doctor_profile;

  const handleViewProfile = () => {
    console.log('View profile:', doctor.full_name);
    navigate(`/dashboard/doctores/${doctor.id}`);
  };

  const handleSchedule = () => {
    console.log('Schedule appointment with:', doctor.full_name);
    navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`);
  };

  const handleSendMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[DoctorCard] handleSendMessage initiated for:', doctor.full_name, 'ID:', doctor.id);

    if (!doctor.id) {
      console.error('[DoctorCard] Missing doctor.id!', doctor);
      showToast('Error: No se pudo identificar al doctor', 'error');
      return;
    }

    try {
      navigate(`/dashboard/mensajes?with=${doctor.id}`);
      console.log('[DoctorCard] navigate() called successfully');
      showToast('Abriendo chat...', 'success');
    } catch (err) {
      console.error('[DoctorCard] Navigation error:', err);
    }

    setShowMenu(false);
  };

  const handleViewReviews = () => {
    console.log('View reviews for:', doctor.full_name);
    setShowMenu(false);
  };

  const handleRemove = () => {
    console.log('Remove doctor:', doctor.full_name);
    setShowMenu(false);
  };

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#33C7BE]/30 transition-all duration-300 hover:-translate-y-2 overflow-hidden">
      {/* Doctor Photo Section */}
      <div className="relative h-48 bg-gradient-to-br from-blue-50 via-teal-50 to-blue-100 overflow-hidden">
        {/* Photo or Initials */}
        <div className="absolute inset-0 flex items-center justify-center">
          {doctor.avatar_url ? (
            <img
              src={doctor.avatar_url}
              alt={doctor.full_name || 'Doctor'}
              className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white"
            />
          ) : (
            <div className="w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white text-4xl font-bold shadow-lg">
              {doctor.full_name?.charAt(0) || 'D'}
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-white/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/20 rounded-full blur-xl"></div>
      </div>

      {/* Info Section */}
      <div className="p-5">
        {/* Name and Specialty */}
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
            {doctor.full_name || 'Doctor'}
          </h3>
          <p className="text-sm text-gray-600">{profile?.specialty || 'Médico General'}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-gray-900">4.9</span>
          </div>
          <span className="text-sm text-gray-500">
            (250 reseñas)
          </span>
        </div>

        {/* Stats Chips */}
        <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">{profile?.years_experience || 10}+</p>
              <p className="text-xs text-gray-500">Años</p>
            </div>
          </div>

          {profile?.clinic_name && (
            <div className="flex-1 ml-2">
              <p className="text-xs text-gray-500 truncate">{profile.clinic_name}</p>
            </div>
          )}
        </div>

        {/* Primary Action */}
        <button
          onClick={handleSchedule}
          className="w-full mb-3 px-4 py-3 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Agendar cita</span>
        </button>

        {/* Secondary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleViewProfile}
            className="flex-1 px-3 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
            title="Ver perfil"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </button>

          <button
            onClick={handleSendMessage}
            className="flex-1 px-3 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
            title="Enviar mensaje"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Mensaje</span>
          </button>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Más opciones"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-20">
                  <button
                    onClick={handleViewReviews}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Ver reseñas
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleRemove}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Quitar de mis doctores
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
