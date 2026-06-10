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
export type UserRole = 'patient' | 'doctor' | 'admin' | 'assistant'
export type SexType = 'male' | 'female' | 'other' | 'unspecified'
export type DocCategory = 'radiology' | 'prescription' | 'history' | 'lab' | 'insurance' | 'vaccine' | 'referral' | 'surgery' | 'consultation' | 'other'

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
          last_seen_at: string | null
          created_at: string
          updated_at: string
          // NOM-024-SSA3-2012 §6.5 — Identificación de pacientes
          curp: string | null              // 18 chars, validated by RENAPO format
          primer_apellido: string | null   // First surname (no abbreviations)
          segundo_apellido: string | null  // Second surname (optional)
          estado_nacimiento: string | null // INEGI 2-char code (EDONAC)
          nacionalidad: string | null      // RENAPO 3-char code
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
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
          curp?: string | null
          primer_apellido?: string | null
          segundo_apellido?: string | null
          estado_nacimiento?: string | null
          nacionalidad?: string | null
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
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
          curp?: string | null
          primer_apellido?: string | null
          segundo_apellido?: string | null
          estado_nacimiento?: string | null
          nacionalidad?: string | null
        }
      }
      clinical_histories: {
        Row: {
          id: string
          patient_id: string
          allergies: string | null
          referral_source: string | null
          consultation_reason: string | null
          patient_observations: string | null
          family_history: Json | null
          pathological_history: Json | null
          non_pathological_history: Json | null
          gynecological_history: Json | null
          systems_review: string | null
          last_edited_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          allergies?: string | null
          referral_source?: string | null
          consultation_reason?: string | null
          patient_observations?: string | null
          family_history?: Json | null
          pathological_history?: Json | null
          non_pathological_history?: Json | null
          gynecological_history?: Json | null
          systems_review?: string | null
          last_edited_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          allergies?: string | null
          referral_source?: string | null
          consultation_reason?: string | null
          patient_observations?: string | null
          family_history?: Json | null
          pathological_history?: Json | null
          non_pathological_history?: Json | null
          gynecological_history?: Json | null
          systems_review?: string | null
          last_edited_by?: string | null
          updated_at?: string | null
        }
      }
      doctor_profiles: {
        Row: {
          doctor_id: string
          slug: string
          professional_license: string | null
          specialty: string | null
          clinic_name: string | null
          bio: string | null
          years_experience: number | null
          consultation_price_mxn: number | null
          address_text: string | null
          location: Json | null
          consultation_mode: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          doctor_id: string
          slug?: string
          professional_license?: string | null
          specialty?: string | null
          clinic_name?: string | null
          bio?: string | null
          years_experience?: number | null
          consultation_price_mxn?: number | null
          address_text?: string | null
          location?: Json | null
          consultation_mode?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          doctor_id?: string
          slug?: string
          professional_license?: string | null
          specialty?: string | null
          clinic_name?: string | null
          bio?: string | null
          years_experience?: number | null
          consultation_price_mxn?: number | null
          address_text?: string | null
          location?: Json | null
          consultation_mode?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      patient_profiles: {
        Row: {
          patient_id: string
          address_text: string | null
          blood_type: string | null
          height_cm: number | null
          weight_kg: number | null
          insurance_provider: string | null
          preferred_language: string | null
          allergies: string | null
          chronic_conditions: string | null
          current_medications: string | null
          notes_for_doctor: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          patient_id: string
          address_text?: string | null
          blood_type?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          insurance_provider?: string | null
          preferred_language?: string | null
          allergies?: string | null
          chronic_conditions?: string | null
          current_medications?: string | null
          notes_for_doctor?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          patient_id?: string
          address_text?: string | null
          blood_type?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          insurance_provider?: string | null
          preferred_language?: string | null
          allergies?: string | null
          chronic_conditions?: string | null
          current_medications?: string | null
          notes_for_doctor?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
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
          mime_type: string | null
          file_size: number | null
          notes: string | null
          external_url: string | null
          document_date: string | null
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
          mime_type?: string | null
          file_size?: number | null
          notes?: string | null
          external_url?: string | null
          document_date?: string | null
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
          mime_type?: string | null
          file_size?: number | null
          notes?: string | null
          external_url?: string | null
          document_date?: string | null
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
      user_settings: {
        Row: {
          user_id: string
          email_notifications: boolean
          appointment_reminders: boolean
          whatsapp_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          email_notifications?: boolean
          appointment_reminders?: boolean
          whatsapp_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          email_notifications?: boolean
          appointment_reminders?: boolean
          whatsapp_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      care_links: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id: string
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      doctor_patient_consent: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string
          status: 'requested' | 'accepted' | 'rejected' | 'revoked'
          share_basic_profile: boolean
          share_contact: boolean
          share_documents: boolean
          share_appointments: boolean
          share_medical_notes: boolean
          share_insurance: boolean
          request_reason: string | null
          access_expires_at: string | null
          requested_at: string
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id: string
          status?: 'requested' | 'accepted' | 'rejected' | 'revoked'
          share_basic_profile?: boolean
          share_contact?: boolean
          share_documents?: boolean
          share_appointments?: boolean
          share_medical_notes?: boolean
          share_insurance?: boolean
          request_reason?: string | null
          access_expires_at?: string | null
          requested_at?: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string
          status?: 'requested' | 'accepted' | 'rejected' | 'revoked'
          share_basic_profile?: boolean
          share_contact?: boolean
          share_documents?: boolean
          share_appointments?: boolean
          share_medical_notes?: boolean
          share_insurance?: boolean
          request_reason?: string | null
          access_expires_at?: string | null
          requested_at?: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patient_insurances: {
        Row: {
          id: string
          patient_id: string
          provider_name: string
          provider_other: string | null
          policy_number: string | null
          group_number: string | null
          member_id: string | null
          holder_name: string | null
          holder_relationship: string | null
          phone_claims: string | null
          phone_emergency: string | null
          valid_from: string | null
          valid_until: string | null
          coverage_type: string | null
          is_primary: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          provider_name: string
          provider_other?: string | null
          policy_number?: string | null
          group_number?: string | null
          member_id?: string | null
          holder_name?: string | null
          holder_relationship?: string | null
          phone_claims?: string | null
          phone_emergency?: string | null
          valid_from?: string | null
          valid_until?: string | null
          coverage_type?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          provider_name?: string
          provider_other?: string | null
          policy_number?: string | null
          group_number?: string | null
          member_id?: string | null
          holder_name?: string | null
          holder_relationship?: string | null
          phone_claims?: string | null
          phone_emergency?: string | null
          valid_from?: string | null
          valid_until?: string | null
          coverage_type?: string | null
          is_primary?: boolean
          notes?: string | null
          updated_at?: string
        }
      }
      document_shares: {
        Row: {
          id: string
          document_id: string
          shared_with: string
          shared_by: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          shared_with: string
          shared_by: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          shared_with?: string
          shared_by?: string
          created_at?: string
        }
      }
      document_requests: {
        Row: {
          id: string
          doctor_id: string
          patient_email: string | null
          patient_id: string | null
          document_type: string
          description: string | null
          token: string
          status: 'pending' | 'fulfilled' | 'expired'
          expires_at: string
          fulfilled_at: string | null
          document_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_email?: string | null
          patient_id?: string | null
          document_type?: string
          description?: string | null
          token?: string
          status?: 'pending' | 'fulfilled' | 'expired'
          expires_at?: string
          fulfilled_at?: string | null
          document_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_email?: string
          patient_id?: string | null
          document_type?: string
          description?: string | null
          token?: string
          status?: 'pending' | 'fulfilled' | 'expired'
          expires_at?: string
          fulfilled_at?: string | null
          document_id?: string | null
          created_at?: string
        }
      }
      // NOM-024-SSA3-2012 §6.6 / §3.42 — Registro de auditoría (inmutable)
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          patient_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: never  // Write only via log_audit_event RPC
        Update: never  // Immutable
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // NOM-024 §6.6 — audit RPC (SECURITY DEFINER, bypasses RLS)
      log_audit_event: {
        Args: {
          p_action: string
          p_resource_type: string
          p_resource_id?: string | null
          p_patient_id?: string | null
          p_details?: Json | null
        }
        Returns: void
      }
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
      search_public_doctors: {
        Args: {
          p_query?: string | null
          p_specialty?: string | null
          p_sort?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          slug: string
          display_name: string
          avatar_url: string | null
          specialty: string | null
          clinic_name: string | null
          bio: string | null
          years_experience: number | null
          consultation_price: number | null
          address_text: string | null
          location: Json | null
          is_verified: boolean
          avg_rating: number
          review_count: number
          total_count: number
        }[]
      }
      get_public_doctor_by_slug: {
        Args: { p_slug: string }
        Returns: {
          slug: string
          display_name: string
          avatar_url: string | null
          specialty: string | null
          clinic_name: string | null
          bio: string | null
          years_experience: number | null
          consultation_price: number | null
          address_text: string | null
          location: Json | null
          is_verified: boolean
          avg_rating: number
          review_count: number
        }[]
      }
      get_public_specialties: {
        Args: Record<PropertyKey, never>
        Returns: { specialty: string; doctor_count: number }[]
      }
    }
    Enums: {
      user_role: UserRole
      sex_type: SexType
      doc_category: DocCategory
    }
  }
}

/**
 * Expected shape of the `location` jsonb column in `doctor_profiles`.
 * Store as: { lat: number; lng: number }
 */
export interface DoctorLocation {
  lat: number;
  lng: number;
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row']
export type PatientProfile = Database['public']['Tables']['patient_profiles']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type CareLink = Database['public']['Tables']['care_links']['Row']
export type DoctorPatientConsent = Database['public']['Tables']['doctor_patient_consent']['Row']
export type DoctorPatientConsentInsert = Database['public']['Tables']['doctor_patient_consent']['Insert']
export type DoctorPatientConsentUpdate = Database['public']['Tables']['doctor_patient_consent']['Update']
export type ConsentStatus = 'requested' | 'accepted' | 'rejected' | 'revoked'
export type ConsentScope = 'share_basic_profile' | 'share_contact' | 'share_documents' | 'share_appointments' | 'share_medical_notes' | 'share_insurance'
export type PatientInsurance = Database['public']['Tables']['patient_insurances']['Row']
export type PatientInsuranceInsert = Database['public']['Tables']['patient_insurances']['Insert']
export type PatientInsuranceUpdate = Database['public']['Tables']['patient_insurances']['Update']

// Biometric history (not in generated schema yet — use manual type)
export interface BiometricRecord {
  id: string
  patient_id: string
  recorded_at: string
  height_cm: number | null
  weight_kg: number | null
  blood_type: string | null
  notes: string | null
  created_at: string
}
export type BiometricRecordInsert = Omit<BiometricRecord, 'id' | 'created_at'>

