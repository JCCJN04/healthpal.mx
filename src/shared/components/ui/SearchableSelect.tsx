import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'

interface Option {
  value: string
  label: string
  group?: string
}

interface SearchableSelectProps {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  error?: string
  required?: boolean
  helpText?: string
  grouped?: boolean
}

export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  error,
  required,
  helpText,
  grouped = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label

  // Filter options based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return options.filter((o) => {
      const normalized = o.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return normalized.includes(q)
    })
  }, [options, search])

  // Group filtered options if grouped mode
  const groups = useMemo(() => {
    if (!grouped) return null
    const map = new Map<string, Option[]>()
    for (const opt of filtered) {
      const g = opt.group || 'Otros'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(opt)
    }
    return map
  }, [filtered, grouped])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  const renderOptions = (opts: Option[]) =>
    opts.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => handleSelect(opt.value)}
        className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors flex items-center justify-between ${
          opt.value === value ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700'
        }`}
      >
        <span>{opt.label}</span>
        {opt.value === value && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
      </button>
    ))

  return (
    <div className="mb-4 relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 border rounded-lg flex items-center justify-between bg-white text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          error ? 'border-red-500' : isOpen ? 'border-primary ring-2 ring-primary/50' : 'border-gray-300'
        }`}
      >
        <span className={selectedLabel ? 'text-gray-900' : 'text-gray-400'}>
          {selectedLabel || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                No se encontraron resultados
              </div>
            ) : grouped && groups ? (
              Array.from(groups.entries()).map(([groupName, opts]) => (
                <div key={groupName}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                    {groupName}
                  </div>
                  {renderOptions(opts)}
                </div>
              ))
            ) : (
              renderOptions(filtered)
            )}
          </div>
        </div>
      )}

      {helpText && !error && <p className="mt-1 text-sm text-gray-500">{helpText}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
