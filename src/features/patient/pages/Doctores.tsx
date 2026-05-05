import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Search, UserPlus, Loader2, Stethoscope } from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import DoctorGrid from '@/features/patient/components/DoctorGrid';
import DoctorList from '@/features/patient/components/DoctorList';
import { getPatientDoctors } from '@/features/patient/services/doctors';
import type { DoctorWithProfile } from '@/features/patient/services/doctors';
import { useAuth } from '@/app/providers/AuthContext';

type ViewMode = 'grid' | 'list';

const Doctores: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDoctors = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await getPatientDoctors(user.id);
    setDoctors(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Client-side filter for search within linked doctors
  const filteredDoctors = searchQuery
    ? doctors.filter((d) => {
        const q = searchQuery.toLowerCase();
        const nameMatch = d.full_name?.toLowerCase().includes(q);
        const specialtyMatch = d.doctor_profile?.specialty?.toLowerCase().includes(q);
        const clinicMatch = d.doctor_profile?.clinic_name?.toLowerCase().includes(q);
        return nameMatch || specialtyMatch || clinicMatch;
      })
    : doctors;

  const handleAddDoctor = () => {
    navigate('/directorio');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">
                Tus Doctores
              </h1>
              <p className="text-gray-500 font-medium">
                Gestiona tu equipo de salud y agenda citas rápidamente.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Tarjetas</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    viewMode === 'list'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
              </div>

              {/* Add Doctor Button */}
              <button
                onClick={handleAddDoctor}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-primary to-teal-400 text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Agregar doctor</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, especialidad o clínica..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-5">
          <p className="text-sm text-gray-500">
            Mostrando{' '}
            <span className="font-semibold text-gray-800">
              {filteredDoctors.length}
            </span>{' '}
            {filteredDoctors.length === 1 ? 'doctor' : 'doctores'}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#33C7BE] mb-3" />
            <p className="text-sm text-gray-400">Cargando doctores...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="mt-8 p-12 rounded-3xl bg-gray-50 flex flex-col items-center text-center border border-gray-100">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-5">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No se encontraron doctores' : 'Aún no tienes doctores agregados'}
            </h4>
            <p className="text-gray-500 max-w-md mx-auto mb-7 text-sm">
              {searchQuery
                ? 'Intenta ajustar tu búsqueda para explorar más especialistas.'
                : 'Comienza agregando doctores a tu lista para gestionar tus consultas y compartir documentos.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary font-bold text-sm hover:underline underline-offset-4"
              >
                Limpiar búsqueda
              </button>
            ) : (
              <button
                onClick={handleAddDoctor}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-primary to-teal-400 text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
              >
                <UserPlus className="w-4 h-4" />
                Buscar doctores
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <DoctorGrid doctors={filteredDoctors} onDoctorRemoved={loadDoctors} />
        ) : (
          <DoctorList doctors={filteredDoctors} onDoctorRemoved={loadDoctors} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Doctores;
