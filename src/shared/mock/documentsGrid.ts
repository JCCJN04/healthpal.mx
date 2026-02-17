export interface DocumentCard {
  id: string
  title: string
  date: string
  description: string
  type: 'recetas' | 'radiografias' | 'estudios'
  isFavorite: boolean
}

export const mockDocumentCards: DocumentCard[] = [
  {
    id: '1',
    title: 'Recetas',
    date: '23/01/2026',
    description: 'Duis mollis est non commodo luctus nisi erat porttitor ligula eget lacinia odio sem nec elit.',
    type: 'recetas',
    isFavorite: false
  },
  {
    id: '2',
    title: 'Radiografias',
    date: '14/12/2025',
    description: 'Duis mollis est non commodo luctus nisi erat porttitor ligula eget lacinia odio sem nec elit.',
    type: 'radiografias',
    isFavorite: false
  },
  {
    id: '3',
    title: 'Estudios',
    date: '11/12/2025',
    description: 'Duis mollis est non commodo luctus nisi erat porttitor ligula eget lacinia odio sem nec elit.',
    type: 'estudios',
    isFavorite: false
  },
  {
    id: '4',
    title: 'Recetas',
    date: '05/11/2025',
    description: 'Duis mollis est non commodo luctus nisi erat porttitor ligula eget lacinia odio sem nec elit.',
    type: 'recetas',
    isFavorite: false
  },
  {
    id: '5',
    title: 'Estudios',
    date: '06/06/2024',
    description: 'Duis mollis est non commodo luctus nisi erat porttitor ligula eget lacinia odio sem nec elit.',
    type: 'estudios',
    isFavorite: false
  },
  {
    id: '6',
    title: 'Radiografias',
    date: '01/02/2024',
    description: 'Duis mollis est non commodo luctus nisi erat porttitor ligula eget lacinia odio sem nec elit.',
    type: 'radiografias',
    isFavorite: false
  }
]
