import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Filter, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import PublicLayout from '@/features/public/components/PublicLayout';
import PublicDoctorCard from '@/features/public/components/PublicDoctorCard';
import {
  searchPublicDoctors,
  getPublicSpecialties,
  type PublicDoctor,
  type SpecialtyOption,
} from '@/shared/lib/queries/publicDoctors';

const SORT_OPTIONS = [
  { value: 'rating', label: 'Mejor valorados' },
  { value: 'experience', label: 'Más experiencia' },
  { value: 'name', label: 'Nombre A–Z' },
] as const;

const PAGE_SIZE = 12;

export default function DirectorioDoctores() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract URL params
  const initialQuery = searchParams.get('q') ?? '';
  const initialSpecialty = searchParams.get('especialidad') ?? '';
  const initialSort = (searchParams.get('orden') ?? 'rating') as 'rating' | 'experience' | 'name';
  const initialPage = Number(searchParams.get('pagina') ?? '1');

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [sort, setSort] = useState<'rating' | 'experience' | 'name'>(initialSort);
  const [page, setPage] = useState(initialPage);

  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Load specialties once
  useEffect(() => {
    getPublicSpecialties().then(setSpecialties);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, specialty, sort]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (specialty) params.set('especialidad', specialty);
    if (sort !== 'rating') params.set('orden', sort);
    if (page > 1) params.set('pagina', String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, specialty, sort, page, setSearchParams]);

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const result = await searchPublicDoctors({
      query: debouncedQuery || undefined,
      specialty: specialty || undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    });
    setDoctors(result.data);
    setTotalCount(result.totalCount);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [debouncedQuery, specialty, sort, page]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const clearFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSpecialty('');
    setSort('rating');
    setPage(1);
  };

  const hasActiveFilters = debouncedQuery || specialty || sort !== 'rating';

  return (
    <PublicLayout>
      <Helmet>
        <title>Directorio de Doctores | HealthPal.mx</title>
        <meta
          name="description"
          content="Encuentra doctores verificados en México. Busca por especialidad, ubicación y consulta perfiles con reseñas reales de pacientes."
        />
      </Helmet>

      {/* Hero header */}
      <section className="bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Encuentra al Doctor Ideal
          </h1>
          <p className="text-teal-100 text-lg max-w-2xl mx-auto mb-8">
            Explora nuestro directorio de doctores verificados. Consulta perfiles,
            reseñas y agenda tu cita.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, especialidad o ubicación..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 bg-white shadow-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 text-base"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filters + results */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <p className="text-sm text-gray-500">
            {loading ? 'Buscando...' : `${totalCount} doctor${totalCount !== 1 ? 'es' : ''} encontrado${totalCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Specialty pills */}
        {showFilters && specialties.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">Especialidad</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSpecialty('')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !specialty
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              {specialties.map((s) => (
                <button
                  key={s.specialty}
                  onClick={() => setSpecialty(s.specialty)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    specialty === s.specialty
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.specialty}
                  <span className="ml-1 opacity-60">({s.doctor_count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Buscando doctores...</p>
            </div>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No se encontraron doctores
            </h3>
            <p className="text-gray-500 mb-4">
              Intenta con otra búsqueda o especialidad.
            </p>
            <button
              onClick={clearFilters}
              className="text-primary hover:underline font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <PublicDoctorCard key={doc.slug} doctor={doc} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>

                <span className="text-sm text-gray-600">
                  Página {page} de {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </PublicLayout>
  );
}
