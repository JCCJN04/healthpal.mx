interface TabsProps {
  options: string[]
  selectedIndex: number
  onChange: (index: number) => void
}

export default function Tabs({ options, selectedIndex, onChange }: TabsProps) {
  return (
    <div className="inline-flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(index)}
          className={`px-8 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            selectedIndex === index
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-700 hover:text-primary'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
