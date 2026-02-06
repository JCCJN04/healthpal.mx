import React, { useState } from 'react';
import { MapPin, ExternalLink, Copy, User, Star, MessageCircle, CheckCircle } from 'lucide-react';

interface MapLocationCardProps {
  doctorName: string;
  addressLine1: string;
  addressLine2: string;
  specialty?: string;
  rating?: number;
}

const MapLocationCard: React.FC<MapLocationCardProps> = ({
  doctorName,
  addressLine1,
  addressLine2,
  specialty = 'Medicina general',
  rating = 4.8,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    const fullAddress = `${addressLine1}\n${addressLine2}`;
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMaps = () => {
    const encodedAddress = encodeURIComponent(`${addressLine1}, ${addressLine2}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Map Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Map Preview */}
        <div className="relative h-64 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50">
          {/* Simulated map with grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%">
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Mock map elements */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md px-3 py-2 text-xs font-medium text-gray-700">
            Denison Park
          </div>
          <div className="absolute bottom-12 left-8 bg-white rounded-lg shadow-md px-3 py-2 text-xs font-medium text-gray-700">
            Cleveland Heights
          </div>
          <div className="absolute top-1/3 right-12 bg-white rounded-lg shadow-md px-3 py-2 text-xs font-medium text-gray-700">
            East Cleveland
          </div>

          {/* Location Pin */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div className="relative">
              <div className="w-16 h-16 bg-[#E91E63] rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <MapPin className="w-8 h-8 text-white fill-white" />
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#E91E63] rounded-full opacity-50"></div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md overflow-hidden">
            <button className="w-10 h-10 flex items-center justify-center border-b border-gray-200 hover:bg-gray-50">
              <span className="text-lg font-bold text-gray-600">+</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-50">
              <span className="text-lg font-bold text-gray-600">−</span>
            </button>
          </div>
        </div>

        {/* Location Details */}
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="w-5 h-5 text-[#33C7BE] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{addressLine1}</p>
              <p className="text-sm text-gray-600">{addressLine2}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleOpenMaps}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#33C7BE] text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir en Maps</span>
            </button>
            <button
              onClick={handleCopyAddress}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Doctor Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{doctorName}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{specialty}</p>
            
            {/* Rating */}
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-900">{rating}</span>
              <span className="text-xs text-gray-500 ml-1">(127 opiniones)</span>
            </div>
          </div>
        </div>

        {/* Message Button */}
        <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span>Enviar mensaje</span>
        </button>
      </div>
    </div>
  );
};

export default MapLocationCard;
