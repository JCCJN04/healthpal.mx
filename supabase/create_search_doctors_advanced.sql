-- =========================================================================
--  REEMPLAZAR FUNCIÓN search_doctors_advanced
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- =========================================================================

-- 1. ELIMINAR CUALQUIER VERSIÓN ANTERIOR AUTOMÁTICAMENTE
DO $$
DECLARE
    func_rec record;
BEGIN
    FOR func_rec IN 
        SELECT oid::regprocedure AS func_sig
        FROM pg_proc 
        WHERE proname = 'search_doctors_advanced' AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_rec.func_sig || ' CASCADE';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. CREAR LA VERSIÓN DEFINITIVA
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
  WHERE 
    ((p_query IS NULL) OR (p.full_name ILIKE '%' || p_query || '%' OR dp.specialty ILIKE '%' || p_query || '%' OR dp.bio ILIKE '%' || p_query || '%'))
    AND ((p_specialty IS NULL OR p_specialty = '') OR (dp.specialty = p_specialty))
    AND ((p_city IS NULL OR p_city = '') OR (dp.address_text ILIKE '%' || p_city || '%' OR (dp.location->>'city') ILIKE '%' || p_city || '%'))
    AND ((p_insurance IS NULL OR p_insurance = '') OR (p_insurance = ANY(dp.accepted_insurances)))
    -- Filtro por modalidad de consulta:
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
    0::numeric AS avg_rating,
    0::integer AS review_count,
    ARRAY['Español']::text[] AS languages,
    -- Determine per-doctor accepts_video boolean for UI
    (dp.consultation_mode IN ('video', 'both'))::boolean AS accepts_video,
    NULL::text AS next_available_slot,
    v_total_count::integer AS total_count
  FROM doctor_profiles dp
  JOIN profiles p ON p.id = dp.doctor_id
  WHERE 
    ((p_query IS NULL) OR (p.full_name ILIKE '%' || p_query || '%' OR dp.specialty ILIKE '%' || p_query || '%' OR dp.bio ILIKE '%' || p_query || '%'))
    AND ((p_specialty IS NULL OR p_specialty = '') OR (dp.specialty = p_specialty))
    AND ((p_city IS NULL OR p_city = '') OR (dp.address_text ILIKE '%' || p_city || '%' OR (dp.location->>'city') ILIKE '%' || p_city || '%'))
    AND ((p_insurance IS NULL OR p_insurance = '') OR (p_insurance = ANY(dp.accepted_insurances)))
    AND (
      p_accepts_video IS NULL OR
      (p_accepts_video = true AND dp.consultation_mode IN ('video', 'both')) OR
      (p_accepts_video = false AND dp.consultation_mode IN ('in-person', 'both'))
    )
  ORDER BY 
    CASE WHEN p_sort = 'experience' THEN dp.years_experience END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc' THEN dp.consultation_price_mxn END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN dp.consultation_price_mxn END DESC NULLS LAST,
    CASE WHEN p_sort = 'name' THEN p.full_name END ASC,
    p.full_name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
