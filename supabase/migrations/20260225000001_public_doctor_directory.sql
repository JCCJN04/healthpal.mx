-- =============================================================================
-- PUBLIC DOCTOR DIRECTORY – Migration
-- =============================================================================
-- Creates the public layer for an anonymous doctor directory:
--   1. slug column on doctor_profiles (SEO-friendly URLs)
--   2. SECURITY DEFINER functions for safe anonymous access
--   3. verified_reviews RLS policies
--   4. Performance indexes
--   5. Grants to anon role
-- =============================================================================

-- 0. Enable unaccent for slug generation
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- =============================================================================
-- 1. SLUG COLUMN
-- =============================================================================
ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS slug text;

-- Slug-generation helper (deterministic, collision-safe)
CREATE OR REPLACE FUNCTION public.generate_doctor_slug(
  p_doctor_id uuid,
  p_name      text,
  p_specialty text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  counter int := 0;
BEGIN
  -- Normalise: unaccent → lowercase → replace non-alphanum with hyphens → trim
  base := trim(both '-' from regexp_replace(
    lower(public.unaccent(
      coalesce(p_name, '') || ' ' || coalesce(p_specialty, '')
    )),
    '[^a-z0-9]+', '-', 'g'
  ));

  IF base = '' OR base IS NULL THEN
    base := 'doctor';
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1 FROM public.doctor_profiles
    WHERE slug = candidate AND doctor_id != p_doctor_id
  ) LOOP
    counter := counter + 1;
    candidate := base || '-' || counter;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Auto-generate slug on INSERT / UPDATE
CREATE OR REPLACE FUNCTION public.trg_doctor_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  doc_name text;
BEGIN
  SELECT full_name INTO doc_name
  FROM public.profiles
  WHERE id = NEW.doctor_id;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_doctor_slug(NEW.doctor_id, doc_name, NEW.specialty);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_slug_before ON public.doctor_profiles;
CREATE TRIGGER trg_doctor_slug_before
  BEFORE INSERT OR UPDATE ON public.doctor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_doctor_slug();

-- Back-fill existing rows
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT dp.doctor_id, p.full_name, dp.specialty
    FROM public.doctor_profiles dp
    JOIN public.profiles p ON p.id = dp.doctor_id
    WHERE dp.slug IS NULL
  LOOP
    UPDATE public.doctor_profiles
    SET slug = public.generate_doctor_slug(r.doctor_id, r.full_name, r.specialty)
    WHERE doctor_id = r.doctor_id;
  END LOOP;
END;
$$;

-- Now enforce NOT NULL + UNIQUE
ALTER TABLE public.doctor_profiles
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_profiles_slug
  ON public.doctor_profiles (slug);

-- =============================================================================
-- 2. SEARCH INDEXES
-- =============================================================================

-- Enable pg_trgm for fuzzy search (must come before the trigram index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_specialty
  ON public.doctor_profiles (specialty);

CREATE INDEX IF NOT EXISTS idx_profiles_role_onboarding
  ON public.profiles (role, onboarding_completed);

CREATE INDEX IF NOT EXISTS idx_profiles_fullname_trgm
  ON public.profiles USING gin (full_name gin_trgm_ops);

-- =============================================================================
-- 3. VERIFIED REVIEWS — RLS
-- =============================================================================
ALTER TABLE public.verified_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews
DROP POLICY IF EXISTS "reviews_select" ON public.verified_reviews;
CREATE POLICY "reviews_select"
  ON public.verified_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Patients can insert reviews for their own completed appointments
DROP POLICY IF EXISTS "reviews_insert" ON public.verified_reviews;
CREATE POLICY "reviews_insert"
  ON public.verified_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = patient_id
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND a.patient_id = auth.uid()
        AND a.status = 'completed'
    )
  );

-- =============================================================================
-- 4. SECURITY DEFINER FUNCTIONS (safe anon access)
-- =============================================================================

