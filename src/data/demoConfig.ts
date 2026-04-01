export const DEMO_DOCTOR_ID =
  (import.meta.env.VITE_DEMO_DOCTOR_ID as string | undefined) ||
  '11111111-1111-4111-8111-111111111111'

export const DEMO_DOCTOR_EMAIL =
  (import.meta.env.VITE_DEMO_DOCTOR_EMAIL as string | undefined) ||
  'demo@healthpal.mx'

export const DEMO_DOCTOR_PASSWORD =
  (import.meta.env.VITE_DEMO_DOCTOR_PASSWORD as string | undefined) ||
  'DemoDoctor#2026'

export const DEMO_PATIENT_IDS = {
  ana: '22222222-2222-4222-8222-222222222222',
  carlos: '33333333-3333-4333-8333-333333333333',
  lucia: '44444444-4444-4444-8444-444444444444',
}
