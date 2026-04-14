import { useState } from 'react'
import { Edit3, Sparkles, Loader2, StickyNote } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Note } from '@/shared/mock/documentDetail'

interface NotesPanelProps {
  notes: Note[]
  onAddNote?: (content: string) => void
  onAskAI?: () => Promise<void>
  isAskingAI?: boolean
  /** When true, suppresses the outer card wrapper and header (used inside a tab panel) */
  embedded?: boolean
}

export const NotesPanel = ({ notes, onAddNote, onAskAI, isAskingAI, embedded }: NotesPanelProps) => {
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

  if (embedded) {
    return (
      <div className="flex flex-col">
        {/* Embedded AI + add toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
          </span>
          <div className="flex items-center gap-1.5">
            {onAskAI && (
              <button
                onClick={onAskAI}
                disabled={isAskingAI}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                title="Analizar con IA"
              >
                {isAskingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Analizar con IA
              </button>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title="Agregar nota"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
          {notes.length > 0 ? (
            notes.map((note) => (
              <div key={note.id} className="pb-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {note.authorInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-xs truncate">{note.author}</p>
                    <p className="text-xs text-gray-400">{note.timeAgo}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-xs text-gray-700 leading-relaxed [&>p]:mb-1 [&>ul]:list-disc [&>ul]:pl-4 [&>strong]:font-semibold whitespace-pre-wrap">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <StickyNote className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Sin notas todavía</p>
              <p className="text-gray-400 text-xs mt-1">Usa el botón + para agregar</p>
            </div>
          )}
          {isEditing && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe tu nota aquí..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNote}
                  disabled={!newNote.trim()}
                  className="flex-1 bg-primary text-white px-3 py-2 rounded-lg font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  Guardar
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-primary hover:text-primary transition-colors text-xs font-medium"
            >
              + Agregar nota
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden h-fit sticky top-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#33C7BE] to-[#2bb5ad] px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Notas</h2>
          <div className="flex gap-2">
            {onAskAI && (
              <button
                onClick={onAskAI}
                disabled={isAskingAI}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm disabled:opacity-50"
                title="Generar análisis con IA"
              >
                {isAskingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span className="hidden sm:inline">IA</span>
              </button>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="Editar notas"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
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
                <div className="text-sm text-gray-700 leading-relaxed [&>h1]:text-lg [&>h1]:font-bold [&>h2]:text-base [&>h2]:font-bold [&>h3]:text-sm [&>h3]:font-bold [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>strong]:font-semibold whitespace-pre-wrap">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
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
