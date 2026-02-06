import { useState } from 'react'
import { X, Mail, UserPlus, Send } from 'lucide-react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  documentTitle: string
}

export const ShareModal = ({ isOpen, onClose, documentTitle }: ShareModalProps) => {
  const [email, setEmail] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [message, setMessage] = useState('')

  const doctors = [
    { id: '1', name: 'Dr. Alfonso Méndez', specialty: 'Medicina General' },
    { id: '2', name: 'Dr. Patricia López', specialty: 'Radiología' },
    { id: '3', name: 'Dr. Roberto Cardona', specialty: 'Cardiología' },
    { id: '4', name: 'Dra. María Sánchez', specialty: 'Laboratorio' }
  ]

  const handleShare = () => {
    const shareData = {
      document: documentTitle,
      email,
      doctor: selectedDoctor,
      message
    }
    console.log('Compartir documento:', shareData)
    
    // Reset form
    setEmail('')
    setSelectedDoctor('')
    setMessage('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#33C7BE] to-[#2bb5ad] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Compartir documento
                  </h2>
                  <p className="text-sm text-white/80">{documentTitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent text-sm"
              />
            </div>

            {/* Or Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">o</span>
              </div>
            </div>

            {/* Doctor Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <UserPlus className="w-4 h-4 inline mr-1" />
                Seleccionar doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent text-sm bg-white"
              >
                <option value="">Selecciona un doctor...</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mensaje (opcional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Agrega un mensaje personalizado..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent resize-none text-sm"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleShare}
              disabled={!email && !selectedDoctor}
              className="flex-1 bg-[#33C7BE] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2bb5ad] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Compartir
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
