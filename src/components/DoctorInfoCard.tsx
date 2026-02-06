import React from 'react';
import { User } from 'lucide-react';

interface DoctorInfoCardProps {
  doctorName: string;
  addressLine1: string;
  addressLine2: string;
  appointmentDate: string;
  appointmentTime: string;
}

const DoctorInfoCard: React.FC<DoctorInfoCardProps> = ({
  doctorName,
  addressLine1,
  addressLine2,
  appointmentDate,
  appointmentTime,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex items-center justify-between">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-white" />
          </div>
          
          {/* Doctor Info */}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{doctorName}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{addressLine1}</p>
            <p className="text-sm text-gray-600">{addressLine2}</p>
          </div>
        </div>

        {/* Right: Date/Time Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 px-4 py-3 text-right">
          <p className="text-sm font-medium text-gray-900">{appointmentDate}</p>
          <p className="text-sm text-gray-600 mt-0.5">{appointmentTime}</p>
        </div>
      </div>
    </div>
  );
};

export default DoctorInfoCard;
