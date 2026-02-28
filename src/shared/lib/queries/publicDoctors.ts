import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

// Untyped rpc helper – the custom SECURITY DEFINER functions are not in the
// generated Database type, so supabase.rpc() refuses the call at compile-time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (supabase as any).rpc.bind(supabase) as (
  fn: string,
  args?: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<{ data: any; error: any }>;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PublicDoctor {
  slug: string;
  display_name: string;
  avatar_url: string | null;
  specialty: string | null;
  clinic_name: string | null;
  bio: string | null;
  years_experience: number | null;
  consultation_price: number | null;
  address_text: string | null;
  city: string | null;
  location: { lat: number; lng: number } | null;
  is_verified: boolean;
  avg_rating: number;
  review_count: number;
  languages: string[] | null;
  accepts_video: boolean;
  next_available_slot: string | null;
}

export interface PublicDoctorEnriched extends PublicDoctor {
  education: EducationEntry[];
  illnesses_treated: string[];
  services: DoctorService[];
  insurances: string[];
}

export interface DoctorService {
  name: string;
  price: number | null;
  duration: number | null;
  description: string | null;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  year?: number;
}

export interface AvailabilitySlot {
  slot_date: string;
  slot_time: string;
  slot_ts: string;
}

export interface PublicDoctorReview {
  rating: number;
  rating_punctuality: number | null;
  rating_attention: number | null;
  rating_facilities: number | null;
  comment: string | null;
  reviewer: string;
  is_anonymous: boolean;
  created_at: string;
}

export interface ReviewSummary {
  avg_rating: number;
  avg_punctuality: number;
  avg_attention: number;
  avg_facilities: number;
  total_count: number;
  stars_5: number;
  stars_4: number;
  stars_3: number;
  stars_2: number;
  stars_1: number;
}

export interface ReviewableAppointment {
  appointment_id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_slug: string;
  doctor_avatar: string | null;
  specialty: string | null;
  start_at: string;
  already_reviewed: boolean;
}

export interface SpecialtyOption {
  specialty: string;
  doctor_count: number;
}

export interface InsuranceOption {
  insurance_provider: string;
  doctor_count: number;
}

export type SortOption =
  | 'rating'
  | 'experience'
  | 'name'
  | 'price_asc'
  | 'price_desc'
  | 'availability';

export interface SearchParams {
  query?: string;
  specialty?: string;
  sort?: 'rating' | 'experience' | 'name';
  page?: number;
  pageSize?: number;
}

export interface AdvancedSearchParams {
  query?: string;
  city?: string;
  specialty?: string;
  insurance?: string;
  acceptsVideo?: boolean;
  availableFrom?: string; // ISO date
  availableTo?: string;   // ISO date
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Search public doctor directory. Works without authentication (anon key).
 */
export async function searchPublicDoctors(
  params: SearchParams = {},
): Promise<PaginatedResult<PublicDoctor>> {
  const {
    query = null,
    specialty = null,
    sort = 'rating',
    page = 1,
    pageSize = 20,
  } = params;

  const offset = (page - 1) * pageSize;

  try {
    const { data, error } = await rpc('search_public_doctors', {
      p_query: query || null,
      p_specialty: specialty || null,
      p_sort: sort,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) {
      logger.error('searchPublicDoctors', error);
      return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }

    const rows = (data ?? []) as (PublicDoctor & { total_count: number })[];
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

    const doctors: PublicDoctor[] = rows.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ total_count: _tc, ...rest }) => rest,
    );

