import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required'),
  VITE_MAPBOX_TOKEN: z.string().optional(),
  VITE_DEMO_DOCTOR_ID: z.string().optional(),
  VITE_DEMO_DOCTOR_EMAIL: z.string().email().optional().or(z.literal('')),
  VITE_DEMO_DOCTOR_PASSWORD: z.string().optional(),
})

function validateEnv() {
  const result = envSchema.safeParse(import.meta.env)
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    console.error(`[env] Invalid environment variables:\n${formatted}`)
    throw new Error('Invalid environment variables. Check console for details.')
  }
  return result.data
}

export const env = validateEnv()
