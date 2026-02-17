import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface BaseFieldProps {
  label: string
  error?: string
  required?: boolean
  helpText?: string
}

interface InputFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'tel' | 'date' | 'number'
}

interface SelectFieldProps extends BaseFieldProps, SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

interface TextareaFieldProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function InputField({ label, error, required, helpText, className = '', ...props }: InputFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export function SelectField({ label, error, required, helpText, options, className = '', ...props }: SelectFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none bg-white ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        <option value="">Seleccionar...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export function TextareaField({ label, error, required, helpText, className = '', ...props }: TextareaFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        rows={4}
        {...props}
      />
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

interface PhoneFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  countryCode?: string
  onCountryChange?: (code: string) => void
}

const COUNTRIES = [
  { code: '+52', name: 'México', flag: '🇲🇽' },
]

export function PhoneField({ 
  label, 
  error, 
  required, 
  helpText, 
  value, 
  onChange, 
  countryCode = '+52',
  onCountryChange 
}: PhoneFieldProps) {
  const formatPhoneNumber = (input: string) => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '')
    
    // Limit to 10 digits
    const limited = digits.slice(0, 10)
    
    // Format as XX XXXX XXXX
    if (limited.length <= 2) return limited
    if (limited.length <= 6) return `${limited.slice(0, 2)} ${limited.slice(2)}`
    return `${limited.slice(0, 2)} ${limited.slice(2, 6)} ${limited.slice(6)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    onChange(formatted)
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryChange?.(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder="55 1234 5678"
          className={`flex-1 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      </div>
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

interface MultiSelectFieldProps extends BaseFieldProps {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (value: string[]) => void
}

export function MultiSelectField({ 
  label, 
  error, 
  required, 
  helpText, 
  options, 
  value, 
  onChange 
}: MultiSelectFieldProps) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center py-2 hover:bg-gray-50 rounded px-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => toggleOption(option.value)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-3 text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
