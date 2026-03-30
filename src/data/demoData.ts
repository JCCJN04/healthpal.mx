import { DEMO_DOCTOR_EMAIL, DEMO_DOCTOR_ID, DEMO_PATIENT_IDS } from '@/data/demoConfig'

const now = new Date()

const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString()

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
  full_name: 'Dr. Demo García',
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

export const demoAppointments = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    doctor_id: DEMO_DOCTOR_ID,
    patient_id: DEMO_PATIENT_IDS.ana,
    mode: 'in_person',
    start_at: hoursFromNow(24),
    end_at: hoursFromNow(25),
    location_text: 'Consultorio Demo A',
    status: 'confirmed',
    created_at: hoursFromNow(-200),
    updated_at: hoursFromNow(-200),
    created_by: DEMO_DOCTOR_ID,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    doctor_id: DEMO_DOCTOR_ID,
    patient_id: DEMO_PATIENT_IDS.carlos,
    mode: 'video',
    start_at: hoursFromNow(72),
    end_at: hoursFromNow(73),
    location_text: null,
    status: 'requested',
    created_at: hoursFromNow(-180),
    updated_at: hoursFromNow(-180),
    created_by: DEMO_DOCTOR_ID,
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    doctor_id: DEMO_DOCTOR_ID,
    patient_id: DEMO_PATIENT_IDS.lucia,
    mode: 'phone',
    start_at: hoursFromNow(-72),
    end_at: hoursFromNow(-71),
    location_text: null,
    status: 'completed',
    created_at: hoursFromNow(-300),
    updated_at: hoursFromNow(-300),
    created_by: DEMO_DOCTOR_ID,
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    doctor_id: DEMO_DOCTOR_ID,
    patient_id: DEMO_PATIENT_IDS.ana,
    mode: 'in_person',
    start_at: hoursFromNow(-24),
    end_at: hoursFromNow(-23),
    location_text: 'Consultorio Demo A',
    status: 'completed',
    created_at: hoursFromNow(-220),
    updated_at: hoursFromNow(-220),
    created_by: DEMO_DOCTOR_ID,
  },
]

export const demoMessagesInbox = [
  {
    id: 'demo-msg-001',
    from: 'Ana Martinez',
    subject: 'Duda sobre receta',
    preview: 'Doctor, tengo una pregunta sobre la dosis... ',
    created_at: hoursFromNow(-2),
    unread: true,
  },
  {
    id: 'demo-msg-002',
    from: 'Carlos Romero',
    subject: 'Resultados de laboratorio',
    preview: 'Ya subi mis estudios de glucosa.',
    created_at: hoursFromNow(-26),
    unread: true,
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
    created_at: hoursFromNow(-48),
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
    created_at: hoursFromNow(-96),
  },
]

export function getDemoAppointmentWithDetails() {
  return demoAppointments.map((appointment) => {
    const patient = demoPatients.find((p) => p.id === appointment.patient_id)
    return {
      ...appointment,
      doctor: {
        id: demoDoctorProfile.id,
        full_name: demoDoctorProfile.full_name,
        avatar_url: demoDoctorProfile.avatar_url,
        email: demoDoctorProfile.email,
        specialty: 'Medicina General',
        clinic_name: 'Healthpal Demo Clinic',
      },
      patient: patient
        ? {
            id: patient.id,
            full_name: patient.full_name,
            avatar_url: patient.avatar_url,
            email: patient.email,
          }
        : null,
    }
  })
}
