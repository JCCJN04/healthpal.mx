import { supabase } from '@/shared/lib/supabase'

// Type for user_settings (matches database schema)
interface UserSettings {
  user_id: string
  email_notifications: boolean
  appointment_reminders: boolean
  whatsapp_notifications: boolean
  created_at: string
  updated_at: string
}

type UserSettingsUpdate = Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>

/**
 * Get current user's settings
 * Creates default settings if they don't exist
 */
export async function getMySettings(): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Try to fetch existing settings
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: UserSettings | null; error: any }

  // If settings don't exist, create them with defaults
  if (error && error.code === 'PGRST116') {
    const defaultSettings: UserSettingsUpdate = {
      email_notifications: true,
      appointment_reminders: true,
      whatsapp_notifications: false,
    }
    
    const { data: newSettings, error: createError } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        ...defaultSettings,
      } as any)
      .select()
      .single() as { data: UserSettings | null; error: any }

    if (createError) {
      console.error('Error creating settings:', createError)
      throw createError
    }

    return newSettings as UserSettings
  }

  if (error) {
    console.error('Error fetching settings:', error)
    throw error
  }

  return settings as UserSettings
}

/**
 * Update current user's settings
 */
export async function updateMySettings(updates: UserSettingsUpdate): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('user_settings')
    // @ts-ignore - user_settings table will exist after migration is applied
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single() as { data: UserSettings | null; error: any }

  if (error) {
    console.error('Error updating settings:', error)
    throw error
  }

  return data as UserSettings
}

/**
 * Upsert (insert or update) current user's settings
 * Useful when you're not sure if settings exist yet
 */
export async function upsertMySettings(updates: UserSettingsUpdate): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      ...updates,
    } as any)
    .select()
    .single() as { data: UserSettings | null; error: any }

  if (error) {
    console.error('Error upserting settings:', error)
    throw error
  }

  return data as UserSettings
}

export type { UserSettings, UserSettingsUpdate }
