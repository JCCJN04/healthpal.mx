import React from 'react';
import { DoctorWithProfile } from '../lib/queries/doctors';
import DoctorCard from './DoctorCard';

interface DoctorGridProps {
  doctors: DoctorWithProfile[];
}

const DoctorGrid: React.FC<DoctorGridProps> = ({ doctors }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} />
      ))}
    </div>
  );
};

export default DoctorGrid;
