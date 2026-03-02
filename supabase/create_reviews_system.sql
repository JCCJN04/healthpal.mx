-- =========================================================================
--  SISTEMA DE RESEÑAS VERIFICADAS
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  Crea:
--    1. Tabla verified_reviews
--    2. RLS policies
--    3. Función submit_verified_review
--    4. Función get_reviewable_appointments
--    5. Función get_public_doctor_reviews
--    6. Función get_doctor_review_summary
--    7. Actualiza search_doctors_advanced para incluir avg_rating/review_count reales
--    8. Actualiza get_public_doctor_detail para incluir avg_rating/review_count reales
-- =========================================================================

-- ─── 1. TABLA verified_reviews ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.verified_reviews (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      UUID        NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating              SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rating_punctuality  SMALLINT    CHECK (rating_punctuality BETWEEN 1 AND 5),
  rating_attention    SMALLINT    CHECK (rating_attention BETWEEN 1 AND 5),
  rating_facilities   SMALLINT    CHECK (rating_facilities BETWEEN 1 AND 5),
  comment             TEXT,
  is_anonymous        BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar columnas faltantes si la tabla ya existía sin ellas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verified_reviews' AND column_name = 'rating_punctuality'
  ) THEN
    ALTER TABLE public.verified_reviews ADD COLUMN rating_punctuality SMALLINT CHECK (rating_punctuality BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verified_reviews' AND column_name = 'rating_attention'
  ) THEN
    ALTER TABLE public.verified_reviews ADD COLUMN rating_attention SMALLINT CHECK (rating_attention BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verified_reviews' AND column_name = 'rating_facilities'
  ) THEN
    ALTER TABLE public.verified_reviews ADD COLUMN rating_facilities SMALLINT CHECK (rating_facilities BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verified_reviews' AND column_name = 'is_anonymous'
  ) THEN
    ALTER TABLE public.verified_reviews ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verified_reviews' AND column_name = 'helpful_count'
  ) THEN
    ALTER TABLE public.verified_reviews ADD COLUMN helpful_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.verified_reviews ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer reseñas (necesario para el directorio público)
DROP POLICY IF EXISTS "reviews_read_all"      ON public.verified_reviews;
CREATE POLICY "reviews_read_all"
  ON public.verified_reviews FOR SELECT
  USING (true);

-- Solo el propio paciente puede insertar su reseña (la función RPC también lo valida)
DROP POLICY IF EXISTS "reviews_insert_own"    ON public.verified_reviews;
CREATE POLICY "reviews_insert_own"
  ON public.verified_reviews FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- El paciente no puede modificar ni borrar reseñas (inmutables una vez enviadas)

-- Permisos de tabla (necesarios además de las políticas RLS)
GRANT SELECT ON public.verified_reviews TO anon, authenticated;
GRANT INSERT ON public.verified_reviews TO authenticated;

-- doctor_profiles también debe ser legible para anon
-- (el directorio público ya lo necesita; las RPCs SECURITY DEFINER lo bypass an
-- pero las consultas directas del cliente no)
GRANT SELECT ON public.doctor_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "doctor_profiles_public_read" ON public.doctor_profiles;
CREATE POLICY "doctor_profiles_public_read"
  ON public.doctor_profiles FOR SELECT
  USING (true);

-- ─── 3. submit_verified_review ────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.submit_verified_review(uuid, integer, integer, integer, integer, text, boolean);
DROP FUNCTION IF EXISTS public.submit_verified_review(uuid, smallint, smallint, smallint, smallint, text, boolean);

