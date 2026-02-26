import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MoreVertical, MessageCircle, Star, Stethoscope, MapPin, Clock, UserX, DollarSign, ShieldCheck } from 'lucide-react';
import { DoctorWithProfile, unlinkDoctorFromPatient } from '@/features/patient/services/doctors';
import { showToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/app/providers/AuthContext';
import { formatSpecialty } from '@/shared/lib/specialties';

interface DoctorListProps {
  doctors: DoctorWithProfile[];
  onDoctorRemoved?: () => void;
}

const DoctorList: React.FC<DoctorListProps> = ({ doctors, onDoctorRemoved }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleViewProfile = (doctorId: string) => navigate(`/dashboard/doctores/${doctorId}`);
  const handleSchedule = (doctorId: string) => navigate(`/dashboard/consultas/nueva?doctor=${doctorId}`);
  const handleSendMessage = (doctor: DoctorWithProfile) => { navigate(`/dashboard/mensajes?with=${doctor.id}`); setOpenMenuId(null); };

  const handleRemove = async (doctor: DoctorWithProfile) => {
    setOpenMenuId(null);
    if (!user?.id) return;
    const success = await unlinkDoctorFromPatient(user.id, doctor.id);
    if (success) { showToast('Doctor removido de tu lista', 'success'); onDoctorRemoved?.(); }
    else { showToast('Error al remover doctor', 'error'); }
  };

  return (
    <div className="space-y-3">
      {doctors.map((doctor) => {
        const profile = doctor.doctor_profile;
        const stats = doctor.review_stats;
        const initials = doctor.full_name
          ? doctor.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
          : 'DR';

        return (
          <div
            key={doctor.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#33C7BE]/20 transition-all duration-200 p-4"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {doctor.avatar_url ? (
                <img
                  src={doctor.avatar_url}
                  alt={doctor.full_name || 'Doctor'}
                  className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#33C7BE] to-teal-600 flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                  {initials}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className="font-bold text-gray-900 truncate cursor-pointer hover:text-[#33C7BE] transition-colors"
                    onClick={() => handleViewProfile(doctor.id)}
                  >
                    {doctor.full_name || 'Doctor'}
                  </h3>
                  {profile?.professional_license && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium flex-shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      Verificado
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                    {formatSpecialty(profile?.specialty)}
                  </span>

                  <span className="text-gray-300 hidden sm:inline">·</span>

                  <span className="text-sm text-gray-500 flex items-center gap-1 hidden sm:flex">
                    <Star className={`w-3.5 h-3.5 ${stats && stats.avg_rating > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    {stats && stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '—'}
                    <span className="text-xs text-gray-400 ml-0.5">
                      ({stats && stats.review_count > 0 ? stats.review_count : 0})
                    </span>
                  </span>

                  {profile?.years_experience && (
                    <>
                      <span className="text-gray-300 hidden md:inline">·</span>
                      <span className="text-sm text-gray-500 items-center gap-1 hidden md:flex">
                        <Clock className="w-3.5 h-3.5" />
                        {profile.years_experience} años
                      </span>
                    </>
                  )}

                  {profile?.consultation_price_mxn && (
                    <>
                      <span className="text-gray-300 hidden sm:inline">·</span>
                      <span className="text-sm font-semibold text-green-700 items-center gap-1 hidden sm:flex">
                        <DollarSign className="w-3.5 h-3.5" />
                        ${profile.consultation_price_mxn.toLocaleString('es-MX')}
                      </span>
                    </>
                  )}

                  {profile?.clinic_name && (
                    <>
                      <span className="text-gray-300 hidden xl:inline">·</span>
                      <span className="text-sm text-gray-400 items-center gap-1 hidden xl:flex">
                        <MapPin className="w-3.5 h-3.5 text-gray-300" />
                        <span className="truncate max-w-[160px]">{profile.clinic_name}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleSchedule(doctor.id)}
                  className="px-4 py-2 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Agendar</span>
                </button>
                <button
                  onClick={() => handleSendMessage(doctor)}
                  className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-[#33C7BE] transition-colors"
                  title="Enviar mensaje"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === doctor.id ? null : doctor.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === doctor.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => { handleViewProfile(doctor.id); setOpenMenuId(null); }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Ver perfil completo
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => handleRemove(doctor)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <UserX className="w-3.5 h-3.5" />
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
      })}
    </div>
  );
};

export default DoctorList;
