import React from 'react';
import { Users, Briefcase, Star, MessageSquare } from 'lucide-react';

interface DoctorStatsProps {
  patients: number;
  experience: number;
  rating: number;
  reviews: number;
  layout?: 'horizontal' | 'grid';
  size?: 'sm' | 'md';
}

const DoctorStats: React.FC<DoctorStatsProps> = ({
  patients,
  experience,
  rating,
  reviews,
  layout = 'horizontal',
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const valueSize = size === 'sm' ? 'text-sm' : 'text-base';

  const stats = [
    {
      icon: Users,
      label: 'Pacientes',
      value: `${patients}+`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Briefcase,
      label: 'Experiencia',
      value: `${experience} años`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Star,
      label: 'Rating',
      value: rating.toFixed(1),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      icon: MessageSquare,
      label: 'Reseñas',
      value: `${reviews}+`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 p-3 rounded-lg ${stat.bgColor}`}
          >
            <stat.icon className={`${iconSize} ${stat.color}`} />
            <div>
              <p className={`${valueSize} font-semibold text-gray-900`}>
                {stat.value}
              </p>
              <p className={`${textSize} text-gray-600`}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <stat.icon className={`${iconSize} ${stat.color}`} />
          <div className="flex items-baseline gap-1">
            <span className={`${valueSize} font-semibold text-gray-900`}>
              {stat.value}
            </span>
            <span className={`${textSize} text-gray-600`}>{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DoctorStats;
