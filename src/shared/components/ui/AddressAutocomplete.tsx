import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'
import { logger } from '@/shared/lib/logger'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

interface Suggestion {
  id: string
  placeName: string
  /** Full address text returned by Mapbox */
  fullText: string
  lat: number
  lng: number
}

interface AddressAutocompleteProps {
  label: string
  value: string
  onChange: (address: string) => void
  onCoordinatesChange?: (coords: { lat: number; lng: number } | null) => void
  placeholder?: string
  error?: string
  required?: boolean
  helpText?: string
}

export default function AddressAutocomplete({
  label,
  value,
  onChange,
  onCoordinatesChange,
  placeholder = 'Escribe una dirección...',
  error,
  required,
  helpText,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const sessionTokenRef = useRef(crypto.randomUUID())

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!MAPBOX_TOKEN || query.trim().length < 3) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const url = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json`,
        )
        url.searchParams.set('access_token', MAPBOX_TOKEN)
        url.searchParams.set('limit', '5')
        url.searchParams.set('language', 'es')
        url.searchParams.set('country', 'mx')
        url.searchParams.set('types', 'address,poi,place,locality,neighborhood')

        const res = await fetch(url.toString())
        if (!res.ok) {
          logger.error('AddressAutocomplete: Mapbox error', { status: res.status })
          setSuggestions([])
          return
        }

        const data = await res.json()
        const results: Suggestion[] = (data.features || []).map((f: any) => ({
          id: f.id,
          placeName: f.text,
          fullText: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        }))

        setSuggestions(results)
        setShowSuggestions(results.length > 0)
      } catch (err) {
        logger.error('AddressAutocomplete: fetch error', err)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const handleInputChange = (text: string) => {
    onChange(text)
    onCoordinatesChange?.(null) // coords invalidated until user picks a suggestion

    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text)
    }, 350)
  }

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.fullText)
    onCoordinatesChange?.({ lat: suggestion.lat, lng: suggestion.lng })
    setShowSuggestions(false)
    setSuggestions([])
    // Refresh session token after retrieval
    sessionTokenRef.current = crypto.randomUUID()
  }

  const handleClear = () => {
    onChange('')
    onCoordinatesChange?.(null)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const noToken = !MAPBOX_TOKEN

  return (
    <div className="mb-4 relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true)
            if (suggestions.length > 0) setShowSuggestions(true)
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-10 py-2.5 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            error ? 'border-red-500' : isFocused ? 'border-primary' : 'border-gray-300'
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          {value && !isLoading && (
            <button type="button" onClick={handleClear} className="p-0.5 hover:bg-gray-100 rounded">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2.5 hover:bg-primary/5 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.placeName}</p>
                  <p className="text-xs text-gray-500 truncate">{s.fullText}</p>
                </div>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-right">Powered by Mapbox</p>
          </div>
        </div>
      )}

      {noToken && (
        <p className="mt-1 text-xs text-amber-600">
          Autocompletado no disponible. Escribe la dirección manualmente.
        </p>
      )}
      {helpText && !error && !noToken && <p className="mt-1 text-sm text-gray-500">{helpText}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
