import { useState, useEffect, useRef } from 'react'
import { Camera, MapPin, Loader2, ShieldCheck, Mail, Sparkles } from 'lucide-react'
import { SpotlightCard } from '@/shared/components/ui/SpotlightCard'

interface ProfileCardProps {
  name: string
  gender: string
  age: number
  location: string
  avatarUrl?: string
  role?: string
  email?: string
  onChangePhoto: (file: File) => Promise<void>
  onValidationError?: (message: string) => void
}

const ProfileCard = ({
  name,
  gender,
  age,
  location,
  avatarUrl,
  role,
  email,
  onChangePhoto,
  onValidationError,
}: ProfileCardProps) => {
  const [imagePreview, setImagePreview] = useState(avatarUrl)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep preview in sync when the parent passes a new avatarUrl (e.g. after refresh)
  useEffect(() => {
    if (avatarUrl) {
      setImagePreview(avatarUrl)
    }
  }, [avatarUrl])

  const getInitials = (fullName: string) => {
    const names = fullName.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return fullName.substring(0, 2).toUpperCase()
  }

  /**
   * Compress and resize an image to a max dimension of 800px and JPEG quality 0.8.
   * Returns a File ready for upload, typically under 200 KB.
   */
  const compressImage = (file: File, maxDim = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas not supported'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'))
              return
            }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          },
          'image/jpeg',
          quality,
        )
      }
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset the file input so selecting the same file again triggers onChange
    if (inputRef.current) inputRef.current.value = ''

    // Basic type check (accept any image)
    if (!file.type.startsWith('image/')) {
      onValidationError?.('Solo se permiten archivos de imagen (JPEG, PNG, WebP).')
      return
    }

    // Reject extremely large files (>15 MB) before even trying
    if (file.size > 15 * 1024 * 1024) {
      onValidationError?.('La imagen es demasiado grande. Máximo 15 MB.')
      return
    }

    setIsUploading(true)
    try {
      // Compress + resize to ~800px JPEG
      const compressed = await compressImage(file)

      // Show preview from compressed file
      const previewUrl = URL.createObjectURL(compressed)
      setImagePreview(previewUrl)

      // Upload the compressed file
      await onChangePhoto(compressed)
    } catch {
      // Revert preview on failure
      setImagePreview(avatarUrl)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <SpotlightCard
      spotlightColor="rgba(51, 199, 190, 0.18)"
      enableHoverLift={false}
      className="p-6 sm:p-7 rounded-3xl border border-gray-200/80 bg-white/90 backdrop-blur-sm shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar Section */}
        <div className="relative shrink-0">
          <div className="relative group">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt={name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-white shadow-md transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#33C7BE] to-teal-600 flex items-center justify-center ring-4 ring-white shadow-md text-white">
                <span className="text-3xl font-black tracking-wider">{getInitials(name)}</span>
              </div>
            )}

            {/* Upload overlay / button */}
            {isUploading ? (
              <div className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center backdrop-blur-xs">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
            ) : (
              <label
                htmlFor="avatar-upload"
                title="Cambiar foto de perfil"
                className="absolute -bottom-2 -right-2 w-9 h-9 bg-[#33C7BE] hover:bg-teal-600 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-md shadow-teal-500/30 transition-all hover:scale-105 active:scale-95 border-2 border-white"
              >
                <Camera className="w-4 h-4" />
                <input
                  ref={inputRef}
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="flex-1 text-center sm:text-left min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {name}
            </h2>
            {role === 'doctor' ? (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80">
                <Sparkles className="w-3 h-3 text-[#33C7BE]" />
                Médico HealthPal
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80">
                <ShieldCheck className="w-3.5 h-3.5 text-[#33C7BE]" />
                Paciente
              </span>
            )}
          </div>

          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-gray-600">
            {email && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200/70 rounded-xl font-medium">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {email}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200/70 rounded-xl font-medium capitalize">
              {gender} • {age} años
            </span>
            {location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200/70 rounded-xl font-medium">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {location}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-xl font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cuenta activa
            </span>
          </div>

          <div className="pt-1">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="text-xs font-semibold text-[#33C7BE] hover:text-teal-700 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              {isUploading ? 'Subiendo nueva imagen...' : 'Actualizar foto de perfil'}
            </button>
          </div>
        </div>
      </div>
    </SpotlightCard>
  )
}

export default ProfileCard
