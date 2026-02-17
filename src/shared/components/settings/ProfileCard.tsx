import { useState } from 'react';
import { Camera, MapPin } from 'lucide-react';

interface ProfileCardProps {
  name: string;
  gender: string;
  age: number;
  location: string;
  avatarUrl?: string;
  onChangePhoto: (file: File) => void;
}

const ProfileCard = ({
  name,
  gender,
  age,
  location,
  avatarUrl,
  onChangePhoto,
}: ProfileCardProps) => {
  const [imagePreview, setImagePreview] = useState(avatarUrl);

  const getInitials = (fullName: string) => {
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChangePhoto(file);
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
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#33C7BE] rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-600 transition-colors shadow-md"
            >
              <Camera className="w-4 h-4 text-white" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          <button
            onClick={() => document.getElementById('avatar-upload')?.click()}
            className="text-sm text-gray-600 hover:text-[#33C7BE] transition-colors font-medium"
          >
            Cambiar foto
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
