import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, MoreVertical, MessageCircle } from 'lucide-react';
import { DoctorWithProfile } from '@/features/patient/services/doctors';

interface DoctorListProps {
  doctors: DoctorWithProfile[];
}

const DoctorList: React.FC<DoctorListProps> = ({ doctors }) => {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleViewProfile = (doctorId: string) => {
    navigate(`/dashboard/doctores/${doctorId}`);
  };

  const handleSchedule = (doctorId: string) => {
    navigate(`/dashboard/consultas/nueva?doctor=${doctorId}`);
  };

  const handleSendMessage = (doctor: DoctorWithProfile) => {
    navigate(`/dashboard/mensajes?with=${doctor.id}`);
    setOpenMenuId(null);
  };

  const handleRemove = (doctor: DoctorWithProfile) => {
    setOpenMenuId(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Doctor
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Especialidad
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {doctors.map((doctor) => {
              const profile = doctor.doctor_profile;
              return (
                <tr
                  key={doctor.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Doctor Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {doctor.avatar_url ? (
                        <img
                          src={doctor.avatar_url}
                          alt={doctor.full_name || 'Doctor'}
                          className="w-12 h-12 rounded-full object-cover shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white shadow-sm flex-shrink-0">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {doctor.full_name || 'Doctor'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {doctor.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Specialty */}
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{profile?.specialty || 'Médico General'}</p>
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4">
                    <p className="text-gray-600 text-sm">{profile?.clinic_name || '-'}</p>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewProfile(doctor.id)}
                        className="px-4 py-2 bg-[#33C7BE] text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
                      >
                        Ver perfil
                      </button>
                      <button
                        onClick={() => handleSchedule(doctor.id)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Agendar</span>
                      </button>

                      {/* More Menu */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === doctor.id ? null : doctor.id
                            )
                          }
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {openMenuId === doctor.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => handleSendMessage(doctor)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Enviar mensaje
                              </button>
                              <button
                                onClick={() => handleRemove(doctor)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                Quitar de mis doctores
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorList;
