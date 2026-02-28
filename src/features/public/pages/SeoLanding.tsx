import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Search,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  ArrowLeft,
} from 'lucide-react';
import PublicLayout from '@/features/public/components/PublicLayout';
import PublicDoctorCard from '@/features/public/components/PublicDoctorCard';
import {
  searchDoctorsSeo,
  type PublicDoctor,
} from '@/shared/lib/queries/publicDoctors';
import { SPECIALTIES } from '@/shared/lib/specialties';
import {
  buildDoctorListJsonLd,
  buildBreadcrumbJsonLd,
} from '@/shared/lib/seoJsonLd';

// ─── Helpers ───────────────────────────────────────────────────────────────

const POPULAR_CITIES: Record<string, string> = {
  'ciudad-de-mexico': 'Ciudad de México',
  guadalajara: 'Guadalajara',
  monterrey: 'Monterrey',
  puebla: 'Puebla',
  queretaro: 'Querétaro',
  merida: 'Mérida',
  tijuana: 'Tijuana',
  leon: 'León',
  cancun: 'Cancún',
  toluca: 'Toluca',
  'san-luis-potosi': 'San Luis Potosí',
  chihuahua: 'Chihuahua',
  aguascalientes: 'Aguascalientes',
  morelia: 'Morelia',
  oaxaca: 'Oaxaca',
  veracruz: 'Veracruz',
  villahermosa: 'Villahermosa',
};

function slugToLabel(slug: string): string {
  const spec = SPECIALTIES.find((s) => s.value === slug);
  if (spec) return spec.label;

  // Try city map
  if (POPULAR_CITIES[slug]) return POPULAR_CITIES[slug];

  // Fallback: un-slug
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function citySlugToName(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return POPULAR_CITIES[slug] ?? slugToLabel(slug);
}

const PAGE_SIZE = 12;

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * SEO Landing Page for routes like:
 *   /especialistas/:specialty
 *   /especialistas/:specialty/:city
 *
 * Acts as a pre-filtered directory with optimised Helmet tags and JSON-LD.
 */
export default function SeoLanding() {
  const { specialty: specSlug, city: citySlug } = useParams<{
    specialty: string;
    city?: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('pagina') ?? '1');

  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const specialtyLabel = slugToLabel(specSlug ?? '');
  const cityName = citySlugToName(citySlug);

  // Build SEO title & description
  const title = cityName
    ? `${specialtyLabel} en ${cityName} — Mejores Doctores | HealthPal.mx`
    : `${specialtyLabel} — Mejores Doctores en México | HealthPal.mx`;

  const description = cityName
    ? `Encuentra los mejores especialistas en ${specialtyLabel} en ${cityName}. Consulta perfiles verificados, reseñas de pacientes reales y agenda tu cita en línea.`
    : `Directorio de doctores especialistas en ${specialtyLabel} en México. Perfiles verificados, reseñas reales y agenda en línea en HealthPal.mx.`;

  const canonicalUrl = citySlug
    ? `/especialistas/${specSlug}/${citySlug}`
    : `/especialistas/${specSlug}`;

  // Fetch
  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const result = await searchDoctorsSeo({
      specialty: specSlug || undefined,
      city: cityName || undefined,
      sort: 'rating',
      page,
      pageSize: PAGE_SIZE,
    });
    setDoctors(result.data);
    setTotalCount(result.totalCount);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [specSlug, cityName, page]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    if (p > 1) params.set('pagina', String(p));
    else params.delete('pagina');
    setSearchParams(params, { replace: true });
  };

  // Breadcrumbs
  const breadcrumbs = [
    { name: 'Directorio', url: '/directorio' },
    { name: specialtyLabel, url: `/especialistas/${specSlug}` },
    ...(cityName ? [{ name: cityName, url: canonicalUrl }] : []),
  ];

  // Related specialties (show a few)
  const relatedSpecs = SPECIALTIES.filter((s) => s.value !== specSlug).slice(0, 6);

  // Related cities (if no city selected yet)
  const relatedCities = Object.entries(POPULAR_CITIES)
    .filter(([slug]) => slug !== citySlug)
    .slice(0, 8);

  return (
    <PublicLayout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://healthpal.mx${canonicalUrl}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://healthpal.mx${canonicalUrl}`} />
        <meta property="og:type" content="website" />

        {/* JSON-LD: Breadcrumb */}
        <script type="application/ld+json">
          {buildBreadcrumbJsonLd(breadcrumbs)}
        </script>

        {/* JSON-LD: ItemList (doctor Rich Snippets) */}
        {doctors.length > 0 && (
          <script type="application/ld+json">
            {buildDoctorListJsonLd(
              doctors,
              `Especialistas en ${specialtyLabel}${cityName ? ` en ${cityName}` : ''}`,
              canonicalUrl,
            )}
          </script>
        )}
      </Helmet>

      {/* ─── Hero ─── */}
      <div className="bg-gradient-to-br from-[#33C7BE] via-teal-500 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <Link
            to="/directorio"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Ver todo el directorio
          </Link>

          <div className="flex items-center justify-center gap-3 mb-4">
            <Stethoscope className="w-8 h-8 text-white/80" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              {specialtyLabel}
            </h1>
          </div>

          {cityName && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-white/80" />
              <span className="text-xl text-white/90 font-medium">{cityName}</span>
            </div>
          )}

          <p className="text-white/80 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            {totalCount > 0
              ? `${totalCount} doctor${totalCount !== 1 ? 'es' : ''} verificado${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''}.`
              : 'Buscando doctores disponibles…'}
            {' '}Agenda tu cita en línea con los mejores especialistas.
          </p>
        </div>
      </div>

      {/* ─── Breadcrumb bar ─── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-xs text-gray-500">
            <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
            {breadcrumbs.map((bc, i) => (
              <span key={bc.url} className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3" />
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-medium">{bc.name}</span>
                ) : (
                  <Link to={bc.url} className="hover:text-primary transition-colors">
                    {bc.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>

      {/* ─── Results ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Buscando doctores…</p>
            </div>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              No se encontraron doctores
            </h2>
            <p className="text-gray-500 mb-6">
              Aún no hay especialistas en {specialtyLabel}
              {cityName ? ` en ${cityName}` : ''} registrados.
            </p>
            <Link
              to="/directorio"
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver directorio completo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {totalCount} doctor{totalCount !== 1 ? 'es' : ''}
              </h2>
            </div>

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
                  onClick={() => setPage(Math.max(1, page - 1))}
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
                  onClick={() => setPage(page + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── Related cities (internal linking for SEO) ─── */}
        {!citySlug && relatedCities.length > 0 && (
          <div className="mt-12 border-t border-gray-100 pt-8">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
              {specialtyLabel} por ciudad
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedCities.map(([slug, name]) => (
                <Link
                  key={slug}
                  to={`/especialistas/${specSlug}/${slug}`}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─── Related specialties (internal linking for SEO) ─── */}
        <div className="mt-8 border-t border-gray-100 pt-8">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            Otras especialidades
          </h3>
          <div className="flex flex-wrap gap-2">
            {relatedSpecs.map((s) => (
              <Link
                key={s.value}
                to={citySlug ? `/especialistas/${s.value}/${citySlug}` : `/especialistas/${s.value}`}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
