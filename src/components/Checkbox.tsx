import { InputHTMLAttributes } from 'react'

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export default function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className="flex items-center cursor-pointer group">
      <input
        type="checkbox"
        className={`w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer ${className}`}
        {...props}
      />
      <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900 select-none">
        {label}
      </span>
    </label>
  )
}
