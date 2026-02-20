import { useState } from 'react'
import { Edit3 } from 'lucide-react'
import type { Note } from '@/shared/mock/documentDetail'

interface NotesPanelProps {
  notes: Note[]
  onAddNote?: (content: string) => void
}

export const NotesPanel = ({ notes, onAddNote }: NotesPanelProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [newNote, setNewNote] = useState('')

  const handleSaveNote = () => {
    if (newNote.trim()) {
      if (onAddNote) {
        onAddNote(newNote)
      }
      setNewNote('')
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setNewNote('')
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden h-fit sticky top-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#33C7BE] to-[#2bb5ad] px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Notas</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            title="Editar notas"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Notes Content */}
      <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="pb-4 border-b border-gray-200 last:border-0">
              {/* Author Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#33C7BE] to-[#2bb5ad] flex items-center justify-center text-white font-semibold shadow-md">
                  {note.authorInitial}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    {note.author}
                  </p>
                  <p className="text-xs text-gray-500">{note.timeAgo}</p>
                </div>
              </div>

              {/* Note Content */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {note.content}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No hay notas todavía</p>
          </div>
        )}

        {/* Add Note Section */}
        {isEditing && (
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700 mb-2 block">
                Agregar nota
              </span>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe tu nota aquí..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent resize-none text-sm"
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSaveNote}
                disabled={!newNote.trim()}
                className="flex-1 bg-[#33C7BE] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2bb5ad] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Guardar
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#33C7BE] hover:text-[#33C7BE] transition-colors text-sm font-medium"
          >
            + Agregar nota
          </button>
        )}
      </div>
    </div>
  )
}
