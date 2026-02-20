export interface Document {
  id: string
  name: string
  type: 'zip' | 'xlsx' | 'pptx' | 'png' | 'pdf' | 'doc'
  date: string
  owner: string
  ownerInitial: string
}

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Vacation_Photos_Italy.zip',
    type: 'zip',
    date: '14 de Abril 2024',
    owner: 'Carmen',
    ownerInitial: 'C'
  },
  {
    id: '2',
    name: 'Home_Renovation_Plan.xlsx',
    type: 'xlsx',
    date: '14 de Abril 2024',
    owner: 'Carmen',
    ownerInitial: 'C'
  },
  {
    id: '3',
    name: 'IRS-Returns-2026.xlsx',
    type: 'xlsx',
    date: '14 de Abril 2024',
    owner: 'Carmen',
    ownerInitial: 'C'
  },
  {
    id: '4',
    name: 'Group_Project_Presentation.pptx',
    type: 'pptx',
    date: '14 de Abril 2024',
    owner: 'Carmen',
    ownerInitial: 'C'
  },
  {
    id: '5',
    name: 'nature_wallpaperHD.png',
    type: 'png',
    date: '14 de Abril 2024',
    owner: 'Carmen',
    ownerInitial: 'C'
  },
  {
    id: '6',
    name: 'tree-trunk.png',
    type: 'png',
    date: '14 de Abril 2024',
    owner: 'Carmen',
    ownerInitial: 'C'
  }
]
