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
  location: { lat: number; lng: number } | null;
  is_verified: boolean;
  avg_rating: number;
  review_count: number;
}

export interface PublicDoctorReview {
  rating: number;
  comment: string | null;
  reviewer: string;
  created_at: string;
}

export interface SpecialtyOption {
  specialty: string;
  doctor_count: number;
}

export interface SearchParams {
  query?: string;
  specialty?: string;
  sort?: 'rating' | 'experience' | 'name';
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