    return {
      data: doctors,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (err) {
    logger.error('searchPublicDoctors:unexpected', err);
    return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
}

/**
 * Get a single doctor's public profile by slug. Works without authentication.
 */
export async function getPublicDoctorBySlug(
  slug: string,
): Promise<PublicDoctor | null> {
  try {
    const { data, error } = await rpc('get_public_doctor_by_slug', {
      p_slug: slug,
    });

    if (error) {
      logger.error('getPublicDoctorBySlug', error);
      return null;
    }

    const rows = data as PublicDoctor[] | null;
    return rows && rows.length > 0 ? rows[0] : null;
  } catch (err) {
    logger.error('getPublicDoctorBySlug:unexpected', err);
    return null;
  }
}

/**
 * Get public reviews for a doctor by their slug.
 */
export async function getPublicDoctorReviews(
  slug: string,
  page = 1,
  pageSize = 10,
): Promise<PaginatedResult<PublicDoctorReview>> {
  const offset = (page - 1) * pageSize;

  try {
    const { data, error } = await rpc('get_public_doctor_reviews', {
      p_slug: slug,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) {
      logger.error('getPublicDoctorReviews', error);
      return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }

    const rows = (data ?? []) as (PublicDoctorReview & { total_count: number })[];
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

    const reviews: PublicDoctorReview[] = rows.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ total_count: _tc, ...rest }) => rest,
    );

    return {
      data: reviews,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (err) {
    logger.error('getPublicDoctorReviews:unexpected', err);
    return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
}

/**
 * Get list of available specialties with doctor counts.
 */
export async function getPublicSpecialties(): Promise<SpecialtyOption[]> {
  try {
    const { data, error } = await rpc('get_public_specialties');

    if (error) {
      logger.error('getPublicSpecialties', error);
      return [];
    }

    return (data ?? []) as SpecialtyOption[];
  } catch (err) {
    logger.error('getPublicSpecialties:unexpected', err);
    return [];
  }
}

// ─── NEW: Advanced search (v2) ──────────────────────────────────────────────

/**
 * Advanced doctor search with insurance, language, availability, city filters.
 */
export async function searchDoctorsAdvanced(
  params: AdvancedSearchParams = {},
): Promise<PaginatedResult<PublicDoctor>> {
  const {
    query = null,
    city = null,
    specialty = null,
    insurance = null,
    acceptsVideo = null,
    availableFrom = null,
    availableTo = null,
    sort = 'rating',
    page = 1,
    pageSize = 20,
  } = params;

  const offset = (page - 1) * pageSize;

  try {
    const { data, error } = await rpc('search_doctors_advanced', {
      p_query: query || null,
      p_city: city || null,
      p_specialty: specialty || null,
      p_insurance: insurance || null,
      p_accepts_video: acceptsVideo,
      p_available_from: availableFrom || null,
      p_available_to: availableTo || null,
      p_sort: sort,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) {
      // Fallback: RPC may not exist yet (migration not applied) or type signature mismatches.
      // Delegate to the original search_public_doctors.
      console.error('searchDoctorsAdvanced SUPABASE RPC ERROR:', error);
      logger.warn('searchDoctorsAdvanced: falling back to searchPublicDoctors', error.message);
      return searchPublicDoctors({
        query: query ?? undefined,
        specialty: specialty ?? undefined,
        sort: (['rating', 'experience', 'name'].includes(sort) ? sort : 'rating') as 'rating' | 'experience' | 'name',
        page,
        pageSize,
      });
    }

    const rows = (data ?? []) as (PublicDoctor & { total_count: number })[];
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

    const doctors: PublicDoctor[] = rows.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ total_count: _tc, ...rest }) => rest,
    );

    return { data: doctors, totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
  } catch (err) {
    logger.error('searchDoctorsAdvanced:unexpected', err);
    // Fallback on unexpected errors too
    return searchPublicDoctors({
      query: query ?? undefined,
      specialty: specialty ?? undefined,
      sort: (['rating', 'experience', 'name'].includes(sort) ? sort : 'rating') as 'rating' | 'experience' | 'name',
      page,
      pageSize,
    });
  }
}

/**
 * Get enriched doctor profile by slug (with services, insurances, education).
 */
export async function getPublicDoctorDetail(
  slug: string,
): Promise<PublicDoctorEnriched | null> {
  try {
    const { data, error } = await rpc('get_public_doctor_detail', { p_slug: slug });

    if (error) {
      // Fallback: RPC may not exist yet — use the legacy function
      logger.warn('getPublicDoctorDetail: falling back to getPublicDoctorBySlug', error.message);
      const legacy = await getPublicDoctorBySlug(slug);
      if (!legacy) return null;
      return {
        ...legacy,
        education: [],
        illnesses_treated: [],
        services: [],
        insurances: [],
      } as PublicDoctorEnriched;
    }

    const rows = data as PublicDoctorEnriched[] | null;
    if (!rows || rows.length === 0) return null;

    const doc = rows[0];
    // Parse JSON fields that come as raw JSONB
    return {
      ...doc,
      education: Array.isArray(doc.education) ? doc.education : [],
      services: Array.isArray(doc.services) ? doc.services : [],
      insurances: Array.isArray(doc.insurances) ? doc.insurances : [],
      illnesses_treated: Array.isArray(doc.illnesses_treated) ? doc.illnesses_treated : [],
    };
  } catch (err) {
    logger.error('getPublicDoctorDetail:unexpected', err);
    return null;
  }
}

// ─── Fallback slot generation ────────────────────────────────────────────────

/**
 * Generate synthetic availability slots for a date range based on
 * standard business hours (Mon–Fri 09:00–17:00, 30-min intervals).
 * Used as a fallback when the backend RPC is not yet available.
 */
function generateFallbackSlots(
  startDate: string,
  endDate: string,
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const now = new Date();

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay(); // 0=Sun … 6=Sat
    if (dow === 0 || dow === 6) continue; // skip weekends

    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === now.toISOString().split('T')[0];

    for (let hour = 9; hour < 17; hour++) {
      for (const min of [0, 30]) {
        // If today, skip past slots
        if (isToday && (hour < now.getHours() || (hour === now.getHours() && min <= now.getMinutes()))) {
          continue;
        }

        const hh = String(hour).padStart(2, '0');
        const mm = String(min).padStart(2, '0');
        slots.push({
          slot_date: dateStr,
          slot_time: `${hh}:${mm}:00`,
          slot_ts: `${dateStr}T${hh}:${mm}:00`,
        });
      }
    }
  }

  return slots;
}

/**
 * Get availability slots for a doctor in a date range.
 * Falls back to synthetic Mon–Fri 9–17 slots when the backend RPC is unavailable.
 */
export async function getDoctorAvailability(
  doctorSlug: string,
  startDate?: string,
  endDate?: string,
): Promise<AvailabilitySlot[]> {
  const resolvedStart = startDate || new Date().toISOString().split('T')[0];
  const resolvedEnd = endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  try {
    const { data: profile, error: profileError } = await supabase
      .from('doctor_profiles')
      .select('doctor_id')
      .eq('slug', doctorSlug)
      .single();

    if (profileError || !profile) {
      logger.warn('getDoctorAvailability: slug resolve failed, using fallback slots', profileError?.message);
      return generateFallbackSlots(resolvedStart, resolvedEnd);
    }

    const { data, error } = await rpc('get_doctor_availability', {
      p_doctor_id: profile.doctor_id,
      p_start_date: resolvedStart,
      p_end_date: resolvedEnd,
    });

    if (error) {
      logger.warn('getDoctorAvailability: RPC failed, using fallback slots', error.message);
      return generateFallbackSlots(resolvedStart, resolvedEnd);
    }

    const result = (data ?? []) as AvailabilitySlot[];
    // If the RPC returned nothing (e.g. doctor has no schedule rows yet), fall back
    if (result.length === 0) {
      return generateFallbackSlots(resolvedStart, resolvedEnd);
    }

    return result;
  } catch (err) {
    logger.warn('getDoctorAvailability: unexpected error, using fallback slots', err);
    return generateFallbackSlots(resolvedStart, resolvedEnd);
  }
}

/**
 * Get list of insurance providers with doctor counts (for filter sidebar).
 */
export async function getPublicInsuranceProviders(): Promise<InsuranceOption[]> {
  try {
    const { data, error } = await rpc('get_public_insurance_providers');

    if (error) {
      logger.error('getPublicInsuranceProviders', error);
      return [];
    }

    return (data ?? []) as InsuranceOption[];
  } catch (err) {
    logger.error('getPublicInsuranceProviders:unexpected', err);
    return [];
  }
}

// ─── SEO: search by specialty + city ────────────────────────────────────────

export async function searchDoctorsSeo(
  params: { specialty?: string; city?: string; sort?: string; page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<PublicDoctor>> {
  const { specialty = null, city = null, sort = 'rating', page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  try {
    const { data, error } = await rpc('search_doctors_seo', {
      p_specialty: specialty || null,
      p_city: city || null,
      p_sort: sort,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) {
      logger.warn('searchDoctorsSeo: falling back to searchPublicDoctors', error.message);
      return searchPublicDoctors({ specialty: specialty ?? undefined, sort: 'rating', page, pageSize });
    }

    const rows = (data ?? []) as (PublicDoctor & { total_count: number })[];
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const doctors: PublicDoctor[] = rows.map(({ total_count: _tc, ...rest }) => rest);
    return { data: doctors, totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
  } catch (err) {
    logger.error('searchDoctorsSeo:unexpected', err);
    return searchPublicDoctors({ specialty: specialty ?? undefined, sort: 'rating', page, pageSize });
  }
}

// ─── Review summary ─────────────────────────────────────────────────────────

export async function getDoctorReviewSummary(slug: string): Promise<ReviewSummary> {
  const empty: ReviewSummary = {
    avg_rating: 0, avg_punctuality: 0, avg_attention: 0, avg_facilities: 0,
    total_count: 0, stars_5: 0, stars_4: 0, stars_3: 0, stars_2: 0, stars_1: 0,
  };

  try {
    const { data, error } = await rpc('get_doctor_review_summary', { p_slug: slug });
    if (error) { logger.error('getDoctorReviewSummary', error); return empty; }
    const rows = data as ReviewSummary[];
    return rows && rows.length > 0 ? rows[0] : empty;
  } catch (err) {
    logger.error('getDoctorReviewSummary:unexpected', err);
    return empty;
  }
}

// ─── Reviewable appointments ────────────────────────────────────────────────

export async function getReviewableAppointments(): Promise<ReviewableAppointment[]> {
  try {
    const { data, error } = await rpc('get_reviewable_appointments');
    if (error) { logger.error('getReviewableAppointments', error); return []; }
    return (data ?? []) as ReviewableAppointment[];
  } catch (err) {
    logger.error('getReviewableAppointments:unexpected', err);
    return [];
  }
}

// ─── Submit verified review ─────────────────────────────────────────────────

export interface SubmitReviewPayload {
  appointmentId: string;
  rating: number;
  ratingPunctuality?: number;
  ratingAttention?: number;
  ratingFacilities?: number;
  comment?: string;
  isAnonymous?: boolean;
}

export async function submitVerifiedReview(payload: SubmitReviewPayload): Promise<{ id: string | null; error: string | null }> {
  try {
    const { data, error } = await rpc('submit_verified_review', {
      p_appointment_id: payload.appointmentId,
      p_rating: payload.rating,
      p_rating_punctuality: payload.ratingPunctuality ?? null,
      p_rating_attention: payload.ratingAttention ?? null,
      p_rating_facilities: payload.ratingFacilities ?? null,
      p_comment: payload.comment || null,
      p_is_anonymous: payload.isAnonymous ?? false,
    });

    if (error) {
      logger.error('submitVerifiedReview', error);
      return { id: null, error: error.message };
    }

    return { id: data as string, error: null };
  } catch (err) {
    logger.error('submitVerifiedReview:unexpected', err);
    return { id: null, error: 'Error inesperado al enviar la reseña' };
  }
}
