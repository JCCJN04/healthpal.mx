import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, SlidersHorizontal, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import PublicLayout from '@/features/public/components/PublicLayout';
import PublicDoctorCard from '@/features/public/components/PublicDoctorCard';
import DirectorioHeroSearch from '@/features/public/components/DirectorioHeroSearch';
import DirectorioFilters, {
  EMPTY_FILTERS,
  type DirectorioFilterValues,
} from '@/features/public/components/DirectorioFilters';
import {
  searchDoctorsAdvanced,
  type PublicDoctor,
  type SortOption,
} from '@/shared/lib/queries/publicDoctors';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'rating', label: 'Mejor valorados' },
  { value: 'experience', label: 'Más experiencia' },
  { value: 'name', label: 'Nombre A–Z' },
  { value: 'price_asc', label: 'Precio: menor' },
  { value: 'price_desc', label: 'Precio: mayor' },
  { value: 'availability', label: 'Disponibilidad' },
];

const PAGE_SIZE = 12;

/** Map dateRange UI value → ISO dates */
function dateRangeToDates(range: string): { from?: string; to?: string } {
  if (!range) return {};
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (range) {
    case 'today':
      return { from: fmt(today), to: fmt(today) };
    case 'tomorrow': {
      const tmrw = new Date(today);
      tmrw.setDate(tmrw.getDate() + 1);
      return { from: fmt(tmrw), to: fmt(tmrw) };
    }
    case 'week': {
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      return { from: fmt(today), to: fmt(end) };
    }
    default:
      return {};
  }
}

export default function DirectorioDoctores() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── URL-driven state ────────────────────────────────────────────────
  const initialQuery = searchParams.get('q') ?? '';
  const initialCity = searchParams.get('ciudad') ?? '';
  const initialSpecialty = searchParams.get('especialidad') ?? '';
  const initialSort = (searchParams.get('orden') ?? 'rating') as SortOption;
  const initialPage = Number(searchParams.get('pagina') ?? '1');

  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [filters, setFilters] = useState<DirectorioFilterValues>(EMPTY_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, city, specialty, sort, filters]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (city) params.set('ciudad', city);
    if (specialty) params.set('especialidad', specialty);
    if (sort !== 'rating') params.set('orden', sort);
    if (page > 1) params.set('pagina', String(page));
    setSearchParams(params, { replace: true });
  }, [query, city, specialty, sort, page, setSearchParams]);

  // Fetch doctors (advanced)
  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const dates = dateRangeToDates(filters.dateRange);
    const result = await searchDoctorsAdvanced({
      query: query || undefined,
      city: city || undefined,
      specialty: specialty || undefined,
      insurance: filters.insurance || undefined,
      acceptsVideo: filters.acceptsVideo ?? undefined,
      availableFrom: dates.from,
      availableTo: dates.to,
      sort,
      page,
      pageSize: PAGE_SIZE,
    });
    setDoctors(result.data);
    setTotalCount(result.totalCount);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [query, city, specialty, sort, page, filters]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const clearAll = () => {
    setQuery('');
    setCity('');
    setSpecialty('');
    setSort('rating');
    setPage(1);
    setFilters(EMPTY_FILTERS);
  };

  // Hero search handler
  const handleHeroSearch = (q: string, c: string, spec?: string) => {
    setCity(c);
    if (spec) {
      // Specialty was explicitly selected from the dropdown — use the slug,
      // and clear the text query so it doesn't interfere with the specialty filter.
      setSpecialty(spec);
      setQuery('');
    } else {
      setQuery(q);
    }
    setPage(1);
  };

  const hasActiveFilters =
    query || city || specialty || sort !== 'rating' ||
    filters.insurance || filters.acceptsVideo !== null || filters.dateRange;

  return (
    <PublicLayout>
      <Helmet>
        <title>Directorio de Doctores | HealthPal.mx</title>
        <meta
          name="description"
          content="Encuentra doctores verificados en México. Busca por especialidad, ubicación y consulta perfiles con reseñas reales de pacientes."
        />
      </Helmet>

      {/* ─── Hero search ─── */}
      <DirectorioHeroSearch
        initialQuery={query}
        initialCity={city}
        onSearch={handleHeroSearch}
      />

      {/* ─── Main content: sidebar + results ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar filters */}
          <DirectorioFilters
            values={filters}
            onChange={setFilters}
            mobileOpen={mobileFiltersOpen}
            onCloseMobile={() => setMobileFiltersOpen(false)}
          />

          {/* Results area */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Mobile filter toggle */}
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros
                </button>

                {/* Sort */}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
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
                    onClick={clearAll}
                    className="text-sm text-primary hover:underline"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-500">
                {loading
                  ? 'Buscando...'
                  : `${totalCount} doctor${totalCount !== 1 ? 'es' : ''} encontrado${totalCount !== 1 ? 's' : ''}`}
              </p>
            </div>

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
                  Intenta con otra búsqueda, ciudad o especialidad.
                </p>
                <button
                  onClick={clearAll}
                  className="text-primary hover:underline font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    {/* Page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 7) {
                          pageNum = i + 1;
                        } else if (page <= 4) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 3) {
                          pageNum = totalPages - 6 + i;
                        } else {
                          pageNum = page - 3 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum
                                ? 'bg-primary text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <span className="sm:hidden text-sm text-gray-600">
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
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
