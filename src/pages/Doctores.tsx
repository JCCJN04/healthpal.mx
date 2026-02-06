import React, { useState, useEffect } from 'react';
import { Grid3x3, List, Search, Filter, UserPlus, Loader2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import DoctorGrid from '../components/DoctorGrid';
import DoctorList from '../components/DoctorList';
import { listDoctors, searchDoctors as searchDoctorsQuery } from '../lib/queries/doctors';
import type { DoctorWithProfile } from '../lib/queries/doctors';

type ViewMode = 'grid' | 'list';

const Doctores: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      handleSearch();
    } else {
      loadDoctors();
    }
  }, [searchQuery]);

  const loadDoctors = async () => {
    setLoading(true);
    const data = await listDoctors(50);
    setDoctors(data || []);
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    const data = await searchDoctorsQuery(searchQuery);
    setDoctors(data || []);
    setLoading(false);
  };

  const handleAddDoctor = () => {
    console.log('Add doctor clicked');
    // TODO: Navigate to search/add doctor page
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Tus Doctores
              </h1>
              <p className="text-gray-600">
                Revisa los detalles de todos tus doctores
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    viewMode === 'grid'
                      ? 'bg-[#33C7BE] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'bg-[#33C7BE] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o especialidad..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent shadow-sm"
              />
            </div>

            {/* Filters Button (UI only) */}
            <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>

            {/* Add Doctor Button */}
            <button
              onClick={handleAddDoctor}
              className="flex items-center gap-2 px-4 py-3 bg-[#33C7BE] text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar doctor</span>
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Mostrando{' '}
            <span className="font-semibold text-gray-900">
              {doctors.length}
            </span>{' '}
            {doctors.length === 1 ? 'doctor' : 'doctores'}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#33C7BE]" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-[#33C7BE]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {searchQuery
                  ? 'No se encontraron doctores'
                  : 'Aún no tienes doctores agregados'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'Intenta buscar con otros términos o explora nuestro directorio completo.'
                  : 'Comienza agregando doctores a tu lista para gestionar tus consultas más fácilmente.'}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors shadow-sm"
                >
                  Limpiar búsqueda
                </button>
              ) : (
                <button
                  onClick={handleAddDoctor}
                  className="px-6 py-3 bg-[#33C7BE] text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors shadow-sm flex items-center gap-2 mx-auto"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Buscar doctores</span>
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <DoctorGrid doctors={doctors} />
        ) : (
          <DoctorList doctors={doctors} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Doctores;
