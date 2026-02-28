import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { SPECIALTIES, type SpecialtyDefinition } from '@/shared/lib/specialties';

// ─── Props ─────────────────────────────────────────────────────────────────

interface DirectorioHeroSearchProps {
  initialQuery?: string;
  initialCity?: string;
  onSearch: (query: string, city: string, specialty?: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const POPULAR_CITIES = [
  'Ciudad de México',
  'Guadalajara',
  'Monterrey',
  'Puebla',
  'Querétaro',
  'Mérida',
  'Tijuana',
  'León',
  'Cancún',
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
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const queryRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // City autocomplete (simple local match)
  useEffect(() => {
    if (city.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    const lower = city.toLowerCase();
    const matches = POPULAR_CITIES.filter((c) => c.toLowerCase().includes(lower));
    setCitySuggestions(matches);
    setShowCitySuggestions(matches.length > 0);
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

  const selectCity = (c: string) => {
    setCity(c);
    setShowCitySuggestions(false);
    // Auto-submit
    onSearch(query.trim(), c.trim());
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
              onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
              placeholder="Ciudad o código postal"
              className="w-full pl-12 pr-4 py-4 text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 text-gray-800"
              autoComplete="off"
            />

            {/* City suggestions dropdown */}
            {showCitySuggestions && (
              <ul className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-b-xl shadow-lg max-h-48 overflow-y-auto">
                {citySuggestions.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 flex items-center gap-2"
                      onClick={() => selectCity(c)}
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-800">{c}</span>
                    </button>
                  </li>
                ))}
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
