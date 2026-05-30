import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutGrid, List, Search, UserPlus, Loader2, Stethoscope, X, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import DoctorGrid from '@/features/patient/components/DoctorGrid';
import DoctorList from '@/features/patient/components/DoctorList';
import { getPatientDoctors, linkDoctorToPatient } from '@/features/patient/services/doctors';
import type { DoctorWithProfile } from '@/features/patient/services/doctors';
import { useAuth } from '@/app/providers/AuthContext';
import { supabase } from '@/shared/lib/supabase';

type ViewMode = 'grid' | 'list';

interface SearchResult {
  id: string;
  full_name: string;
  avatar_url: string | null;
  specialty: string | null;
  clinic_name: string | null;
}

interface AddDoctorModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  linkedDoctorIds: Set<string>;
  onAdded: () => void;
}

function AddDoctorModal({ open, onClose, patientId, linkedDoctorIds, onAdded }: AddDoctorModalProps) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setTerm('');
      setResults([]);
      setAdded(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!term.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const q = `%${term.trim()}%`;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, doctor_profiles(specialty, clinic_name)')
        .eq('role', 'doctor')
        .ilike('full_name', q)
        .limit(10);
      const seen = new Set<string>();
      type RawProfile = { id: string; full_name: string; avatar_url: string | null; doctor_profiles: { specialty: string | null; clinic_name: string | null }[] | null }
      const mapped: SearchResult[] = (data || []).reduce((acc: SearchResult[], p: RawProfile) => {
        if (seen.has(p.id)) return acc;
        seen.add(p.id);
        acc.push({
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          specialty: p.doctor_profiles?.[0]?.specialty ?? null,
          clinic_name: p.doctor_profiles?.[0]?.clinic_name ?? null,
        });
        return acc;
      }, []);
      setResults(mapped);
      setSearching(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [term]);

  const handleAdd = async (doctorId: string) => {
    setAdding(prev => new Set(prev).add(doctorId));
    await linkDoctorToPatient(patientId, doctorId);
    setAdded(prev => new Set(prev).add(doctorId));
    onAdded();
    setAdding(prev => { const s = new Set(prev); s.delete(doctorId); return s; });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Agregar doctor</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="Buscar por nombre, especialidad o clínica..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 px-5 pb-5">
          {searching && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
          {!searching && term.trim() && results.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No se encontraron doctores.</p>
          )}
          {!searching && !term.trim() && (
            <p className="text-center text-sm text-gray-400 py-8">Escribe el nombre o especialidad del doctor.</p>
          )}
          {!searching && results.map(r => {
            const isLinked = linkedDoctorIds.has(r.id) || added.has(r.id);
            const isAdding = adding.has(r.id);
            return (
              <div key={r.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt={r.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[r.specialty, r.clinic_name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {isLinked ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Agregado
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(r.id)}
                    disabled={isAdding}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                    Agregar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const Doctores: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Set of doctor IDs for already-linked doctors (used by modal to show "Agregado")
  const linkedSlugs = new Set(doctors.map(d => d.id));

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
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <AddDoctorModal
        open={showModal}
        onClose={() => setShowModal(false)}
        patientId={user?.id ?? ''}
        linkedDoctorIds={linkedSlugs}
        onAdded={loadDoctors}
      />
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
