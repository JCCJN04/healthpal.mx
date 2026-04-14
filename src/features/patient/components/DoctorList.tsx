import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MoreVertical, Star, Stethoscope, MapPin, Clock, UserX, DollarSign, ShieldCheck } from 'lucide-react';
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
  const handleSendMessage = (doctor: DoctorWithProfile) => {
    const phone = doctor.phone;
    if (!phone) {
      showToast('Este doctor no tiene número de WhatsApp registrado', 'error');
      setOpenMenuId(null);
      return;
    }
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('52') ? cleaned : `52${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
    setOpenMenuId(null);
  };

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
                  className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30 transition-colors"
                  title="Enviar WhatsApp"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
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
