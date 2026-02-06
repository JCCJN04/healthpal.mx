// Database types for Healthpal.mx
// Based on actual Supabase schema + onboarding fields (to be added via migration)
// After migration, run: npx supabase gen types typescript --linked --schema public > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums from database
export type UserRole = 'patient' | 'doctor' | 'admin'
export type SexType = 'male' | 'female' | 'other' | 'unspecified'
export type AppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'rejected' | 'no_show'
export type VisitMode = 'in_person' | 'video' | 'phone'
export type DocCategory = 'radiology' | 'prescription' | 'history' | 'lab' | 'insurance' | 'other'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string | null
          email: string | null
          phone: string | null
          sex: SexType
          birthdate: string | null
          avatar_url: string | null
          onboarding_completed: boolean
          onboarding_step: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          full_name?: string | null
          email?: string | null
          phone?: string | null
          sex?: SexType
          birthdate?: string | null
          avatar_url?: string | null
          onboarding_completed?: boolean
          onboarding_step?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          full_name?: string | null
          email?: string | null
          phone?: string | null
          sex?: SexType
          birthdate?: string | null
          avatar_url?: string | null
          onboarding_completed?: boolean
          onboarding_step?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      doctor_profiles: {
        Row: {
          doctor_id: string
          professional_license: string | null
          specialty: string | null
          clinic_name: string | null
          bio: string | null
          years_experience: number | null
          consultation_price_mxn: number | null
          address_text: string | null
          location: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          doctor_id: string
          professional_license?: string | null
          specialty?: string | null
          clinic_name?: string | null
          bio?: string | null
          years_experience?: number | null
          consultation_price_mxn?: number | null
          address_text?: string | null
          location?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          doctor_id?: string
          professional_license?: string | null
          specialty?: string | null
          clinic_name?: string | null
          bio?: string | null
          years_experience?: number | null
          consultation_price_mxn?: number | null
          address_text?: string | null
          location?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      patient_profiles: {
        Row: {
          patient_id: string
          address_text: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          blood_type: string | null
          allergies: string | null
          chronic_conditions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          patient_id: string
          address_text?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          blood_type?: string | null
          allergies?: string | null
          chronic_conditions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          patient_id?: string
          address_text?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          blood_type?: string | null
          allergies?: string | null
          chronic_conditions?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string
          status: AppointmentStatus
          mode: VisitMode
          start_at: string
          end_at: string
          reason: string | null
          symptoms: string | null
          location_text: string | null
          location: Json | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id: string
          status?: AppointmentStatus
          mode?: VisitMode
          start_at: string
          end_at: string
          reason?: string | null
          symptoms?: string | null
          location_text?: string | null
          location?: Json | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string
          status?: AppointmentStatus
          mode?: VisitMode
          start_at?: string
          end_at?: string
          reason?: string | null
          symptoms?: string | null
          location_text?: string | null
          location?: Json | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          owner_id: string
          patient_id: string | null
          uploaded_by: string | null
          folder_id: string | null
          title: string
          category: DocCategory
          file_path: string
          mime_type: string | null
          file_size: number | null
          checksum: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          patient_id?: string | null
          uploaded_by?: string | null
          folder_id?: string | null
          title: string
          category?: DocCategory
          file_path: string
          mime_type?: string | null
          file_size?: number | null
          checksum?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          patient_id?: string | null
          uploaded_by?: string | null
          folder_id?: string | null
          title?: string
          category?: DocCategory
          file_path?: string
          mime_type?: string | null
          file_size?: number | null
          checksum?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string | null
          body: string | null
          entity_table: string | null
          entity_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title?: string | null
          body?: string | null
          entity_table?: string | null
          entity_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string | null
          body?: string | null
          entity_table?: string | null
          entity_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: {
        Args: Record<PropertyKey, never>
        Returns: UserRole
      }
      is_doctor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_patient: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_access_patient: {
        Args: { _patient_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      sex_type: SexType
      appointment_status: AppointmentStatus
      visit_mode: VisitMode
      doc_category: DocCategory
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row']
export type PatientProfile = Database['public']['Tables']['patient_profiles']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
