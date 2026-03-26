-- Migration: Add is_public toggle to doctor_profiles
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Update get_public_doctor_detail
CREATE OR REPLACE FUNCTION public.get_public_doctor_detail(p_slug text)
RETURNS TABLE(
    slug text,
    display_name text,
    avatar_url text,
    specialty text,
    clinic_name text,
    bio text,
    years_experience integer,
    consultation_price numeric,
    address_text text,
    city text,
    location jsonb,
    is_verified boolean,
    avg_rating numeric,
    review_count integer,
    languages text[],
    accepts_video boolean,
    next_available_slot text,
    education jsonb,
    illnesses_treated jsonb,
    services jsonb,
    insurances jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH doc_profile AS (
        SELECT 
            dp.doctor_id,
            dp.slug,
            p.full_name AS display_name,
            p.avatar_url,
            dp.specialty,
            dp.clinic_name,
            dp.bio,
            dp.years_experience,
            dp.consultation_price_mxn,
            dp.address_text,
            dp.location,
            dp.consultation_mode,
            COALESCE(dp.accepted_insurances, ARRAY[]::text[]) AS accepted_insurances
        FROM doctor_profiles dp
        JOIN profiles p ON p.id = dp.doctor_id
        WHERE dp.slug = p_slug AND dp.is_public = true
        LIMIT 1
    ),
    services_aggr AS (
        SELECT 
            ds.doctor_id,
            jsonb_agg(
                jsonb_build_object(
                    'name', ds.name,
                    'price', ds.price,
                    'duration', ds.duration,
                    'description', ds.description
                ) ORDER BY ds.sort_order
            ) AS services_json
        FROM doctor_services ds
        WHERE ds.is_active = true
        GROUP BY ds.doctor_id
    )
    SELECT
        dp.slug::text,
        dp.display_name::text,
        dp.avatar_url::text,
        dp.specialty::text,
        dp.clinic_name::text,
        dp.bio::text,
        dp.years_experience::integer,
        dp.consultation_price_mxn::numeric,
        dp.address_text::text,
        NULL::text AS city,
        dp.location::jsonb,
        false::boolean AS is_verified,
        COALESCE(r.avg_rating, 0)::numeric AS avg_rating,
        COALESCE(r.review_count, 0)::integer AS review_count,
        ARRAY['Español']::text[] AS languages,
        (dp.consultation_mode IN ('video', 'both'))::boolean AS accepts_video,
        NULL::text AS next_available_slot,
        '[]'::jsonb AS education,
        '[]'::jsonb AS illnesses_treated,
        COALESCE(sa.services_json, '[]'::jsonb) AS services,
        to_jsonb(dp.accepted_insurances) AS insurances
    FROM doc_profile dp
    LEFT JOIN services_aggr sa ON sa.doctor_id = dp.doctor_id
    LEFT JOIN (
        SELECT 
            doctor_id, 
            ROUND(AVG(rating)::numeric, 1) AS avg_rating, 
            COUNT(*) AS review_count
        FROM verified_reviews
        GROUP BY doctor_id
    ) r ON r.doctor_id = dp.doctor_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_doctor_detail(text) TO anon, authenticated, service_role;

-- Update search_doctors_advanced
CREATE OR REPLACE FUNCTION public.search_doctors_advanced(
  p_query text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_specialty text DEFAULT NULL,
  p_insurance text DEFAULT NULL,
  p_accepts_video boolean DEFAULT NULL,
  p_available_from text DEFAULT NULL,
  p_available_to text DEFAULT NULL,
  p_sort text DEFAULT 'rating',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  slug text,
  display_name text,
  avatar_url text,
  specialty text,
  clinic_name text,
  bio text,
  years_experience integer,
  consultation_price numeric,
  address_text text,
  city text,
  location jsonb,
  is_verified boolean,
  avg_rating numeric,
  review_count integer,
  languages text[],
  accepts_video boolean,
  next_available_slot text,
  total_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count int;
BEGIN
  -- Calcular el total sin límite ni offset para la paginación
  SELECT count(*) INTO v_total_count
  FROM doctor_profiles dp
  JOIN profiles p ON p.id = dp.doctor_id
  WHERE dp.is_public = true
    AND ((p_query IS NULL) OR (p.full_name ILIKE '%' || p_query || '%' OR dp.specialty ILIKE '%' || p_query || '%' OR dp.bio ILIKE '%' || p_query || '%'))
    AND ((p_specialty IS NULL OR p_specialty = '') OR (dp.specialty = p_specialty))
    AND ((p_city IS NULL OR p_city = '') OR (dp.address_text ILIKE '%' || p_city || '%' OR (dp.location->>'city') ILIKE '%' || p_city || '%'))
    AND ((p_insurance IS NULL OR p_insurance = '') OR (p_insurance = ANY(dp.accepted_insurances)))
    AND (
      p_accepts_video IS NULL OR
      (p_accepts_video = true AND dp.consultation_mode IN ('video', 'both')) OR
      (p_accepts_video = false AND dp.consultation_mode IN ('in-person', 'both'))
    );

  RETURN QUERY
  SELECT
    dp.slug::text,
    p.full_name::text AS display_name,
    p.avatar_url::text,
    dp.specialty::text,
    dp.clinic_name::text,
    dp.bio::text,
    dp.years_experience::integer,
    dp.consultation_price_mxn::numeric AS consultation_price,
    dp.address_text::text,
    NULL::text AS city,
    dp.location::jsonb,
    false::boolean AS is_verified,
    COALESCE(r.avg_rating, 0)::numeric AS avg_rating,
    COALESCE(r.review_count, 0)::integer AS review_count,
    ARRAY['Español']::text[] AS languages,
    (dp.consultation_mode IN ('video', 'both'))::boolean AS accepts_video,
    NULL::text AS next_available_slot,
    v_total_count::integer AS total_count
  FROM doctor_profiles dp
  JOIN profiles p ON p.id = dp.doctor_id
  LEFT JOIN (
      SELECT 
          doctor_id, 
          ROUND(AVG(rating)::numeric, 1) AS avg_rating, 
          COUNT(*) AS review_count
      FROM verified_reviews
      GROUP BY doctor_id
  ) r ON r.doctor_id = dp.doctor_id
  WHERE dp.is_public = true
    AND ((p_query IS NULL) OR (p.full_name ILIKE '%' || p_query || '%' OR dp.specialty ILIKE '%' || p_query || '%' OR dp.bio ILIKE '%' || p_query || '%'))
    AND ((p_specialty IS NULL OR p_specialty = '') OR (dp.specialty = p_specialty))
    AND ((p_city IS NULL OR p_city = '') OR (dp.address_text ILIKE '%' || p_city || '%' OR (dp.location->>'city') ILIKE '%' || p_city || '%'))
    AND ((p_insurance IS NULL OR p_insurance = '') OR (p_insurance = ANY(dp.accepted_insurances)))
    AND (
      p_accepts_video IS NULL OR
      (p_accepts_video = true AND dp.consultation_mode IN ('video', 'both')) OR
      (p_accepts_video = false AND dp.consultation_mode IN ('in-person', 'both'))
    )
  ORDER BY
    CASE WHEN p_sort = 'rating' THEN COALESCE(r.avg_rating, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'experience' THEN dp.years_experience END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc' THEN dp.consultation_price_mxn END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN dp.consultation_price_mxn END DESC NULLS LAST,
    p.full_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_doctors_advanced(text, text, text, text, boolean, text, text, text, integer, integer) TO anon, authenticated, service_role;