CREATE OR REPLACE FUNCTION public.submit_verified_review(
  p_appointment_id    UUID,
  p_rating            INTEGER,
  p_rating_punctuality INTEGER DEFAULT NULL,
  p_rating_attention   INTEGER DEFAULT NULL,
  p_rating_facilities  INTEGER DEFAULT NULL,
  p_comment           TEXT    DEFAULT NULL,
  p_is_anonymous      BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id      UUID;
  v_doctor_id       UUID;
  v_appt_status     TEXT;
  v_existing_review UUID;
  v_new_id          UUID;
BEGIN
  -- Verificar autenticación
  v_patient_id := auth.uid();
  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Obtener datos de la cita
  SELECT doctor_id, status
  INTO   v_doctor_id, v_appt_status
  FROM   public.appointments
  WHERE  id = p_appointment_id
    AND  patient_id = v_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cita no encontrada o no pertenece al usuario';
  END IF;

  IF v_appt_status <> 'completed' THEN
    RAISE EXCEPTION 'Solo se pueden reseñar citas completadas (estado actual: %)', v_appt_status;
  END IF;

  -- Verificar que no exista una reseña previa
  SELECT id INTO v_existing_review
  FROM   public.verified_reviews
  WHERE  appointment_id = p_appointment_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Ya existe una reseña para esta cita';
  END IF;

  -- Insertar reseña
  INSERT INTO public.verified_reviews (
    appointment_id,
    patient_id,
    doctor_id,
    rating,
    rating_punctuality,
    rating_attention,
    rating_facilities,
    comment,
    is_anonymous
  ) VALUES (
    p_appointment_id,
    v_patient_id,
    v_doctor_id,
    p_rating::SMALLINT,
    p_rating_punctuality::SMALLINT,
    p_rating_attention::SMALLINT,
    p_rating_facilities::SMALLINT,
    p_comment,
    p_is_anonymous
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_verified_review(UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, BOOLEAN)
  TO authenticated;

-- ─── 4. get_reviewable_appointments ──────────────────────────────────────

DO $$
DECLARE func_rec record;
BEGIN
  FOR func_rec IN
    SELECT oid::regprocedure AS func_sig
    FROM pg_proc
    WHERE proname = 'get_reviewable_appointments' AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || func_rec.func_sig || ' CASCADE';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_reviewable_appointments()
RETURNS TABLE (
  appointment_id  UUID,
  doctor_id       UUID,
  doctor_name     TEXT,
  doctor_slug     TEXT,
  doctor_avatar   TEXT,
  specialty       TEXT,
  start_at        TIMESTAMPTZ,
  already_reviewed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  v_patient_id := auth.uid();
  IF v_patient_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id                            AS appointment_id,
    a.doctor_id                     AS doctor_id,
    pr.full_name::TEXT              AS doctor_name,
    dp.slug::TEXT                   AS doctor_slug,
    pr.avatar_url::TEXT             AS doctor_avatar,
    dp.specialty::TEXT              AS specialty,
    a.start_at                      AS start_at,
    (vr.id IS NOT NULL)::BOOLEAN    AS already_reviewed
  FROM   public.appointments a
  JOIN   public.profiles      pr ON pr.id = a.doctor_id
  JOIN   public.doctor_profiles dp ON dp.doctor_id = a.doctor_id
  LEFT JOIN public.verified_reviews vr ON vr.appointment_id = a.id
  WHERE  a.patient_id = v_patient_id
    AND  a.status = 'completed'
  ORDER BY a.start_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reviewable_appointments()
  TO authenticated;

-- ─── 5. get_public_doctor_reviews ────────────────────────────────────────

DO $$
DECLARE func_rec record;
BEGIN
  FOR func_rec IN
    SELECT oid::regprocedure AS func_sig
    FROM pg_proc
    WHERE proname = 'get_public_doctor_reviews' AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || func_rec.func_sig || ' CASCADE';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_public_doctor_reviews(
  p_slug    TEXT,
  p_limit   INTEGER DEFAULT 10,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                  UUID,
  rating              SMALLINT,
  rating_punctuality  SMALLINT,
  rating_attention    SMALLINT,
  rating_facilities   SMALLINT,
  comment             TEXT,
  reviewer            TEXT,
  is_anonymous        BOOLEAN,
  created_at          TIMESTAMPTZ,
  helpful_count       INTEGER,
  total_count         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id UUID;
BEGIN
  SELECT dp.doctor_id INTO v_doctor_id
  FROM   public.doctor_profiles dp
  WHERE  dp.slug = p_slug
  LIMIT  1;

  IF v_doctor_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    vr.id,
    vr.rating,
    vr.rating_punctuality,
    vr.rating_attention,
    vr.rating_facilities,
    vr.comment,
    CASE WHEN vr.is_anonymous THEN 'Anónimo'
         ELSE COALESCE(pr.full_name, 'Paciente')
    END::TEXT                                                    AS reviewer,
    vr.is_anonymous,
    vr.created_at,
    vr.helpful_count,
    COUNT(*) OVER ()                                             AS total_count
  FROM   public.verified_reviews vr
  LEFT JOIN public.profiles pr ON pr.id = vr.patient_id AND NOT vr.is_anonymous
  WHERE  vr.doctor_id = v_doctor_id
  ORDER BY vr.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_doctor_reviews(TEXT, INTEGER, INTEGER)
  TO anon, authenticated;

-- Incrementar “útil” de una reseña (cualquier usuario, deduplicación en cliente)
CREATE OR REPLACE FUNCTION public.increment_review_helpful(p_review_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.verified_reviews
  SET    helpful_count = helpful_count + 1
  WHERE  id = p_review_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_review_helpful(UUID)
  TO anon, authenticated;

-- ─── 6. get_doctor_review_summary ────────────────────────────────────────

DO $$
DECLARE func_rec record;
BEGIN
  FOR func_rec IN
    SELECT oid::regprocedure AS func_sig
    FROM pg_proc
    WHERE proname = 'get_doctor_review_summary' AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || func_rec.func_sig || ' CASCADE';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_doctor_review_summary(p_slug TEXT)
RETURNS TABLE (
  avg_rating    NUMERIC,
  avg_punctuality NUMERIC,
  avg_attention NUMERIC,
  avg_facilities NUMERIC,
  total_count   BIGINT,
  stars_5       BIGINT,
  stars_4       BIGINT,
  stars_3       BIGINT,
  stars_2       BIGINT,
  stars_1       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id UUID;
BEGIN
  SELECT dp.doctor_id INTO v_doctor_id
  FROM   public.doctor_profiles dp
  WHERE  dp.slug = p_slug
  LIMIT  1;

  IF v_doctor_id IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
      0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ROUND(AVG(vr.rating)::NUMERIC, 1)                            AS avg_rating,
    ROUND(AVG(vr.rating_punctuality)::NUMERIC, 1)                AS avg_punctuality,
    ROUND(AVG(vr.rating_attention)::NUMERIC, 1)                  AS avg_attention,
    ROUND(AVG(vr.rating_facilities)::NUMERIC, 1)                 AS avg_facilities,
    COUNT(*)                                                      AS total_count,
    COUNT(*) FILTER (WHERE vr.rating = 5)                        AS stars_5,
    COUNT(*) FILTER (WHERE vr.rating = 4)                        AS stars_4,
    COUNT(*) FILTER (WHERE vr.rating = 3)                        AS stars_3,
    COUNT(*) FILTER (WHERE vr.rating = 2)                        AS stars_2,
    COUNT(*) FILTER (WHERE vr.rating = 1)                        AS stars_1
  FROM public.verified_reviews vr
  WHERE vr.doctor_id = v_doctor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_review_summary(TEXT)
  TO anon, authenticated;

-- ─── 7. Actualizar search_doctors_advanced con ratings reales ─────────────
--  Reemplaza la versión actual que devuelve avg_rating=0, review_count=0

DO $$
DECLARE func_rec record;
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

CREATE OR REPLACE FUNCTION public.search_doctors_advanced(
  p_query         TEXT    DEFAULT NULL,
  p_city          TEXT    DEFAULT NULL,
  p_specialty     TEXT    DEFAULT NULL,
  p_insurance     TEXT    DEFAULT NULL,
  p_accepts_video BOOLEAN DEFAULT NULL,
  p_available_from TEXT   DEFAULT NULL,
  p_available_to   TEXT   DEFAULT NULL,
  p_sort          TEXT    DEFAULT 'rating',
  p_limit         INTEGER DEFAULT 20,
  p_offset        INTEGER DEFAULT 0
)
RETURNS TABLE (
  slug              TEXT,
  display_name      TEXT,
  avatar_url        TEXT,
  specialty         TEXT,
  clinic_name       TEXT,
  bio               TEXT,
  years_experience  INTEGER,
  consultation_price NUMERIC,
  address_text      TEXT,
  city              TEXT,
  location          JSONB,
  is_verified       BOOLEAN,
  avg_rating        NUMERIC,
  review_count      INTEGER,
  languages         TEXT[],
  accepts_video     BOOLEAN,
  next_available_slot TEXT,
  total_count       INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_total_count
  FROM   doctor_profiles dp
  JOIN   profiles p ON p.id = dp.doctor_id
  WHERE
    ((p_query IS NULL) OR (
      p.full_name ILIKE '%' || p_query || '%' OR
      dp.specialty ILIKE '%' || p_query || '%' OR
      dp.bio ILIKE '%' || p_query || '%'
    ))
    AND ((p_specialty IS NULL OR p_specialty = '') OR dp.specialty = p_specialty)
    AND ((p_city IS NULL OR p_city = '') OR (
      dp.address_text ILIKE '%' || p_city || '%' OR
      (dp.location->>'city') ILIKE '%' || p_city || '%'
    ))
    AND ((p_insurance IS NULL OR p_insurance = '') OR p_insurance = ANY(dp.accepted_insurances))
    AND (
      p_accepts_video IS NULL OR
      (p_accepts_video = true  AND dp.consultation_mode IN ('video', 'both')) OR
      (p_accepts_video = false AND dp.consultation_mode IN ('in-person', 'both'))
    );

  RETURN QUERY
  WITH review_stats AS (
    SELECT
      vr.doctor_id,
      ROUND(AVG(vr.rating)::NUMERIC, 1) AS avg_r,
      COUNT(*)::INTEGER                  AS rev_count
    FROM public.verified_reviews vr
    GROUP BY vr.doctor_id
  )
  SELECT
    dp.slug::TEXT,
    p.full_name::TEXT                                     AS display_name,
    p.avatar_url::TEXT,
    dp.specialty::TEXT,
    dp.clinic_name::TEXT,
    dp.bio::TEXT,
    dp.years_experience::INTEGER,
    dp.consultation_price_mxn::NUMERIC                    AS consultation_price,
    dp.address_text::TEXT,
    NULL::TEXT                                            AS city,
    dp.location::JSONB,
    false::BOOLEAN                                        AS is_verified,
    COALESCE(rs.avg_r, 0)::NUMERIC                        AS avg_rating,
    COALESCE(rs.rev_count, 0)::INTEGER                    AS review_count,
    ARRAY['Español']::TEXT[]                              AS languages,
    (dp.consultation_mode IN ('video', 'both'))::BOOLEAN  AS accepts_video,
    NULL::TEXT                                            AS next_available_slot,
    v_total_count::INTEGER                                AS total_count
  FROM   doctor_profiles dp
  JOIN   profiles p  ON p.id = dp.doctor_id
  LEFT JOIN review_stats rs ON rs.doctor_id = dp.doctor_id
  WHERE
    ((p_query IS NULL) OR (
      p.full_name ILIKE '%' || p_query || '%' OR
      dp.specialty ILIKE '%' || p_query || '%' OR
      dp.bio ILIKE '%' || p_query || '%'
    ))
    AND ((p_specialty IS NULL OR p_specialty = '') OR dp.specialty = p_specialty)
    AND ((p_city IS NULL OR p_city = '') OR (
      dp.address_text ILIKE '%' || p_city || '%' OR
      (dp.location->>'city') ILIKE '%' || p_city || '%'
    ))
    AND ((p_insurance IS NULL OR p_insurance = '') OR p_insurance = ANY(dp.accepted_insurances))
    AND (
      p_accepts_video IS NULL OR
      (p_accepts_video = true  AND dp.consultation_mode IN ('video', 'both')) OR
      (p_accepts_video = false AND dp.consultation_mode IN ('in-person', 'both'))
    )
  ORDER BY
    CASE WHEN p_sort = 'rating'     THEN COALESCE(rs.avg_r, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'experience' THEN dp.years_experience    END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc'  THEN dp.consultation_price_mxn END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN dp.consultation_price_mxn END DESC NULLS LAST,
    CASE WHEN p_sort = 'name'       THEN p.full_name            END ASC,
    p.full_name ASC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_doctors_advanced(TEXT,TEXT,TEXT,TEXT,BOOLEAN,TEXT,TEXT,TEXT,INTEGER,INTEGER)
  TO anon, authenticated;

-- ─── 8. Actualizar get_public_doctor_detail con ratings reales ────────────

DO $$
DECLARE func_rec record;
BEGIN
  FOR func_rec IN
    SELECT oid::regprocedure AS func_sig
    FROM pg_proc
    WHERE proname = 'get_public_doctor_detail' AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || func_rec.func_sig || ' CASCADE';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_public_doctor_detail(p_slug TEXT)
RETURNS TABLE (
  slug                TEXT,
  display_name        TEXT,
  avatar_url          TEXT,
  specialty           TEXT,
  clinic_name         TEXT,
  bio                 TEXT,
  years_experience    INTEGER,
  consultation_price  NUMERIC,
  address_text        TEXT,
  city                TEXT,
  location            JSONB,
  is_verified         BOOLEAN,
  avg_rating          NUMERIC,
  review_count        INTEGER,
  languages           TEXT[],
  accepts_video       BOOLEAN,
  next_available_slot TEXT,
  education           JSONB,
  illnesses_treated   JSONB,
  services            JSONB,
  insurances          JSONB
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
      p.full_name    AS display_name,
      p.avatar_url,
      dp.specialty,
      dp.clinic_name,
      dp.bio,
      dp.years_experience,
      dp.consultation_price_mxn,
      dp.address_text,
      dp.location,
      dp.consultation_mode,
      COALESCE(dp.accepted_insurances, ARRAY[]::TEXT[]) AS accepted_insurances
    FROM doctor_profiles dp
    JOIN profiles p ON p.id = dp.doctor_id
    WHERE dp.slug = p_slug
    LIMIT 1
  ),
  review_stats AS (
    SELECT
      ROUND(AVG(vr.rating)::NUMERIC, 1) AS avg_r,
      COUNT(*)::INTEGER                  AS rev_count
    FROM public.verified_reviews vr
    JOIN doc_profile doc ON doc.doctor_id = vr.doctor_id
  ),
  services_aggr AS (
    SELECT
      ds.doctor_id,
      jsonb_agg(
        jsonb_build_object(
          'name',        ds.name,
          'price',       ds.price,
          'duration',    ds.duration,
          'description', ds.description
        ) ORDER BY ds.sort_order
      ) AS services_json
    FROM doctor_services ds
    WHERE ds.is_active = true
    GROUP BY ds.doctor_id
  )
  SELECT
    doc.slug::TEXT,
    doc.display_name::TEXT,
    doc.avatar_url::TEXT,
    doc.specialty::TEXT,
    doc.clinic_name::TEXT,
    doc.bio::TEXT,
    doc.years_experience::INTEGER,
    doc.consultation_price_mxn::NUMERIC,
    doc.address_text::TEXT,
    NULL::TEXT                                              AS city,
    doc.location::JSONB,
    false::BOOLEAN                                          AS is_verified,
    COALESCE(rs.avg_r,    0)::NUMERIC                       AS avg_rating,
    COALESCE(rs.rev_count, 0)::INTEGER                      AS review_count,
    ARRAY['Español']::TEXT[]                                AS languages,
    (doc.consultation_mode IN ('video', 'both'))::BOOLEAN   AS accepts_video,
    NULL::TEXT                                              AS next_available_slot,
    '[]'::JSONB                                             AS education,
    '[]'::JSONB                                             AS illnesses_treated,
    COALESCE(sa.services_json, '[]'::JSONB)                 AS services,
    to_jsonb(doc.accepted_insurances)                       AS insurances
  FROM   doc_profile doc
  CROSS JOIN review_stats rs
  LEFT JOIN services_aggr sa ON sa.doctor_id = doc.doctor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_doctor_detail(TEXT)
  TO anon, authenticated;

-- ─── LISTO ────────────────────────────────────────────────────────────────
-- Verificación rápida (opcional, comenta si no quieres output):
SELECT
  proname                          AS funcion,
  pg_get_function_arguments(oid)   AS argumentos
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'submit_verified_review',
    'get_reviewable_appointments',
    'get_public_doctor_reviews',
    'get_doctor_review_summary',
    'search_doctors_advanced',
    'get_public_doctor_detail'
  )
ORDER BY proname;

-- Forzar a PostgREST a recargar el schema cache
-- (necesario después de DROP + CREATE de funciones)
NOTIFY pgrst, 'reload schema';
