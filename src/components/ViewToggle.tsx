import { List, Grid } from 'lucide-react'

interface ViewToggleProps {
  view: 'list' | 'grid'
  onViewChange: (view: 'list' | 'grid') => void
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
      <button
        onClick={() => onViewChange('list')}
        className={`p-2 rounded transition-colors ${
          view === 'list'
            ? 'bg-gray-700 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        title="Vista de lista"
      >
        <List size={20} />
      </button>
      <button
        onClick={() => onViewChange('grid')}
        className={`p-2 rounded transition-colors ${
          view === 'grid'
            ? 'bg-gray-700 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        title="Vista de cuadrícula"
      >
        <Grid size={20} />
      </button>
    </div>
  )
}
