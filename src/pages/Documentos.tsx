import { useState, useEffect } from 'react'
import { Upload, Search, Filter, FileText, Calendar, FolderOpen, Loader2, Plus } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ViewToggle from '../components/ViewToggle'
import DocumentsTable from '../components/DocumentsTable'
import { DocumentGrid } from '../components/DocumentGrid'
import { useAuth } from '../context/AuthContext'
import { getUserDocuments, uploadDocument, deleteDocument } from '../lib/queries/documents'
import { showToast } from '../components/Toast'
import type { Database } from '../types/database'

type Document = Database['public']['Tables']['documents']['Row']
type DocCategory = Database['public']['Enums']['doc_category']

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'radiology', label: 'Radiología' },
  { value: 'prescription', label: 'Recetas' },
  { value: 'history', label: 'Historial' },
  { value: 'lab', label: 'Laboratorio' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'other', label: 'Otros' },
]

const CATEGORY_LABELS: Record<DocCategory, string> = {
  radiology: 'Radiología',
  prescription: 'Recetas',
  history: 'Historial',
  lab: 'Laboratorio',
  insurance: 'Seguros',
  other: 'Otros',
}

export default function Documentos() {
  const { user } = useAuth()
  const [view, setView] = useState<'list' | 'grid'>('grid')
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [uploadForm, setUploadForm] = useState<{
    file: File | null
    title: string
    category: DocCategory
    notes: string
  }>({
    file: null,
    title: '',
    category: 'other',
    notes: '',
  })

  useEffect(() => {
    loadDocuments()
  }, [user])

  useEffect(() => {
    filterDocuments()
  }, [documents, searchQuery, selectedCategory])

  const loadDocuments = async () => {
    if (!user) return
    setLoading(true)
    const docs = await getUserDocuments(user.id)
    setDocuments(docs)
    setLoading(false)
  }

  const filterDocuments = () => {
    let filtered = [...documents]

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory)
    }

    setFilteredDocuments(filtered)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !uploadForm.file) return

    setUploading(true)
    const result = await uploadDocument(uploadForm.file, user.id, {
      title: uploadForm.title || uploadForm.file.name,
      category: uploadForm.category,
      notes: uploadForm.notes,
    })

    if (result.success) {
      showToast('¡Documento subido exitosamente!', 'success')
      setUploadModalOpen(false)
      setUploadForm({
        file: null,
        title: '',
        category: 'other',
        notes: '',
      })
      loadDocuments()
    } else {
      showToast(result.error || 'Error al subir el documento', 'error')
    }
    setUploading(false)
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return

    const result = await deleteDocument(documentId)
    if (result.success) {
      showToast('Documento eliminado', 'success')
      loadDocuments()
    } else {
      showToast(result.error || 'Error al eliminar', 'error')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      }))
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
              Tus Documentos
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Administra y organiza tus documentos médicos
            </p>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm md:text-base"
          >
            <Plus size={20} />
            <span>Subir Documento</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{documents.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Calendar size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Este mes</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {documents.filter(d => {
                    const created = new Date(d.created_at)
                    const now = new Date()
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200 col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <FolderOpen size={18} className="text-teal-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Categorías</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {new Set(documents.map(d => d.category)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-gray-400 hidden md:block" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm flex-1 md:flex-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <ViewToggle view={view} onViewChange={setView} />
            </div>
          </div>
        </div>

        {/* Documents List/Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12 md:py-16">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-lg p-8 md:p-12 text-center border border-gray-200">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              {documents.length === 0 ? 'No hay documentos' : 'No se encontraron resultados'}
            </h3>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              {documents.length === 0 
                ? 'Comienza subiendo tu primer documento médico'
                : 'Intenta ajustar los filtros de búsqueda'
              }
            </p>
            {documents.length === 0 && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus size={20} />
                <span>Subir Documento</span>
              </button>
            )}
          </div>
        ) : view === 'list' ? (
          <DocumentsTable documents={filteredDocuments} onDelete={handleDelete} />
        ) : (
          <DocumentGrid 
            documents={filteredDocuments} 
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                Subir Documento
              </h2>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      id="file-upload"
                      required
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                      {uploadForm.file ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {uploadForm.file.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600">
                            Click para seleccionar o arrastra un archivo
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, DOC, JPG, PNG (Máx. 10MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="Ej: Radiografía de tórax"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría *
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value as DocCategory }))}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                    required
                  >
                    {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    placeholder="Agrega notas o observaciones..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    disabled={uploading}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadForm.file}
                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <span>Subir Documento</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
