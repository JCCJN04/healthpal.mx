import { supabase } from '@/shared/lib/supabase'

export interface LegalConsent {
    user_id: string
    terms_accepted: boolean
    privacy_accepted: boolean
    medical_data_consent: boolean
    marketing_consent: boolean
    terms_version?: string
    privacy_version?: string
    accepted_at?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const TERMS_VERSION   = '2026-05-27'
const PRIVACY_VERSION = '2026-05-27'

export async function saveLegalConsent(
    userId: string,
    consent: Pick<LegalConsent, 'terms_accepted' | 'privacy_accepted' | 'medical_data_consent' | 'marketing_consent'>,
): Promise<void> {
    const { error } = await db.from('legal_consents').upsert({
        user_id: userId,
        ...consent,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        accepted_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) throw error
}

export async function getLegalConsent(userId: string): Promise<LegalConsent | null> {
    const { data, error } = await db
        .from('legal_consents')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    if (error) throw error
    return data as LegalConsent | null
}
