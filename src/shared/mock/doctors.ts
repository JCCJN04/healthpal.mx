export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  patients: number;
  experience: number;
  rating: number;
  reviews: number;
  location: string;
  education: string;
  languages: string[];
  availability: 'available' | 'busy' | 'unavailable';
}

export const mockDoctors: Doctor[] = [
  {
    id: '1',
    name: 'Dr. Alfonso Reyes',
    specialty: 'Medicina General',
    avatar: '#7C3AED',
    patients: 658,
    experience: 11,
    rating: 4.9,
    reviews: 502,
    location: 'Monterrey, N.L.',
    education: 'Universidad Autónoma de Nuevo León',
    languages: ['Español', 'Inglés'],
    availability: 'available',
  },
  {
    id: '2',
    name: 'Dra. Mariana Tamez',
    specialty: 'Cardiología',
    avatar: '#EC4899',
    patients: 892,
    experience: 15,
    rating: 4.8,
    reviews: 734,
    location: 'Monterrey, N.L.',
    education: 'Instituto Tecnológico de Monterrey',
    languages: ['Español', 'Inglés', 'Francés'],
    availability: 'available',
  },
  {
    id: '3',
    name: 'Dr. Luis Colosio',
    specialty: 'Dermatología',
    avatar: '#3B82F6',
    patients: 445,
    experience: 8,
    rating: 4.7,
    reviews: 312,
    location: 'San Pedro, N.L.',
    education: 'Universidad de Monterrey',
    languages: ['Español'],
    availability: 'busy',
  },
  {
    id: '4',
    name: 'Dr. Rene Cantu',
    specialty: 'Pediatría',
    avatar: '#10B981',
    patients: 1203,
    experience: 18,
    rating: 4.9,
    reviews: 891,
    location: 'Monterrey, N.L.',
    education: 'Universidad Autónoma de Nuevo León',
    languages: ['Español', 'Inglés'],
    availability: 'available',
  },
  {
    id: '5',
    name: 'Dra. Patricia González',
    specialty: 'Ginecología',
    avatar: '#F59E0B',
    patients: 567,
    experience: 12,
    rating: 4.8,
    reviews: 423,
    location: 'San Pedro, N.L.',
    education: 'Universidad Nacional Autónoma de México',
    languages: ['Español', 'Inglés'],
    availability: 'available',
  },
  {
    id: '6',
    name: 'Dr. Roberto Martínez',
    specialty: 'Traumatología',
    avatar: '#EF4444',
    patients: 734,
    experience: 14,
    rating: 4.9,
    reviews: 612,
    location: 'Monterrey, N.L.',
    education: 'Instituto Tecnológico de Monterrey',
    languages: ['Español', 'Inglés'],
    availability: 'available',
  },
  {
    id: '7',
    name: 'Dra. Ana Sofía Ruiz',
    specialty: 'Oftalmología',
    avatar: '#8B5CF6',
    patients: 398,
    experience: 9,
    rating: 4.7,
    reviews: 278,
    location: 'San Pedro, N.L.',
    education: 'Universidad de Monterrey',
    languages: ['Español'],
    availability: 'unavailable',
  },
  {
    id: '8',
    name: 'Dr. Miguel Ángel Soto',
    specialty: 'Neurología',
    avatar: '#06B6D4',
    patients: 521,
    experience: 16,
    rating: 4.8,
    reviews: 467,
    location: 'Monterrey, N.L.',
    education: 'Universidad Nacional Autónoma de México',
    languages: ['Español', 'Inglés', 'Alemán'],
    availability: 'busy',
  },
];

export function getDoctorById(id: string): Doctor | undefined {
  return mockDoctors.find(d => d.id === id);
}

export function searchDoctors(query: string): Doctor[] {
  if (!query.trim()) return mockDoctors;
  
  const lowerQuery = query.toLowerCase();
  return mockDoctors.filter(
    d =>
      d.name.toLowerCase().includes(lowerQuery) ||
      d.specialty.toLowerCase().includes(lowerQuery)
  );
}
