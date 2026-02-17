import { InputHTMLAttributes, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  onClear?: () => void
}

export default function Input({ 
  label, 
  error, 
  onClear,
  className = '',
  ...props 
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false)
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-600 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
            error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
          } ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {onClear && props.value && (isFocused || true) && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.1"/>
              <path 
                d="M7 7L13 13M13 7L7 13" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
