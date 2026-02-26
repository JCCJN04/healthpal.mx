import { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Loader2 } from 'lucide-react';

interface ProfileCardProps {
  name: string;
  gender: string;
  age: number;
  location: string;
  avatarUrl?: string;
  onChangePhoto: (file: File) => Promise<void>;
  onValidationError?: (message: string) => void;
}

const ProfileCard = ({
  name,
  gender,
  age,
  location,
  avatarUrl,
  onChangePhoto,
  onValidationError,
}: ProfileCardProps) => {
  const [imagePreview, setImagePreview] = useState(avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep preview in sync when the parent passes a new avatarUrl (e.g. after refresh)
  useEffect(() => {
    if (avatarUrl) {
      setImagePreview(avatarUrl);
    }
  }, [avatarUrl]);

  const getInitials = (fullName: string) => {
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  /**
   * Compress and resize an image to a max dimension of 800px and JPEG quality 0.8.
   * Returns a File ready for upload, typically under 200 KB.
   */
  const compressImage = (file: File, maxDim = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the file input so selecting the same file again triggers onChange
    if (inputRef.current) inputRef.current.value = '';

    // Basic type check (accept any image)
    if (!file.type.startsWith('image/')) {
      onValidationError?.('Solo se permiten archivos de imagen (JPEG, PNG, WebP).');
      return;
    }

    // Reject extremely large files (>15 MB) before even trying
    if (file.size > 15 * 1024 * 1024) {
      onValidationError?.('La imagen es demasiado grande. Máximo 15 MB.');
      return;
    }

    setIsUploading(true);
    try {
      // Compress + resize to ~800px JPEG
      const compressed = await compressImage(file);

      // Show preview from compressed file
      const previewUrl = URL.createObjectURL(compressed);
      setImagePreview(previewUrl);

      // Upload the compressed file
      await onChangePhoto(compressed);
    } catch {
      // Revert preview on failure
      setImagePreview(avatarUrl);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt={name}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-50"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center border-4 border-gray-50">
                <span className="text-2xl font-bold text-white">
                  {getInitials(name)}
                </span>
              </div>
            )}

            {/* Upload overlay / button */}
            {isUploading ? (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            ) : (
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#33C7BE] rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-600 transition-colors shadow-md"
              >
                <Camera className="w-4 h-4 text-white" />
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
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="text-sm text-gray-600 hover:text-[#33C7BE] transition-colors font-medium disabled:opacity-50"
          >
            {isUploading ? 'Subiendo...' : 'Cambiar foto'}
          </button>
        </div>

        {/* Profile Info Section */}
        <div className="flex-1 text-center lg:text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{name}</h2>
          <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 text-sm text-gray-600">
            <span className="capitalize">
              {gender} • {age} años
            </span>
            {location && (
              <>
                <span className="hidden lg:inline text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
