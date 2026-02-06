export interface DocumentDetail {
  id: string
  title: string
  category: 'Recetas' | 'Radiografías' | 'Estudios'
  date: string
  createdAt: string
  ownerName: string
  ownerInitial: string
  fileType: 'pdf' | 'image'
  fileUrl?: string
  notes: Note[]
  isFavorite: boolean
  tags: string[]
}

export interface Note {
  id: string
  author: string
  authorInitial: string
  content: string
  timestamp: string
  timeAgo: string
}

export const mockDocumentDetails: Record<string, DocumentDetail> = {
  '1': {
    id: '1',
    title: 'Receta - Enero 2026',
    category: 'Recetas',
    date: '23/01/2026',
    createdAt: '2026-01-23T10:30:00Z',
    ownerName: 'Dr. Alfonso Méndez',
    ownerInitial: 'A',
    fileType: 'pdf',
    fileUrl: '/sample-receta.pdf',
    isFavorite: false,
    tags: ['Urgente', 'Medicamentos'],
    notes: [
      {
        id: 'n1',
        author: 'Carolina',
        authorInitial: 'C',
        content: 'Revise el estudio en busca de anormalidades, pero se ve bien.',
        timestamp: '2026-01-24T14:20:00Z',
        timeAgo: 'hace 2 días'
      }
    ]
  },
  '2': {
    id: '2',
    title: 'Radiografía Tórax PA',
    category: 'Radiografías',
    date: '14/12/2025',
    createdAt: '2025-12-14T09:15:00Z',
    ownerName: 'Dr. Patricia López',
    ownerInitial: 'P',
    fileType: 'pdf',
    fileUrl: '/sample-radiografia.pdf',
    isFavorite: true,
    tags: ['Rayos X', 'Tórax'],
    notes: [
      {
        id: 'n2',
        author: 'Dr. Patricia López',
        authorInitial: 'P',
        content: 'Los resultados muestran una evolución favorable. Continuar con el tratamiento actual.',
        timestamp: '2025-12-15T11:00:00Z',
        timeAgo: 'hace 1 mes'
      }
    ]
  },
  '3': {
    id: '3',
    title: 'Estudios de Laboratorio',
    category: 'Estudios',
    date: '11/12/2025',
    createdAt: '2025-12-11T08:00:00Z',
    ownerName: 'Laboratorio Clínico Central',
    ownerInitial: 'L',
    fileType: 'pdf',
    fileUrl: '/sample-laboratorio.pdf',
    isFavorite: false,
    tags: ['Laboratorio', 'Sangre'],
    notes: [
      {
        id: 'n3',
        author: 'María Sánchez',
        authorInitial: 'M',
        content: 'Valores dentro del rango normal. Programar seguimiento en 3 meses.',
        timestamp: '2025-12-12T16:45:00Z',
        timeAgo: 'hace 1 mes'
      }
    ]
  },
  '4': {
    id: '4',
    title: 'Receta - Noviembre 2025',
    category: 'Recetas',
    date: '05/11/2025',
    createdAt: '2025-11-05T14:30:00Z',
    ownerName: 'Dr. Alfonso Méndez',
    ownerInitial: 'A',
    fileType: 'pdf',
    isFavorite: false,
    tags: ['Medicamentos'],
    notes: []
  },
  '5': {
    id: '5',
    title: 'Estudios Cardiológicos',
    category: 'Estudios',
    date: '06/06/2024',
    createdAt: '2024-06-06T10:00:00Z',
    ownerName: 'Dr. Roberto Cardona',
    ownerInitial: 'R',
    fileType: 'pdf',
    isFavorite: false,
    tags: ['Cardiología', 'ECG'],
    notes: [
      {
        id: 'n4',
        author: 'Dr. Roberto Cardona',
        authorInitial: 'R',
        content: 'Electrocardiograma sin alteraciones significativas. Mantener seguimiento semestral.',
        timestamp: '2024-06-07T09:30:00Z',
        timeAgo: 'hace 8 meses'
      }
    ]
  },
  '6': {
    id: '6',
    title: 'Radiografía Rodilla Izquierda',
    category: 'Radiografías',
    date: '01/02/2024',
    createdAt: '2024-02-01T11:20:00Z',
    ownerName: 'Dr. Patricia López',
    ownerInitial: 'P',
    fileType: 'pdf',
    isFavorite: true,
    tags: ['Rayos X', 'Ortopedia'],
    notes: []
  }
}

export const getDocumentById = (id: string): DocumentDetail | undefined => {
  return mockDocumentDetails[id]
}
