import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { SPECIALTIES, type SpecialtyDefinition } from '@/shared/lib/specialties';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// ─── Props ─────────────────────────────────────────────────────────────────

interface DirectorioHeroSearchProps {
  initialQuery?: string;
  initialCity?: string;
  onSearch: (query: string, city: string, specialty?: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface CitySuggestion {
  id: string;
  placeName: string;
  fullText: string;
}

const POPULAR_CITIES: CitySuggestion[] = [
  { id: 'cdmx', placeName: 'Ciudad de México', fullText: 'Ciudad de México, México' },
  { id: 'gdl', placeName: 'Guadalajara', fullText: 'Guadalajara, Jalisco, México' },
  { id: 'mty', placeName: 'Monterrey', fullText: 'Monterrey, Nuevo León, México' },
  { id: 'pue', placeName: 'Puebla', fullText: 'Puebla, México' },
  { id: 'qro', placeName: 'Querétaro', fullText: 'Querétaro, México' },
  { id: 'mer', placeName: 'Mérida', fullText: 'Mérida, Yucatán, México' },
  { id: 'tij', placeName: 'Tijuana', fullText: 'Tijuana, Baja California, México' },
  { id: 'leo', placeName: 'León', fullText: 'León, Guanajuato, México' },
  { id: 'can', placeName: 'Cancún', fullText: 'Cancún, Quintana Roo, México' },
];

function matchSpecialties(input: string, limit = 6): SpecialtyDefinition[] {
  if (!input || input.length < 2) return [];
  const lower = input.toLowerCase();
  return SPECIALTIES.filter(
    (s) =>
      s.label.toLowerCase().includes(lower) ||
      s.group.toLowerCase().includes(lower),
  ).slice(0, limit);
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function DirectorioHeroSearch({
  initialQuery = '',
  initialCity = '',
  onSearch,
}: DirectorioHeroSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [suggestions, setSuggestions] = useState<SpecialtyDefinition[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>(POPULAR_CITIES);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);

  const queryRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowCitySuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Autocomplete specialties
  useEffect(() => {
    const results = matchSpecialties(query);
    setSuggestions(results);
    setShowSuggestions(results.length > 0 && query.length >= 2);
  }, [query]);

  // City autocomplete via Mapbox (fallback: popular cities)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!city.trim() || city.length < 2) {
      setCitySuggestions(POPULAR_CITIES);
      return;
    }

    if (!MAPBOX_TOKEN) {
      // No token — filter local list
      const lower = city.toLowerCase();
      const matches = POPULAR_CITIES.filter((c) =>
        c.placeName.toLowerCase().includes(lower),
      );
      setCitySuggestions(matches.length > 0 ? matches : POPULAR_CITIES);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const url = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city.trim())}.json`,
        );
        url.searchParams.set('access_token', MAPBOX_TOKEN);
        url.searchParams.set('limit', '6');
        url.searchParams.set('language', 'es');
        url.searchParams.set('country', 'mx');
        url.searchParams.set('types', 'place,locality,district');

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Mapbox error');

        const data = await res.json();
        const results: CitySuggestion[] = (data.features || []).map((f: any) => ({
          id: f.id,
          placeName: f.text,
          fullText: f.place_name,
        }));

        setCitySuggestions(results.length > 0 ? results : POPULAR_CITIES);
      } catch {
        const lower = city.toLowerCase();
        const matches = POPULAR_CITIES.filter((c) =>
          c.placeName.toLowerCase().includes(lower),
        );
        setCitySuggestions(matches.length > 0 ? matches : POPULAR_CITIES);
      } finally {
        setCityLoading(false);
      }
    }, 300);
  }, [city]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      setShowSuggestions(false);
      setShowCitySuggestions(false);
      onSearch(query.trim(), city.trim());
    },
    [query, city, onSearch],
  );

  const selectSpecialty = (s: SpecialtyDefinition) => {
    setQuery(s.label);
    setShowSuggestions(false);
    // Submit with the slug so the specialty param is used for exact match
    onSearch(s.label, city.trim(), s.value);
    cityRef.current?.focus();
  };

  const selectCity = (s: CitySuggestion) => {
    setCity(s.placeName);
    setShowCitySuggestions(false);
    onSearch(query.trim(), s.placeName);
  };

  return (
    <section className="bg-gradient-to-br from-primary via-primary to-blue-700 py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center" ref={containerRef}>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
          Encuentra al especialista ideal
        </h1>
        <p className="text-primary-100 text-sm sm:text-base mb-8 max-w-xl mx-auto">
          Busca por enfermedad, especialidad o nombre del doctor y agenda tu cita en minutos.
        </p>

        <form
          onSubmit={handleSubmit}
          className="relative bg-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch overflow-visible"
        >
          {/* ─ Query input ─ */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              ref={queryRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Enfermedad, especialidad o nombre..."
              className="w-full pl-12 pr-4 py-4 text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 text-gray-800"
              autoComplete="off"
            />

            {/* Specialty suggestions dropdown */}
            {showSuggestions && (
              <ul className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-b-xl shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((s) => (
                  <li key={s.value}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 flex items-center gap-2"
                      onClick={() => selectSpecialty(s)}
                    >
                      <span className="text-gray-800">{s.label}</span>
                      <span className="text-xs text-gray-400 ml-auto">{s.group}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ─ Divider ─ */}
          <div className="hidden sm:block w-px bg-gray-200 my-2" />
          <div className="sm:hidden h-px bg-gray-200 mx-4" />

          {/* ─ City input ─ */}
          <div className="relative flex-1 min-w-0">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              ref={cityRef}
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onFocus={() => setShowCitySuggestions(true)}
              placeholder="Ciudad o municipio"
              className="w-full pl-12 pr-10 py-4 text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 text-gray-800"
              autoComplete="off"
            />
            {cityLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin pointer-events-none" />
            )}

            {/* City suggestions dropdown */}
            {showCitySuggestions && (
              <ul className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-b-xl shadow-lg max-h-60 overflow-y-auto">
                {citySuggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 flex items-center gap-2"
                      onClick={() => selectCity(s)}
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-gray-800 block">{s.placeName}</span>
                        <span className="text-xs text-gray-400 truncate block">{s.fullText}</span>
                      </div>
                    </button>
                  </li>
                ))}
                {MAPBOX_TOKEN && (
                  <li className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 text-right">Powered by Mapbox</p>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* ─ Submit button ─ */}
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 sm:px-8 py-4 sm:rounded-r-2xl transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>

        {/* Quick specialty pills */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {[
            { label: 'Medicina general', slug: 'medicina_general' },
            { label: 'Dermatología', slug: 'dermatologia' },
            { label: 'Psiquiatría', slug: 'psiquiatria' },
            { label: 'Ginecología', slug: 'ginecologia' },
            { label: 'Cardiología', slug: 'cardiologia' },
            { label: 'Pediatría', slug: 'pediatria' },
          ].map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => {
                  setQuery(item.label);
                  onSearch(item.label, city.trim(), item.slug);
                }}
                className="text-xs sm:text-sm bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm"
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