-- 4a. List / search public doctors ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_public_doctors(
  p_query     text    DEFAULT NULL,
  p_specialty text    DEFAULT NULL,
  p_sort      text    DEFAULT 'rating',   -- 'rating' | 'experience' | 'name'
  p_limit     int     DEFAULT 20,
  p_offset    int     DEFAULT 0
)
RETURNS TABLE (
  slug                text,
  display_name        text,
  avatar_url          text,
  specialty           text,
  clinic_name         text,
  bio                 text,
  years_experience    int,
  consultation_price  int,
  address_text        text,
  location            jsonb,
  is_verified         boolean,
  avg_rating          numeric,
  review_count        bigint,
  total_count         bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.slug,
    p.full_name          AS display_name,
    p.avatar_url,
    dp.specialty,
    dp.clinic_name,
    dp.bio,
    dp.years_experience,
    dp.consultation_price_mxn AS consultation_price,
    dp.address_text,
    dp.location,
    dp.is_sep_verified   AS is_verified,
    coalesce(round(avg(vr.rating)::numeric, 1), 0) AS avg_rating,
    count(vr.id)         AS review_count,
    count(*) OVER()      AS total_count
  FROM public.doctor_profiles dp
  JOIN public.profiles p ON p.id = dp.doctor_id
  LEFT JOIN public.verified_reviews vr ON vr.doctor_id = dp.doctor_id
  WHERE p.role = 'doctor'
    AND p.onboarding_completed = true
    AND (
      p_query IS NULL
      OR p.full_name ILIKE '%' || p_query || '%'
      OR dp.specialty ILIKE '%' || p_query || '%'
      OR dp.clinic_name ILIKE '%' || p_query || '%'
      OR dp.address_text ILIKE '%' || p_query || '%'
    )
    AND (p_specialty IS NULL OR dp.specialty = p_specialty)
  GROUP BY
    dp.doctor_id, dp.slug, p.full_name, p.avatar_url,
    dp.specialty, dp.clinic_name, dp.bio, dp.years_experience,
    dp.consultation_price_mxn, dp.address_text, dp.location,
    dp.is_sep_verified
  ORDER BY
    CASE WHEN p_sort = 'rating'     THEN coalesce(avg(vr.rating), 0) END DESC,
    CASE WHEN p_sort = 'experience' THEN dp.years_experience         END DESC NULLS LAST,
    CASE WHEN p_sort = 'name'       THEN p.full_name                 END ASC,
    p.full_name ASC
  LIMIT LEAST(p_limit, 50)
  OFFSET p_offset;
END;
$$;

-- 4b. Get single doctor by slug ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_doctor_by_slug(p_slug text)
RETURNS TABLE (
  slug                text,
  display_name        text,
  avatar_url          text,
  specialty           text,
  clinic_name         text,
  bio                 text,
  years_experience    int,
  consultation_price  int,
  address_text        text,
  location            jsonb,
  is_verified         boolean,
  avg_rating          numeric,
  review_count        bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.slug,
    p.full_name          AS display_name,
    p.avatar_url,
    dp.specialty,
    dp.clinic_name,
    dp.bio,
    dp.years_experience,
    dp.consultation_price_mxn AS consultation_price,
    dp.address_text,
    dp.location,
    dp.is_sep_verified   AS is_verified,
    coalesce(round(avg(vr.rating)::numeric, 1), 0) AS avg_rating,
    count(vr.id)         AS review_count
  FROM public.doctor_profiles dp
  JOIN public.profiles p ON p.id = dp.doctor_id
  LEFT JOIN public.verified_reviews vr ON vr.doctor_id = dp.doctor_id
  WHERE dp.slug = p_slug
    AND p.role = 'doctor'
    AND p.onboarding_completed = true
  GROUP BY
    dp.doctor_id, dp.slug, p.full_name, p.avatar_url,
    dp.specialty, dp.clinic_name, dp.bio, dp.years_experience,
    dp.consultation_price_mxn, dp.address_text, dp.location,
    dp.is_sep_verified
  LIMIT 1;
END;
$$;

-- 4c. Get reviews for a doctor (by slug) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_doctor_reviews(
  p_slug   text,
  p_limit  int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  rating      int,
  comment     text,
  reviewer    text,       -- first name only for privacy
  created_at  timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vr.rating,
    vr.comment,
    split_part(coalesce(p_reviewer.full_name, 'Paciente'), ' ', 1) AS reviewer,
    vr.created_at,
    count(*) OVER() AS total_count
  FROM public.verified_reviews vr
  JOIN public.doctor_profiles dp ON dp.doctor_id = vr.doctor_id
  JOIN public.profiles p_reviewer ON p_reviewer.id = vr.patient_id
  WHERE dp.slug = p_slug
  ORDER BY vr.created_at DESC
  LIMIT LEAST(p_limit, 50)
  OFFSET p_offset;
END;
$$;

-- 4d. List available specialties ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_specialties()
RETURNS TABLE (
  specialty    text,
  doctor_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT dp.specialty, count(*) AS doctor_count
  FROM public.doctor_profiles dp
  JOIN public.profiles p ON p.id = dp.doctor_id
  WHERE p.role = 'doctor'
    AND p.onboarding_completed = true
    AND dp.specialty IS NOT NULL
  GROUP BY dp.specialty
  ORDER BY doctor_count DESC;
$$;

-- =============================================================================
-- 5. GRANT EXECUTE TO ANON
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.search_public_doctors      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_doctor_by_slug  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_doctor_reviews  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_specialties     TO anon, authenticated;

-- =============================================================================
-- 6. SECURITY AUDIT: ensure NO anon SELECT on sensitive tables
-- =============================================================================
-- (These statements are idempotent – they revoke any accidental grants)
REVOKE ALL ON public.profiles              FROM anon;
REVOKE ALL ON public.doctor_profiles       FROM anon;
REVOKE ALL ON public.patient_profiles      FROM anon;
REVOKE ALL ON public.appointments          FROM anon;
REVOKE ALL ON public.appointment_notes     FROM anon;
REVOKE ALL ON public.documents             FROM anon;
REVOKE ALL ON public.document_shares       FROM anon;
REVOKE ALL ON public.document_folders      FROM anon;
REVOKE ALL ON public.folders               FROM anon;
REVOKE ALL ON public.messages              FROM anon;
REVOKE ALL ON public.conversations         FROM anon;
REVOKE ALL ON public.conversation_participants FROM anon;
REVOKE ALL ON public.notifications         FROM anon;
REVOKE ALL ON public.patient_notes         FROM anon;
REVOKE ALL ON public.care_links            FROM anon;
REVOKE ALL ON public.user_settings         FROM anon;
REVOKE ALL ON public.user_status           FROM anon;
REVOKE ALL ON public.verified_reviews      FROM anon;
