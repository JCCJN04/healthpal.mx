import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, UserPlus, Loader2, Stethoscope } from 'lucide-react';
import { listDoctors, searchDoctors, linkDoctorToPatient } from '@/features/patient/services/doctors';
import type { DoctorWithProfile } from '@/features/patient/services/doctors';
import { showToast } from '@/shared/components/ui/Toast';
import { logger } from '@/shared/lib/logger';

interface AddDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  existingDoctorIds: string[];
  onDoctorAdded: () => void;
}

const AddDoctorModal: React.FC<AddDoctorModalProps> = ({
  isOpen,
  onClose,
  patientId,
  existingDoctorIds,
  onDoctorAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const loadDoctors = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const data = query ? await searchDoctors(query) : await listDoctors(50);
      // Filter out doctors already linked to this patient
      const filtered = (data || []).filter(d => !existingDoctorIds.includes(d.id));
      setDoctors(filtered);
    } catch (err) {
      logger.error('AddDoctorModal:loadDoctors', err);
    } finally {
      setLoading(false);
    }
  }, [existingDoctorIds]);

  useEffect(() => {
    if (isOpen) {
      loadDoctors(searchQuery);
    }
  }, [isOpen, searchQuery, loadDoctors]);

  const handleAddDoctor = async (doctorId: string) => {
    setLinkingId(doctorId);
    try {
      const success = await linkDoctorToPatient(patientId, doctorId);
      if (success) {
        showToast('Doctor agregado exitosamente', 'success');
        onDoctorAdded();
        // Remove from list
        setDoctors(prev => prev.filter(d => d.id !== doctorId));
      } else {
        showToast('Error al agregar doctor', 'error');
      }
    } catch (err) {
      logger.error('AddDoctorModal:handleAddDoctor', err);
      showToast('Error al agregar doctor', 'error');
    } finally {
      setLinkingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Agregar Doctor</h2>
            <p className="text-sm text-gray-500 mt-1">
              Busca y agrega un doctor a tu equipo de salud
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o especialidad..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-[#33C7BE]" />
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {searchQuery
                  ? 'No se encontraron doctores'
                  : 'No hay doctores disponibles'}
              </h3>
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? 'Intenta buscar con otros términos.'
                  : 'Todos los doctores ya están en tu equipo.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {doctors.map((doctor) => {
                const profile = doctor.doctor_profile;
                return (
                  <div
                    key={doctor.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {doctor.avatar_url ? (
                        <img
                          src={doctor.avatar_url}
                          alt={doctor.full_name || 'Doctor'}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white text-lg font-bold">
                          {doctor.full_name?.charAt(0) || 'D'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {doctor.full_name || 'Doctor'}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {profile?.specialty || 'Médico General'}
                        {profile?.clinic_name && ` · ${profile.clinic_name}`}
                      </p>
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => handleAddDoctor(doctor.id)}
                      disabled={linkingId === doctor.id}
                      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linkingId === doctor.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>Agregar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDoctorModal;
