import { DEMO_DOCTOR_EMAIL, DEMO_DOCTOR_ID, DEMO_PATIENT_IDS } from '@/data/demoConfig'

type DemoPatient = {
  id: string
  full_name: string
  age: number
  diagnosis: string
  email: string
  avatar_url: string | null
}

export const demoDoctorProfile = {
  id: DEMO_DOCTOR_ID,
  email: DEMO_DOCTOR_EMAIL,
  full_name: 'Pedro Garcia',
  role: 'doctor',
  avatar_url: null,
  onboarding_completed: true,
  onboarding_step: null,
}

export const demoPatients: DemoPatient[] = [
  {
    id: DEMO_PATIENT_IDS.ana,
    full_name: 'Ana Martinez',
    age: 34,
    diagnosis: 'Hipertension controlada',
    email: 'ana.martinez@example.com',
    avatar_url: null,
  },
  {
    id: DEMO_PATIENT_IDS.carlos,
    full_name: 'Carlos Romero',
    age: 52,
    diagnosis: 'Diabetes tipo 2',
    email: 'carlos.romero@example.com',
    avatar_url: null,
  },
  {
    id: DEMO_PATIENT_IDS.lucia,
    full_name: 'Lucia Hernandez',
    age: 28,
    diagnosis: 'Migrana cronica',
    email: 'lucia.hernandez@example.com',
    avatar_url: null,
  },
]

export const demoDocuments = [
  {
    id: '99999999-9999-4999-8999-999999999999',
    owner_id: DEMO_DOCTOR_ID,
    patient_id: DEMO_PATIENT_IDS.ana,
    uploaded_by: DEMO_DOCTOR_ID,
    title: 'Receta - Ana Martinez',
    category: 'prescription',
    notes: 'Control mensual',
    mime_type: 'application/pdf',
    file_size: 182004,
    folder_id: null,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    owner_id: DEMO_DOCTOR_ID,
    patient_id: DEMO_PATIENT_IDS.carlos,
    uploaded_by: DEMO_DOCTOR_ID,
    title: 'Laboratorio - Carlos Romero',
    category: 'lab',
    notes: 'Seguimiento trimestral',
    mime_type: 'application/pdf',
    file_size: 356122,
    folder_id: null,
    created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
  },
]
