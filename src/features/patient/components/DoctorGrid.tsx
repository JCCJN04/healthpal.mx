import React from 'react';
import { DoctorWithProfile } from '@/features/patient/services/doctors';
import DoctorCard from './DoctorCard';

interface DoctorGridProps {
  doctors: DoctorWithProfile[];
  onDoctorRemoved?: () => void;
}

const DoctorGrid: React.FC<DoctorGridProps> = ({ doctors, onDoctorRemoved }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} onRemoved={onDoctorRemoved} />
      ))}
    </div>
  );
};

export default DoctorGrid;
