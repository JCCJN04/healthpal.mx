--
-- PostgreSQL database dump
--

\restrict iin7RryAO10XYhSwPzhXdA94DRAcGq6iikjKZypPi12GKUYcYLX4h2T8lTyep3D

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";

--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";

--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."appointment_status" AS ENUM (
    'requested',
    'confirmed',
    'completed',
    'cancelled',
    'rejected',
    'no_show'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";

--
-- Name: doc_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."doc_category" AS ENUM (
    'radiology',
    'prescription',
    'history',
    'lab',
    'insurance',
    'other'
);


ALTER TYPE "public"."doc_category" OWNER TO "postgres";

--
-- Name: sex_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."sex_type" AS ENUM (
    'male',
    'female',
    'other',
    'unspecified'
);


ALTER TYPE "public"."sex_type" OWNER TO "postgres";

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."user_role" AS ENUM (
    'patient',
    'doctor',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";

--
-- Name: visit_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."visit_mode" AS ENUM (
    'in_person',
    'video',
    'phone'
);


ALTER TYPE "public"."visit_mode" OWNER TO "postgres";

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";

--
-- Name: FUNCTION "email"(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";

--
-- Name: FUNCTION "role"(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";

--
-- Name: FUNCTION "uid"(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: can_access_patient("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."can_access_patient"("_patient_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    -- Patient themselves: always
    auth.uid() = _patient_id
    OR
    -- Doctor with accepted consent (at least basic profile scope)
    public.has_consent(_patient_id);
$$;


ALTER FUNCTION "public"."can_access_patient"("_patient_id" "uuid") OWNER TO "postgres";

--
-- Name: current_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."current_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."current_role"() OWNER TO "postgres";

--
-- Name: enqueue_encryption_backfill(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."enqueue_encryption_backfill"() RETURNS TABLE("enqueued_rows" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 0::bigint AS enqueued_rows;
$$;


ALTER FUNCTION "public"."enqueue_encryption_backfill"() OWNER TO "postgres";

--
-- Name: generate_doctor_slug("uuid", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."generate_doctor_slug"("p_doctor_id" "uuid", "p_name" "text", "p_specialty" "text") RETURNS "text"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."generate_doctor_slug"("p_doctor_id" "uuid", "p_name" "text", "p_specialty" "text") OWNER TO "postgres";

--
-- Name: get_all_specialties(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_all_specialties"() RETURNS TABLE("slug" "text", "label" "text", "grp" "text", "sort_order" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT s.slug, s.label, s.grp, s.sort_order
  FROM public.specialties s
  ORDER BY s.sort_order, s.label;
$$;


ALTER FUNCTION "public"."get_all_specialties"() OWNER TO "postgres";

--
-- Name: get_conversation_between_users("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_conversation_between_users"("user_a" "uuid", "user_b" "uuid") RETURNS TABLE("id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT cp1.conversation_id AS id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user_a AND cp2.user_id = user_b
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_conversation_between_users"("user_a" "uuid", "user_b" "uuid") OWNER TO "postgres";

--
-- Name: get_doctor_availability_by_slug("text", "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_doctor_availability_by_slug"("p_slug" "text", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("slot_date" "date", "slot_time" time without time zone, "slot_ts" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_doctor_id uuid;
  d date;
  sched record;
  t time;
  slot_start_ts timestamptz;
  slot_end_ts timestamptz;
  mexico_tz text := 'America/Mexico_City';
BEGIN
  -- Resolver slug → doctor_id (SECURITY DEFINER bypass RLS)
  SELECT dp.doctor_id INTO v_doctor_id
  FROM doctor_profiles dp
  WHERE dp.slug = p_slug
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RETURN; -- Slug no encontrado
  END IF;

  d := p_start_date;

  WHILE d <= p_end_date LOOP
    FOR sched IN
      SELECT ds.open_time, ds.close_time
      FROM doctor_schedules ds
      WHERE ds.doctor_id = v_doctor_id
        AND ds.day_of_week = EXTRACT(DOW FROM d)::int
        AND ds.is_active = true
      ORDER BY ds.open_time
    LOOP
      t := sched.open_time;

      WHILE (t + interval '30 minutes') <= sched.close_time LOOP
        slot_start_ts := (d + t) AT TIME ZONE mexico_tz;
        slot_end_ts   := slot_start_ts + interval '30 minutes';

        IF slot_start_ts > now() THEN
          -- Verificar que NO haya cita activa que se traslape
          IF NOT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.doctor_id = v_doctor_id
              AND a.status IN ('requested', 'confirmed')
              AND a.start_at::timestamptz < slot_end_ts
              AND a.end_at::timestamptz   > slot_start_ts
          ) THEN
            slot_date := d;
            slot_time := t;
            slot_ts   := to_char((slot_start_ts AT TIME ZONE mexico_tz), 'YYYY-MM-DD"T"HH24:MI:SS');
            RETURN NEXT;
          END IF;
        END IF;

        t := t + interval '30 minutes';
      END LOOP;
    END LOOP;

    d := d + 1;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_doctor_availability_by_slug"("p_slug" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: get_doctor_review_summary("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_doctor_review_summary"("p_slug" "text") RETURNS TABLE("avg_rating" numeric, "avg_punctuality" numeric, "avg_attention" numeric, "avg_facilities" numeric, "total_count" bigint, "stars_5" bigint, "stars_4" bigint, "stars_3" bigint, "stars_2" bigint, "stars_1" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_doctor_review_summary"("p_slug" "text") OWNER TO "postgres";

--
-- Name: get_encryption_backfill_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_encryption_backfill_stats"() RETURNS TABLE("target_table" "text", "status" "text", "total" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT q.target_table, q.status, COUNT(*)::bigint AS total
  FROM public.encryption_backfill_queue q
  WHERE public.current_role() = 'admin'::public.user_role
  GROUP BY q.target_table, q.status
  ORDER BY q.target_table, q.status;
$$;


ALTER FUNCTION "public"."get_encryption_backfill_stats"() OWNER TO "postgres";

--
-- Name: get_folder_item_count("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_folder_item_count"("p_folder_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  item_count bigint;
BEGIN
  -- Security: Verify folder belongs to the calling user
  IF NOT EXISTS (
    SELECT 1 FROM folders
    WHERE id = p_folder_id AND owner_id = auth.uid()
  ) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO item_count
  FROM documents
  WHERE folder_id = p_folder_id AND owner_id = auth.uid();

  RETURN item_count;
END;
$$;


ALTER FUNCTION "public"."get_folder_item_count"("p_folder_id" "uuid") OWNER TO "postgres";

--
-- Name: get_public_doctor_by_slug("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_public_doctor_by_slug"("p_slug" "text") RETURNS TABLE("slug" "text", "display_name" "text", "avatar_url" "text", "specialty" "text", "clinic_name" "text", "bio" "text", "years_experience" integer, "consultation_price" integer, "address_text" "text", "location" "jsonb", "is_verified" boolean, "avg_rating" numeric, "review_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_public_doctor_by_slug"("p_slug" "text") OWNER TO "postgres";

--
-- Name: get_public_doctor_detail("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_public_doctor_detail"("p_slug" "text") RETURNS TABLE("slug" "text", "display_name" "text", "avatar_url" "text", "specialty" "text", "clinic_name" "text", "bio" "text", "years_experience" integer, "consultation_price" numeric, "address_text" "text", "city" "text", "location" "jsonb", "is_verified" boolean, "avg_rating" numeric, "review_count" integer, "languages" "text"[], "accepts_video" boolean, "next_available_slot" "text", "education" "jsonb", "illnesses_treated" "jsonb", "services" "jsonb", "insurances" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_public_doctor_detail"("p_slug" "text") OWNER TO "postgres";

--
-- Name: get_public_doctor_reviews("text", integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_public_doctor_reviews"("p_slug" "text", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "rating" smallint, "rating_punctuality" smallint, "rating_attention" smallint, "rating_facilities" smallint, "comment" "text", "reviewer" "text", "is_anonymous" boolean, "created_at" timestamp with time zone, "helpful_count" integer, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_public_doctor_reviews"("p_slug" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";

--
-- Name: get_public_insurance_providers(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_public_insurance_providers"() RETURNS TABLE("insurance_provider" "text", "doctor_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT di.insurance_provider, count(DISTINCT di.doctor_id) AS doctor_count
  FROM doctor_insurances di
  JOIN doctor_profiles dp ON dp.doctor_id = di.doctor_id
  JOIN profiles p ON p.id = dp.doctor_id
  WHERE p.role = 'doctor' AND p.onboarding_completed = true
  GROUP BY di.insurance_provider
  ORDER BY doctor_count DESC;
$$;


ALTER FUNCTION "public"."get_public_insurance_providers"() OWNER TO "postgres";

--
-- Name: get_public_specialties(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_public_specialties"() RETURNS TABLE("specialty" "text", "doctor_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_public_specialties"() OWNER TO "postgres";

--
-- Name: get_reviewable_appointments(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_reviewable_appointments"() RETURNS TABLE("appointment_id" "uuid", "doctor_id" "uuid", "doctor_name" "text", "doctor_slug" "text", "doctor_avatar" "text", "specialty" "text", "start_at" timestamp with time zone, "already_reviewed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_reviewable_appointments"() OWNER TO "postgres";

--
-- Name: get_unread_total("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_unread_total"("p_user_id" "uuid") RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(SUM(cnt), 0)::bigint
  FROM (
    SELECT COUNT(*) AS cnt
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE cp.user_id = p_user_id
      AND m.sender_id != p_user_id
      AND m.created_at > cp.last_read_at
  ) sub;
$$;


ALTER FUNCTION "public"."get_unread_total"("p_user_id" "uuid") OWNER TO "postgres";

--
-- Name: handle_new_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."handle_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_text = NEW.body
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_message"() OWNER TO "postgres";

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _requested_role text;
  _safe_role public.user_role;
BEGIN
  _requested_role := new.raw_user_meta_data->>'role';

  -- Only allow 'patient' or 'doctor' via self-registration
  IF _requested_role IN ('patient', 'doctor') THEN
    _safe_role := _requested_role::public.user_role;
  ELSE
    _safe_role := 'patient'::public.user_role;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, onboarding_completed, onboarding_step
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    _safe_role,
    false,
    'role'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(profiles.role, _safe_role),
    onboarding_completed = COALESCE(profiles.onboarding_completed, false),
    onboarding_step = COALESCE(profiles.onboarding_step, 'role');

  RETURN new;
END $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";

--
-- Name: has_consent("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."has_consent"("_patient_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_patient_consent
    WHERE doctor_id  = auth.uid()
      AND patient_id = _patient_id
      AND status     = 'accepted'
      AND (access_expires_at IS NULL OR access_expires_at > now())
  );
$$;


ALTER FUNCTION "public"."has_consent"("_patient_id" "uuid") OWNER TO "postgres";

--
-- Name: has_patient_scope("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."has_patient_scope"("_patient_id" "uuid", "_scope" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT CASE _scope
      WHEN 'share_basic_profile'  THEN share_basic_profile
      WHEN 'share_contact'        THEN share_contact
      WHEN 'share_documents'      THEN share_documents
      WHEN 'share_appointments'   THEN share_appointments
      WHEN 'share_medical_notes'  THEN share_medical_notes
      ELSE false
    END
    FROM public.doctor_patient_consent
    WHERE doctor_id  = auth.uid()
      AND patient_id = _patient_id
      AND status     = 'accepted'
      AND (access_expires_at IS NULL OR access_expires_at > now())
  );
END;
$$;


ALTER FUNCTION "public"."has_patient_scope"("_patient_id" "uuid", "_scope" "text") OWNER TO "postgres";

--
-- Name: increment_review_helpful("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."increment_review_helpful"("p_review_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.verified_reviews
  SET    helpful_count = helpful_count + 1
  WHERE  id = p_review_id;
$$;


ALTER FUNCTION "public"."increment_review_helpful"("p_review_id" "uuid") OWNER TO "postgres";

--
-- Name: is_conversation_participant("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_conversation_participant"("_conversation_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_conversation_participant"("_conversation_id" "uuid") OWNER TO "postgres";

--
-- Name: is_doctor(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_doctor"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.current_role() = 'doctor';
$$;


ALTER FUNCTION "public"."is_doctor"() OWNER TO "postgres";

--
-- Name: is_participant_of("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_participant_of"("conv_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_participant_of"("conv_id" "uuid") OWNER TO "postgres";

--
-- Name: is_patient(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_patient"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.current_role() = 'patient';
$$;


ALTER FUNCTION "public"."is_patient"() OWNER TO "postgres";

--
-- Name: is_peer_in_conversation("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_peer_in_conversation"("_peer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = _peer_id
  );
$$;


ALTER FUNCTION "public"."is_peer_in_conversation"("_peer_id" "uuid") OWNER TO "postgres";

--
-- Name: mark_conversation_read("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";

--
-- Name: prevent_role_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."prevent_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow role change during onboarding (first-time selection)
    IF OLD.onboarding_completed = true THEN
      RAISE EXCEPTION 'Role cannot be changed after onboarding is complete';
    END IF;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."prevent_role_change"() OWNER TO "postgres";

--
-- Name: search_doctors_advanced("text", "text", "text", "text", boolean, "text", "text", "text", integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."search_doctors_advanced"("p_query" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_specialty" "text" DEFAULT NULL::"text", "p_insurance" "text" DEFAULT NULL::"text", "p_accepts_video" boolean DEFAULT NULL::boolean, "p_available_from" "text" DEFAULT NULL::"text", "p_available_to" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'rating'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("slug" "text", "display_name" "text", "avatar_url" "text", "specialty" "text", "clinic_name" "text", "bio" "text", "years_experience" integer, "consultation_price" numeric, "address_text" "text", "city" "text", "location" "jsonb", "is_verified" boolean, "avg_rating" numeric, "review_count" integer, "languages" "text"[], "accepts_video" boolean, "next_available_slot" "text", "total_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."search_doctors_advanced"("p_query" "text", "p_city" "text", "p_specialty" "text", "p_insurance" "text", "p_accepts_video" boolean, "p_available_from" "text", "p_available_to" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";

--
-- Name: search_public_doctors("text", "text", "text", integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."search_public_doctors"("p_query" "text" DEFAULT NULL::"text", "p_specialty" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'rating'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("slug" "text", "display_name" "text", "avatar_url" "text", "specialty" "text", "clinic_name" "text", "bio" "text", "years_experience" integer, "consultation_price" integer, "address_text" "text", "location" "jsonb", "is_verified" boolean, "avg_rating" numeric, "review_count" bigint, "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _safe_query text;
  _uq text;
BEGIN
  IF p_query IS NOT NULL AND p_query <> '' THEN
    _safe_query := replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_');
    _uq := unaccent(_safe_query);
  ELSE
    _safe_query := NULL;
    _uq := NULL;
  END IF;

  p_limit  := LEAST(COALESCE(p_limit, 20), 50);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);

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
      _uq IS NULL
      OR unaccent(p.full_name)    ILIKE '%' || _uq || '%'
      OR unaccent(replace(dp.specialty, '_', ' ')) ILIKE '%' || _uq || '%'
      OR unaccent(dp.clinic_name) ILIKE '%' || _uq || '%'
      OR unaccent(dp.address_text) ILIKE '%' || _uq || '%'
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
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_public_doctors"("p_query" "text", "p_specialty" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

--
-- Name: start_new_conversation("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."start_new_conversation"("other_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_conv_id uuid;
  existing_conv_id uuid;
BEGIN
  -- Check if conversation already exists
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid() AND cp2.user_id = other_user_id
  LIMIT 1;

  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (created_at, last_message_at)
  VALUES (now(), now())
  RETURNING conversations.id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
  VALUES
    (new_conv_id, auth.uid(), now()),
    (new_conv_id, other_user_id, now());

  RETURN new_conv_id;
END;
$$;


ALTER FUNCTION "public"."start_new_conversation"("other_user_id" "uuid") OWNER TO "postgres";

--
-- Name: submit_verified_review("uuid", integer, integer, integer, integer, "text", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."submit_verified_review"("p_appointment_id" "uuid", "p_rating" integer, "p_rating_punctuality" integer DEFAULT NULL::integer, "p_rating_attention" integer DEFAULT NULL::integer, "p_rating_facilities" integer DEFAULT NULL::integer, "p_comment" "text" DEFAULT NULL::"text", "p_is_anonymous" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."submit_verified_review"("p_appointment_id" "uuid", "p_rating" integer, "p_rating_punctuality" integer, "p_rating_attention" integer, "p_rating_facilities" integer, "p_comment" "text", "p_is_anonymous" boolean) OWNER TO "postgres";

--
-- Name: trg_doctor_slug(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trg_doctor_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."trg_doctor_slug"() OWNER TO "postgres";

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

--
-- Name: can_insert_object("text", "text", "uuid", "jsonb"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";

--
-- Name: delete_leaf_prefixes("text"[], "text"[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";

--
-- Name: extension("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: filename("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: foldername("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: get_common_prefix("text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") OWNER TO "supabase_storage_admin";

--
-- Name: get_level("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION "storage"."get_level"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: get_prefix("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION "storage"."get_prefix"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: get_prefixes("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION "storage"."get_prefixes"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";

--
-- Name: list_multipart_uploads_with_delimiter("text", "text", "text", integer, "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";

--
-- Name: list_objects_with_delimiter("text", "text", "text", integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text") OWNER TO "supabase_storage_admin";

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."protect_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."protect_delete"() OWNER TO "supabase_storage_admin";

--
-- Name: search("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";

--
-- Name: search_by_timestamp("text", "text", integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") OWNER TO "supabase_storage_admin";

--
-- Name: search_legacy_v1("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";

--
-- Name: search_v2("text", "text", integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "audit_log_entries"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."custom_oauth_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_type" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret" "text" NOT NULL,
    "acceptable_client_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "pkce_enabled" boolean DEFAULT true NOT NULL,
    "attribute_mapping" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "authorization_params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "email_optional" boolean DEFAULT false NOT NULL,
    "issuer" "text",
    "discovery_url" "text",
    "skip_nonce_check" boolean DEFAULT false NOT NULL,
    "cached_discovery" "jsonb",
    "discovery_cached_at" timestamp with time zone,
    "authorization_url" "text",
    "token_url" "text",
    "userinfo_url" "text",
    "jwks_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK ((("authorization_url" IS NULL) OR ("authorization_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK ((("authorization_url" IS NULL) OR ("char_length"("authorization_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_client_id_length" CHECK ((("char_length"("client_id") >= 1) AND ("char_length"("client_id") <= 512))),
    CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK ((("discovery_url" IS NULL) OR ("char_length"("discovery_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_identifier_format" CHECK (("identifier" ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::"text")),
    CONSTRAINT "custom_oauth_providers_issuer_length" CHECK ((("issuer" IS NULL) OR (("char_length"("issuer") >= 1) AND ("char_length"("issuer") <= 2048)))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK ((("jwks_uri" IS NULL) OR ("jwks_uri" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK ((("jwks_uri" IS NULL) OR ("char_length"("jwks_uri") <= 2048))),
    CONSTRAINT "custom_oauth_providers_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))),
    CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK ((("provider_type" <> 'oauth2'::"text") OR (("authorization_url" IS NOT NULL) AND ("token_url" IS NOT NULL) AND ("userinfo_url" IS NOT NULL)))),
    CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("discovery_url" IS NULL) OR ("discovery_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NULL) OR ("issuer" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NOT NULL))),
    CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['oauth2'::"text", 'oidc'::"text"]))),
    CONSTRAINT "custom_oauth_providers_token_url_https" CHECK ((("token_url" IS NULL) OR ("token_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_token_url_length" CHECK ((("token_url" IS NULL) OR ("char_length"("token_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK ((("userinfo_url" IS NULL) OR ("userinfo_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK ((("userinfo_url" IS NULL) OR ("char_length"("userinfo_url") <= 2048)))
);


ALTER TABLE "auth"."custom_oauth_providers" OWNER TO "supabase_auth_admin";

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "code_challenge" "text",
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone,
    "invite_token" "text",
    "referrer" "text",
    "oauth_client_state_id" "uuid",
    "linking_target_id" "uuid",
    "email_optional" boolean DEFAULT false NOT NULL
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "flow_state"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."flow_state" IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "identities"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN "identities"."email"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "instances"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "mfa_amr_claims"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "mfa_challenges"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "mfa_factors"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';


--
-- Name: COLUMN "mfa_factors"."last_webauthn_challenge_data"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" "text",
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."oauth_client_states" (
    "id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "code_verifier" "text",
    "created_at" timestamp with time zone NOT NULL
);


ALTER TABLE "auth"."oauth_client_states" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "oauth_client_states"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."oauth_client_states" IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    "token_endpoint_auth_method" "text" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048)),
    CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK (("token_endpoint_auth_method" = ANY (ARRAY['client_secret_basic'::"text", 'client_secret_post'::"text", 'none'::"text"])))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "refresh_tokens"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "saml_providers"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "saml_relay_states"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "schema_migrations"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint,
    "scopes" "text",
    CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096))
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "sessions"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN "sessions"."not_after"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN "sessions"."refresh_token_hmac_key"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN "sessions"."refresh_token_counter"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "sso_domains"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "sso_providers"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN "sso_providers"."resource_id"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "users"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN "users"."is_sso_user"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: appointment_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."appointment_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note_enc" "bytea",
    "note_nonce" "bytea",
    "note_kid" "text",
    "note_ver" smallint,
    "note_hash" "bytea"
);


ALTER TABLE "public"."appointment_notes" OWNER TO "postgres";

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "status" "public"."appointment_status" DEFAULT 'requested'::"public"."appointment_status" NOT NULL,
    "mode" "public"."visit_mode" DEFAULT 'in_person'::"public"."visit_mode" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "location_text" "text",
    "location" "jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason_enc" "bytea",
    "reason_nonce" "bytea",
    "reason_kid" "text",
    "reason_ver" smallint,
    "symptoms_enc" "bytea",
    "symptoms_nonce" "bytea",
    "symptoms_kid" "text",
    "symptoms_ver" smallint,
    CONSTRAINT "chk_end_after_start" CHECK (("end_at" > "start_at"))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";

--
-- Name: care_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."care_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."care_links" OWNER TO "postgres";

--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_in_chat" "text",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_message_at" timestamp with time zone,
    "last_message_text" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";

--
-- Name: doctor_insurances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."doctor_insurances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "insurance_provider" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."doctor_insurances" OWNER TO "postgres";

--
-- Name: doctor_patient_consent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."doctor_patient_consent" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'requested'::"text" NOT NULL,
    "share_basic_profile" boolean DEFAULT false NOT NULL,
    "share_contact" boolean DEFAULT false NOT NULL,
    "share_documents" boolean DEFAULT false NOT NULL,
    "share_appointments" boolean DEFAULT false NOT NULL,
    "share_medical_notes" boolean DEFAULT false NOT NULL,
    "request_reason" "text",
    "access_expires_at" timestamp with time zone,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "doctor_patient_consent_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'accepted'::"text", 'rejected'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."doctor_patient_consent" OWNER TO "postgres";

--
-- Name: doctor_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."doctor_profiles" (
    "doctor_id" "uuid" NOT NULL,
    "professional_license" "text",
    "specialty" "text",
    "clinic_name" "text",
    "bio" "text",
    "years_experience" integer,
    "consultation_price_mxn" integer,
    "address_text" "text",
    "location" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cedula_general" "text",
    "cedula_especialidad" "text",
    "is_sep_verified" boolean DEFAULT false NOT NULL,
    "verification_date" timestamp with time zone,
    "slug" "text" NOT NULL,
    "languages" "text"[] DEFAULT ARRAY['Español'::"text"],
    "education" "jsonb" DEFAULT '[]'::"jsonb",
    "illnesses_treated" "text"[] DEFAULT '{}'::"text"[],
    "city" "text",
    "state" "text",
    "zipcode" "text",
    "accepts_video" boolean DEFAULT false NOT NULL,
    "slot_duration_min" integer DEFAULT 30 NOT NULL,
    "accepted_insurances" "text"[],
    "consultation_mode" "text" DEFAULT 'in-person'::"text"
);


ALTER TABLE "public"."doctor_profiles" OWNER TO "postgres";

--
-- Name: doctor_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."doctor_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "open_time" time without time zone NOT NULL,
    "close_time" time without time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "doctor_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."doctor_schedules" OWNER TO "postgres";

--
-- Name: doctor_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."doctor_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" integer,
    "duration" integer DEFAULT 30,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."doctor_services" OWNER TO "postgres";

--
-- Name: document_folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."document_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_folders" OWNER TO "postgres";

--
-- Name: document_shares; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."document_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "shared_with" "uuid" NOT NULL,
    "shared_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_shares" OWNER TO "postgres";

--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "patient_id" "uuid",
    "uploaded_by" "uuid",
    "folder_id" "uuid",
    "title" "text" NOT NULL,
    "category" "public"."doc_category" DEFAULT 'other'::"public"."doc_category" NOT NULL,
    "mime_type" "text",
    "file_size" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_path_enc" "bytea",
    "file_path_nonce" "bytea",
    "file_path_kid" "text",
    "file_path_ver" smallint,
    "checksum_enc" "bytea",
    "checksum_nonce" "bytea",
    "checksum_kid" "text",
    "checksum_ver" smallint
);


ALTER TABLE "public"."documents" OWNER TO "postgres";

--
-- Name: encryption_backfill_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."encryption_backfill_queue" (
    "id" bigint NOT NULL,
    "target_table" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "field_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "locked_by" "uuid",
    "locked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "encryption_backfill_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'done'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."encryption_backfill_queue" OWNER TO "postgres";

--
-- Name: encryption_backfill_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."encryption_backfill_queue_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."encryption_backfill_queue_id_seq" OWNER TO "postgres";

--
-- Name: encryption_backfill_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."encryption_backfill_queue_id_seq" OWNED BY "public"."encryption_backfill_queue"."id";


--
-- Name: encryption_key_registry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."encryption_key_registry" (
    "key_id" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rotated_at" timestamp with time zone,
    "retired_at" timestamp with time zone,
    CONSTRAINT "encryption_key_registry_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'rotating'::"text", 'retired'::"text"])))
);


ALTER TABLE "public"."encryption_key_registry" OWNER TO "postgres";

--
-- Name: folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#33C7BE'::"text",
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."folders" OWNER TO "postgres";

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_body_length" CHECK (("char_length"("body") <= 5000)),
    CONSTRAINT "messages_body_not_empty" CHECK (("btrim"("body") <> ''::"text"))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text",
    "body" "text",
    "entity_table" "text",
    "entity_id" "uuid",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";

--
-- Name: patient_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."patient_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "doctor_id" "uuid",
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "body_enc" "bytea",
    "body_nonce" "bytea",
    "body_kid" "text",
    "body_ver" smallint,
    "body_hash" "bytea"
);


ALTER TABLE "public"."patient_notes" OWNER TO "postgres";

--
-- Name: patient_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."patient_profiles" (
    "patient_id" "uuid" NOT NULL,
    "address_text" "text",
    "blood_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "height_cm" integer,
    "weight_kg" integer,
    "insurance_provider" "text",
    "preferred_language" "text",
    "allergies_enc" "bytea",
    "allergies_nonce" "bytea",
    "allergies_kid" "text",
    "allergies_ver" smallint,
    "chronic_conditions_enc" "bytea",
    "chronic_conditions_nonce" "bytea",
    "chronic_conditions_kid" "text",
    "chronic_conditions_ver" smallint,
    "current_medications_enc" "bytea",
    "current_medications_nonce" "bytea",
    "current_medications_kid" "text",
    "current_medications_ver" smallint,
    "notes_for_doctor_enc" "bytea",
    "notes_for_doctor_nonce" "bytea",
    "notes_for_doctor_kid" "text",
    "notes_for_doctor_ver" smallint,
    "insurance_policy_number_enc" "bytea",
    "insurance_policy_number_nonce" "bytea",
    "insurance_policy_number_kid" "text",
    "insurance_policy_number_ver" smallint,
    "emergency_contact_name_enc" "bytea",
    "emergency_contact_name_nonce" "bytea",
    "emergency_contact_name_kid" "text",
    "emergency_contact_name_ver" smallint,
    "emergency_contact_phone_enc" "bytea",
    "emergency_contact_phone_nonce" "bytea",
    "emergency_contact_phone_kid" "text",
    "emergency_contact_phone_ver" smallint
);


ALTER TABLE "public"."patient_profiles" OWNER TO "postgres";

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'patient'::"public"."user_role" NOT NULL,
    "full_name" "text",
    "email" "text",
    "phone" "text",
    "sex" "public"."sex_type" DEFAULT 'unspecified'::"public"."sex_type" NOT NULL,
    "birthdate" "date",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "onboarding_step" "text",
    "last_seen_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";

--
-- Name: sensitive_access_audit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."sensitive_access_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_table" "text" NOT NULL,
    "target_id" "uuid",
    "reason" "text",
    "success" boolean DEFAULT true NOT NULL,
    "request_meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sensitive_access_audit" OWNER TO "postgres";

--
-- Name: specialties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."specialties" (
    "slug" "text" NOT NULL,
    "label" "text" NOT NULL,
    "grp" "text" DEFAULT 'Otros'::"text" NOT NULL,
    "sort_order" integer DEFAULT 999 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."specialties" OWNER TO "postgres";

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true NOT NULL,
    "appointment_reminders" boolean DEFAULT true NOT NULL,
    "whatsapp_notifications" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";

--
-- Name: TABLE "user_settings"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."user_settings" IS 'User notification and preference settings';


--
-- Name: COLUMN "user_settings"."email_notifications"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."user_settings"."email_notifications" IS 'Receive email notifications for general updates';


--
-- Name: COLUMN "user_settings"."appointment_reminders"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."user_settings"."appointment_reminders" IS 'Receive appointment reminder notifications';


--
-- Name: COLUMN "user_settings"."whatsapp_notifications"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."user_settings"."whatsapp_notifications" IS 'Receive WhatsApp notifications (placeholder for future feature)';


--
-- Name: user_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_status" (
    "user_id" "uuid" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_status" OWNER TO "postgres";

--
-- Name: verified_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."verified_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rating_punctuality" smallint,
    "rating_attention" smallint,
    "rating_facilities" smallint,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    "helpful_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "verified_reviews_rating_attention_check" CHECK ((("rating_attention" >= 1) AND ("rating_attention" <= 5))),
    CONSTRAINT "verified_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "verified_reviews_rating_facilities_check" CHECK ((("rating_facilities" >= 1) AND ("rating_facilities" <= 5))),
    CONSTRAINT "verified_reviews_rating_punctuality_check" CHECK ((("rating_punctuality" >= 1) AND ("rating_punctuality" <= 5)))
);


ALTER TABLE "public"."verified_reviews" OWNER TO "postgres";

--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";

--
-- Name: COLUMN "buckets"."owner"; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";

--
-- Name: COLUMN "objects"."owner"; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");


--
-- Name: encryption_backfill_queue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."encryption_backfill_queue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."encryption_backfill_queue_id_seq"'::"regclass");


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_identifier_key" UNIQUE ("identifier");


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY ("id");


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_client_states"
    ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: appointment_notes appointment_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appointment_notes"
    ADD CONSTRAINT "appointment_notes_pkey" PRIMARY KEY ("id");


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");


--
-- Name: care_links care_links_doctor_id_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."care_links"
    ADD CONSTRAINT "care_links_doctor_id_patient_id_key" UNIQUE ("doctor_id", "patient_id");


--
-- Name: care_links care_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."care_links"
    ADD CONSTRAINT "care_links_pkey" PRIMARY KEY ("id");


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id");


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");


--
-- Name: doctor_insurances doctor_insurances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_insurances"
    ADD CONSTRAINT "doctor_insurances_pkey" PRIMARY KEY ("id");


--
-- Name: doctor_insurances doctor_insurances_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_insurances"
    ADD CONSTRAINT "doctor_insurances_unique" UNIQUE ("doctor_id", "insurance_provider");


--
-- Name: doctor_patient_consent doctor_patient_consent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_patient_consent"
    ADD CONSTRAINT "doctor_patient_consent_pkey" PRIMARY KEY ("id");


--
-- Name: doctor_profiles doctor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_profiles"
    ADD CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("doctor_id");


--
-- Name: doctor_schedules doctor_schedules_doctor_day_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_schedules"
    ADD CONSTRAINT "doctor_schedules_doctor_day_key" UNIQUE ("doctor_id", "day_of_week");


--
-- Name: doctor_schedules doctor_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_schedules"
    ADD CONSTRAINT "doctor_schedules_pkey" PRIMARY KEY ("id");


--
-- Name: doctor_services doctor_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_services"
    ADD CONSTRAINT "doctor_services_pkey" PRIMARY KEY ("id");


--
-- Name: document_folders document_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."document_folders"
    ADD CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id");


--
-- Name: document_shares document_shares_document_id_shared_with_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."document_shares"
    ADD CONSTRAINT "document_shares_document_id_shared_with_key" UNIQUE ("document_id", "shared_with");


--
-- Name: document_shares document_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."document_shares"
    ADD CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id");


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");


--
-- Name: encryption_backfill_queue encryption_backfill_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."encryption_backfill_queue"
    ADD CONSTRAINT "encryption_backfill_queue_pkey" PRIMARY KEY ("id");


--
-- Name: encryption_backfill_queue encryption_backfill_queue_target_table_target_id_field_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."encryption_backfill_queue"
    ADD CONSTRAINT "encryption_backfill_queue_target_table_target_id_field_name_key" UNIQUE ("target_table", "target_id", "field_name");


--
-- Name: encryption_key_registry encryption_key_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."encryption_key_registry"
    ADD CONSTRAINT "encryption_key_registry_pkey" PRIMARY KEY ("key_id");


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


--
-- Name: patient_notes patient_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."patient_notes"
    ADD CONSTRAINT "patient_notes_pkey" PRIMARY KEY ("id");


--
-- Name: patient_profiles patient_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("patient_id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: sensitive_access_audit sensitive_access_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."sensitive_access_audit"
    ADD CONSTRAINT "sensitive_access_audit_pkey" PRIMARY KEY ("id");


--
-- Name: specialties specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."specialties"
    ADD CONSTRAINT "specialties_pkey" PRIMARY KEY ("slug");


--
-- Name: doctor_patient_consent uq_doctor_patient_consent; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_patient_consent"
    ADD CONSTRAINT "uq_doctor_patient_consent" UNIQUE ("doctor_id", "patient_id");


--
-- Name: verified_reviews uq_verified_reviews_appointment; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verified_reviews"
    ADD CONSTRAINT "uq_verified_reviews_appointment" UNIQUE ("appointment_id");


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");


--
-- Name: user_status user_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_status"
    ADD CONSTRAINT "user_status_pkey" PRIMARY KEY ("user_id");


--
-- Name: verified_reviews verified_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verified_reviews"
    ADD CONSTRAINT "verified_reviews_pkey" PRIMARY KEY ("id");


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "custom_oauth_providers_created_at_idx" ON "auth"."custom_oauth_providers" USING "btree" ("created_at");


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "custom_oauth_providers_enabled_idx" ON "auth"."custom_oauth_providers" USING "btree" ("enabled");


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "custom_oauth_providers_identifier_idx" ON "auth"."custom_oauth_providers" USING "btree" ("identifier");


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "custom_oauth_providers_provider_type_idx" ON "auth"."custom_oauth_providers" USING "btree" ("provider_type");


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");


--
-- Name: INDEX "identities_email_idx"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states" USING "btree" ("created_at");


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);


--
-- Name: INDEX "users_email_partial_key"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");


--
-- Name: appointment_notes_appt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "appointment_notes_appt_idx" ON "public"."appointment_notes" USING "btree" ("appointment_id");


--
-- Name: appointments_doctor_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "appointments_doctor_time_idx" ON "public"."appointments" USING "btree" ("doctor_id", "start_at");


--
-- Name: appointments_patient_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "appointments_patient_time_idx" ON "public"."appointments" USING "btree" ("patient_id", "start_at");


--
-- Name: care_links_doctor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "care_links_doctor_idx" ON "public"."care_links" USING "btree" ("doctor_id");


--
-- Name: care_links_patient_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "care_links_patient_idx" ON "public"."care_links" USING "btree" ("patient_id");


--
-- Name: conv_participants_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "conv_participants_user_idx" ON "public"."conversation_participants" USING "btree" ("user_id");


--
-- Name: doc_folders_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "doc_folders_owner_idx" ON "public"."document_folders" USING "btree" ("owner_id");


--
-- Name: doc_shares_with_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "doc_shares_with_idx" ON "public"."document_shares" USING "btree" ("shared_with");


--
-- Name: documents_folder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "documents_folder_idx" ON "public"."documents" USING "btree" ("folder_id");


--
-- Name: documents_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "documents_owner_idx" ON "public"."documents" USING "btree" ("owner_id");


--
-- Name: documents_patient_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "documents_patient_idx" ON "public"."documents" USING "btree" ("patient_id");


--
-- Name: idx_appointments_doctor_start_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_appointments_doctor_start_status" ON "public"."appointments" USING "btree" ("doctor_id", "start_at", "status");


--
-- Name: idx_conv_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_conv_participants_user_id" ON "public"."conversation_participants" USING "btree" ("user_id");


--
-- Name: idx_conversations_last_message_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at" DESC);


--
-- Name: idx_doctor_insurances_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_insurances_doctor_id" ON "public"."doctor_insurances" USING "btree" ("doctor_id");


--
-- Name: idx_doctor_insurances_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_insurances_provider" ON "public"."doctor_insurances" USING "btree" ("insurance_provider");


--
-- Name: idx_doctor_profiles_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_profiles_city" ON "public"."doctor_profiles" USING "btree" ("city");


--
-- Name: idx_doctor_profiles_illnesses; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_profiles_illnesses" ON "public"."doctor_profiles" USING "gin" ("illnesses_treated");


--
-- Name: idx_doctor_profiles_is_sep_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_profiles_is_sep_verified" ON "public"."doctor_profiles" USING "btree" ("is_sep_verified") WHERE ("is_sep_verified" = true);


--
-- Name: idx_doctor_profiles_languages; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_profiles_languages" ON "public"."doctor_profiles" USING "gin" ("languages");


--
-- Name: idx_doctor_profiles_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "idx_doctor_profiles_slug" ON "public"."doctor_profiles" USING "btree" ("slug");


--
-- Name: idx_doctor_profiles_specialty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_profiles_specialty" ON "public"."doctor_profiles" USING "btree" ("specialty");


--
-- Name: idx_doctor_schedules_doctor_day; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_schedules_doctor_day" ON "public"."doctor_schedules" USING "btree" ("doctor_id", "day_of_week") WHERE ("is_active" = true);


--
-- Name: idx_doctor_schedules_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_schedules_doctor_id" ON "public"."doctor_schedules" USING "btree" ("doctor_id");


--
-- Name: idx_doctor_services_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_doctor_services_doctor_id" ON "public"."doctor_services" USING "btree" ("doctor_id");


--
-- Name: idx_dpc_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_dpc_doctor_id" ON "public"."doctor_patient_consent" USING "btree" ("doctor_id");


--
-- Name: idx_dpc_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_dpc_patient_id" ON "public"."doctor_patient_consent" USING "btree" ("patient_id");


--
-- Name: idx_dpc_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_dpc_status" ON "public"."doctor_patient_consent" USING "btree" ("status");


--
-- Name: idx_encryption_backfill_queue_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_encryption_backfill_queue_status" ON "public"."encryption_backfill_queue" USING "btree" ("status", "updated_at" DESC);


--
-- Name: idx_encryption_backfill_queue_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_encryption_backfill_queue_target" ON "public"."encryption_backfill_queue" USING "btree" ("target_table", "target_id");


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");


--
-- Name: idx_messages_created_at_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_messages_created_at_desc" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);


--
-- Name: idx_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_participants_user_id" ON "public"."conversation_participants" USING "btree" ("user_id");


--
-- Name: idx_patient_notes_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_patient_notes_doctor_id" ON "public"."patient_notes" USING "btree" ("doctor_id");


--
-- Name: idx_patient_notes_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_patient_notes_patient_id" ON "public"."patient_notes" USING "btree" ("patient_id");


--
-- Name: idx_profiles_fullname_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_profiles_fullname_trgm" ON "public"."profiles" USING "gin" ("full_name" "public"."gin_trgm_ops");


--
-- Name: idx_profiles_role_onboarding; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_profiles_role_onboarding" ON "public"."profiles" USING "btree" ("role", "onboarding_completed");


--
-- Name: idx_unique_doctor_slot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "idx_unique_doctor_slot" ON "public"."appointments" USING "btree" ("doctor_id", "start_at") WHERE ("status" = ANY (ARRAY['requested'::"public"."appointment_status", 'confirmed'::"public"."appointment_status"]));


--
-- Name: idx_verified_reviews_doctor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_verified_reviews_doctor" ON "public"."verified_reviews" USING "btree" ("doctor_id");


--
-- Name: idx_verified_reviews_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_verified_reviews_patient" ON "public"."verified_reviews" USING "btree" ("patient_id");


--
-- Name: messages_conv_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "messages_conv_time_idx" ON "public"."messages" USING "btree" ("conversation_id", "created_at");


--
-- Name: notifications_user_read_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notifications_user_read_idx" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);


--
-- Name: profiles_onboarding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_onboarding_idx" ON "public"."profiles" USING "btree" ("onboarding_completed");


--
-- Name: profiles_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX "idx_objects_bucket_id_name_lower" ON "storage"."objects" USING "btree" ("bucket_id", "lower"("name") COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();


--
-- Name: messages on_message_inserted; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "on_message_inserted" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_message"();


--
-- Name: messages on_new_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "on_new_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_message"();


--
-- Name: user_status set_user_status_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "set_user_status_updated_at" BEFORE UPDATE ON "public"."user_status" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: doctor_patient_consent tr_dpc_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "tr_dpc_updated_at" BEFORE UPDATE ON "public"."doctor_patient_consent" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: profiles tr_prevent_role_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "tr_prevent_role_change" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_change"();


--
-- Name: appointments trg_appointments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: doctor_profiles trg_doctor_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_doctor_profiles_updated_at" BEFORE UPDATE ON "public"."doctor_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: doctor_profiles trg_doctor_slug_before; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_doctor_slug_before" BEFORE INSERT OR UPDATE ON "public"."doctor_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trg_doctor_slug"();


--
-- Name: documents trg_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: patient_profiles trg_patient_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_patient_profiles_updated_at" BEFORE UPDATE ON "public"."patient_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: user_settings user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER "protect_buckets_delete" BEFORE DELETE ON "storage"."buckets" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER "protect_objects_delete" BEFORE DELETE ON "storage"."objects" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: appointment_notes appointment_notes_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appointment_notes"
    ADD CONSTRAINT "appointment_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;


--
-- Name: appointment_notes appointment_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appointment_notes"
    ADD CONSTRAINT "appointment_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: appointment_notes appointment_notes_note_kid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appointment_notes"
    ADD CONSTRAINT "appointment_notes_note_kid_fkey" FOREIGN KEY ("note_kid") REFERENCES "public"."encryption_key_registry"("key_id");


--
-- Name: appointments appointments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: care_links care_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."care_links"
    ADD CONSTRAINT "care_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");


--
-- Name: care_links care_links_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."care_links"
    ADD CONSTRAINT "care_links_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: care_links care_links_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."care_links"
    ADD CONSTRAINT "care_links_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: doctor_insurances doctor_insurances_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_insurances"
    ADD CONSTRAINT "doctor_insurances_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("doctor_id") ON DELETE CASCADE;


--
-- Name: doctor_patient_consent doctor_patient_consent_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_patient_consent"
    ADD CONSTRAINT "doctor_patient_consent_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: doctor_patient_consent doctor_patient_consent_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_patient_consent"
    ADD CONSTRAINT "doctor_patient_consent_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: doctor_profiles doctor_profiles_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_profiles"
    ADD CONSTRAINT "doctor_profiles_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: doctor_schedules doctor_schedules_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_schedules"
    ADD CONSTRAINT "doctor_schedules_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("doctor_id") ON DELETE CASCADE;


--
-- Name: doctor_services doctor_services_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."doctor_services"
    ADD CONSTRAINT "doctor_services_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("doctor_id") ON DELETE CASCADE;


--
-- Name: document_folders document_folders_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."document_folders"
    ADD CONSTRAINT "document_folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: document_shares document_shares_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."document_shares"
    ADD CONSTRAINT "document_shares_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;


--
-- Name: document_shares document_shares_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."document_shares"
    ADD CONSTRAINT "document_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: document_shares document_shares_shared_with_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."document_shares"
    ADD CONSTRAINT "document_shares_shared_with_fkey" FOREIGN KEY ("shared_with") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: documents documents_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE SET NULL;


--
-- Name: documents documents_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: documents documents_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: folders folders_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: folders folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: patient_notes patient_notes_body_kid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."patient_notes"
    ADD CONSTRAINT "patient_notes_body_kid_fkey" FOREIGN KEY ("body_kid") REFERENCES "public"."encryption_key_registry"("key_id");


--
-- Name: patient_notes patient_notes_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."patient_notes"
    ADD CONSTRAINT "patient_notes_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: patient_notes patient_notes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."patient_notes"
    ADD CONSTRAINT "patient_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: patient_profiles patient_profiles_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: user_status user_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_status"
    ADD CONSTRAINT "user_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: verified_reviews verified_reviews_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verified_reviews"
    ADD CONSTRAINT "verified_reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;


--
-- Name: verified_reviews verified_reviews_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verified_reviews"
    ADD CONSTRAINT "verified_reviews_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("doctor_id") ON DELETE CASCADE;


--
-- Name: verified_reviews verified_reviews_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verified_reviews"
    ADD CONSTRAINT "verified_reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("patient_id") ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_profiles Doctor profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Doctor profiles are viewable by everyone" ON "public"."doctor_profiles" FOR SELECT TO "authenticated" USING (true);


--
-- Name: patient_notes Doctors can delete their own clinical notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Doctors can delete their own clinical notes" ON "public"."patient_notes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "doctor_id"));


--
-- Name: appointments Doctors can insert appointments for their patients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Doctors can insert appointments for their patients" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "doctor_id") AND ("patient_id" IS NOT NULL)));


--
-- Name: patient_notes Doctors can insert their own clinical notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Doctors can insert their own clinical notes" ON "public"."patient_notes" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "doctor_id") AND "public"."has_patient_scope"("patient_id", 'share_medical_notes'::"text")));


--
-- Name: patient_notes Doctors can update their own clinical notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Doctors can update their own clinical notes" ON "public"."patient_notes" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "doctor_id"));


--
-- Name: patient_notes Doctors can view their own clinical notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Doctors can view their own clinical notes" ON "public"."patient_notes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "doctor_id"));


--
-- Name: appointments Participants can update their own appointments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Participants can update their own appointments" ON "public"."appointments" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "patient_id") OR ("auth"."uid"() = "doctor_id"))) WITH CHECK ((("auth"."uid"() = "patient_id") OR ("auth"."uid"() = "doctor_id")));


--
-- Name: appointments Participants can view their own appointments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Participants can view their own appointments" ON "public"."appointments" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "patient_id") OR ("auth"."uid"() = "doctor_id")));


--
-- Name: appointments Patients can insert their own appointments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Patients can insert their own appointments" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "patient_id"));


--
-- Name: patient_profiles Patients can insert their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Patients can insert their own profile" ON "public"."patient_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "patient_id"));


--
-- Name: patient_profiles Patients can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Patients can update their own profile" ON "public"."patient_profiles" FOR UPDATE USING (("auth"."uid"() = "patient_id"));


--
-- Name: patient_profiles Patients can view their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Patients can view their own profile" ON "public"."patient_profiles" FOR SELECT USING (("auth"."uid"() = "patient_id"));


--
-- Name: doctor_schedules Public profiles are viewable by everyone.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public profiles are viewable by everyone." ON "public"."doctor_schedules" FOR SELECT USING (true);


--
-- Name: folders Users can create their own folders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their own folders" ON "public"."folders" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));


--
-- Name: documents Users can delete their own documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own documents" ON "public"."documents" FOR DELETE USING (("auth"."uid"() = "owner_id"));


--
-- Name: folders Users can delete their own folders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own folders" ON "public"."folders" FOR DELETE USING (("auth"."uid"() = "owner_id"));


--
-- Name: user_settings Users can insert own settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: user_status Users can manage their own status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own status" ON "public"."user_status" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: profiles Users can read counterpart profiles via appointments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read counterpart profiles via appointments" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."appointments"
  WHERE ((("appointments"."doctor_id" = "auth"."uid"()) AND ("appointments"."patient_id" = "profiles"."id")) OR (("appointments"."patient_id" = "auth"."uid"()) AND ("appointments"."doctor_id" = "profiles"."id")))))));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));


--
-- Name: user_settings Users can update own settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: folders Users can update their own folders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own folders" ON "public"."folders" FOR UPDATE USING (("auth"."uid"() = "owner_id"));


--
-- Name: documents Users can upload their own documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can upload their own documents" ON "public"."documents" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));


--
-- Name: user_settings Users can view own settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: user_status Users can view status of chat participants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view status of chat participants" ON "public"."user_status" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."conversation_participants" "buddy"
     JOIN "public"."conversation_participants" "me" ON (("buddy"."conversation_id" = "me"."conversation_id")))
  WHERE (("me"."user_id" = "auth"."uid"()) AND ("buddy"."user_id" = "user_status"."user_id")))));


--
-- Name: documents Users can view their own documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own documents" ON "public"."documents" FOR SELECT USING (("auth"."uid"() = "owner_id"));


--
-- Name: folders Users can view their own folders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own folders" ON "public"."folders" FOR SELECT USING (("auth"."uid"() = "owner_id"));


--
-- Name: appointment_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."appointment_notes" ENABLE ROW LEVEL SECURITY;

--
-- Name: appointment_notes appointment_notes_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "appointment_notes_insert" ON "public"."appointment_notes" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE (("a"."id" = "appointment_notes"."appointment_id") AND (("a"."doctor_id" = "auth"."uid"()) OR ("a"."patient_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")))))));


--
-- Name: appointment_notes appointment_notes_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "appointment_notes_select" ON "public"."appointment_notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE (("a"."id" = "appointment_notes"."appointment_id") AND (("a"."doctor_id" = "auth"."uid"()) OR ("a"."patient_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role"))))));


--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments appointments_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "appointments_insert" ON "public"."appointments" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND (("patient_id" = "auth"."uid"()) OR ("doctor_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")) AND "public"."can_access_patient"("patient_id")));


--
-- Name: appointments appointments_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "appointments_select" ON "public"."appointments" FOR SELECT USING ((("doctor_id" = "auth"."uid"()) OR ("patient_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: appointments appointments_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "appointments_update" ON "public"."appointments" FOR UPDATE USING ((("doctor_id" = "auth"."uid"()) OR ("patient_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role"))) WITH CHECK ((("doctor_id" = "auth"."uid"()) OR ("patient_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: care_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."care_links" ENABLE ROW LEVEL SECURITY;

--
-- Name: care_links care_links_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "care_links_delete" ON "public"."care_links" FOR DELETE TO "authenticated" USING (("patient_id" = "auth"."uid"()));


--
-- Name: care_links care_links_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "care_links_insert" ON "public"."care_links" FOR INSERT TO "authenticated" WITH CHECK (("patient_id" = "auth"."uid"()));


--
-- Name: care_links care_links_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "care_links_select" ON "public"."care_links" FOR SELECT TO "authenticated" USING ((("patient_id" = "auth"."uid"()) OR ("doctor_id" = "auth"."uid"())));


--
-- Name: care_links care_links_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "care_links_update" ON "public"."care_links" FOR UPDATE TO "authenticated" USING (("patient_id" = "auth"."uid"())) WITH CHECK (("patient_id" = "auth"."uid"()));


--
-- Name: conversations conv_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conv_insert" ON "public"."conversations" FOR INSERT WITH CHECK (true);


--
-- Name: conversations conv_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conv_select" ON "public"."conversations" FOR SELECT USING ("public"."is_participant_of"("id"));


--
-- Name: conversations conv_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "conv_update" ON "public"."conversations" FOR UPDATE USING ("public"."is_participant_of"("id"));


--
-- Name: conversation_participants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_participants cp_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "cp_insert" ON "public"."conversation_participants" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("public"."current_role"() = 'admin'::"public"."user_role") OR (("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversation_participants"."conversation_id") AND ("cp"."user_id" = "auth"."uid"()))))))));


--
-- Name: conversation_participants cp_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "cp_select_own" ON "public"."conversation_participants" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: conversation_participants cp_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "cp_update_own" ON "public"."conversation_participants" FOR UPDATE USING (("user_id" = "auth"."uid"()));


--
-- Name: document_shares doc_shares_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doc_shares_insert" ON "public"."document_shares" FOR INSERT WITH CHECK ((("shared_by" = "auth"."uid"()) AND (("public"."current_role"() = 'admin'::"public"."user_role") OR (EXISTS ( SELECT 1
   FROM "public"."documents" "d"
  WHERE (("d"."id" = "document_shares"."document_id") AND ("d"."owner_id" = "auth"."uid"())))))));


--
-- Name: document_shares doc_shares_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doc_shares_select" ON "public"."document_shares" FOR SELECT USING ((("shared_with" = "auth"."uid"()) OR ("shared_by" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: document_shares docshares_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "docshares_delete" ON "public"."document_shares" FOR DELETE TO "authenticated" USING (("shared_by" = "auth"."uid"()));


--
-- Name: document_shares docshares_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "docshares_insert" ON "public"."document_shares" FOR INSERT TO "authenticated" WITH CHECK (("shared_by" = "auth"."uid"()));


--
-- Name: document_shares docshares_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "docshares_select" ON "public"."document_shares" FOR SELECT TO "authenticated" USING ((("shared_by" = "auth"."uid"()) OR ("shared_with" = "auth"."uid"())));


--
-- Name: doctor_insurances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."doctor_insurances" ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_insurances doctor_insurances_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_insurances_delete" ON "public"."doctor_insurances" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "doctor_id"));


--
-- Name: doctor_insurances doctor_insurances_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_insurances_insert" ON "public"."doctor_insurances" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "doctor_id"));


--
-- Name: doctor_insurances doctor_insurances_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_insurances_select" ON "public"."doctor_insurances" FOR SELECT TO "authenticated" USING (true);


--
-- Name: doctor_patient_consent; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."doctor_patient_consent" ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."doctor_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_profiles doctor_profiles_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_profiles_insert_own" ON "public"."doctor_profiles" FOR INSERT TO "authenticated" WITH CHECK (("doctor_id" = "auth"."uid"()));


--
-- Name: doctor_profiles doctor_profiles_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_profiles_public_read" ON "public"."doctor_profiles" FOR SELECT USING (true);


--
-- Name: doctor_profiles doctor_profiles_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_profiles_read" ON "public"."doctor_profiles" FOR SELECT USING ((("doctor_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: doctor_profiles doctor_profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_profiles_update_own" ON "public"."doctor_profiles" FOR UPDATE TO "authenticated" USING (("doctor_id" = "auth"."uid"())) WITH CHECK (("doctor_id" = "auth"."uid"()));


--
-- Name: doctor_profiles doctor_profiles_upsert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_profiles_upsert" ON "public"."doctor_profiles" USING ((("doctor_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role"))) WITH CHECK ((("doctor_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: doctor_schedules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."doctor_schedules" ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_services; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."doctor_services" ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_services doctor_services_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_services_delete" ON "public"."doctor_services" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "doctor_id"));


--
-- Name: doctor_services doctor_services_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_services_insert" ON "public"."doctor_services" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "doctor_id"));


--
-- Name: doctor_services doctor_services_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_services_select" ON "public"."doctor_services" FOR SELECT TO "authenticated" USING (true);


--
-- Name: doctor_services doctor_services_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "doctor_services_update" ON "public"."doctor_services" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "doctor_id")) WITH CHECK (("auth"."uid"() = "doctor_id"));


--
-- Name: document_folders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."document_folders" ENABLE ROW LEVEL SECURITY;

--
-- Name: document_shares; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."document_shares" ENABLE ROW LEVEL SECURITY;

--
-- Name: document_shares document_shares_select_participants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "document_shares_select_participants" ON "public"."document_shares" FOR SELECT USING ((("shared_with" = "auth"."uid"()) OR ("shared_by" = "auth"."uid"())));


--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;

--
-- Name: documents documents_delete_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_delete_owner" ON "public"."documents" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));


--
-- Name: documents documents_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_insert" ON "public"."documents" FOR INSERT WITH CHECK ((("owner_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: documents documents_insert_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_insert_owner" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((("owner_id" = "auth"."uid"()) OR ("uploaded_by" = "auth"."uid"())));


--
-- Name: documents documents_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_select" ON "public"."documents" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role") OR (("patient_id" IS NOT NULL) AND "public"."can_access_patient"("patient_id")) OR (EXISTS ( SELECT 1
   FROM "public"."document_shares" "ds"
  WHERE (("ds"."document_id" = "documents"."id") AND ("ds"."shared_with" = "auth"."uid"()))))));


--
-- Name: documents documents_select_doctor_patient; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_select_doctor_patient" ON "public"."documents" FOR SELECT TO "authenticated" USING (("public"."is_doctor"() AND "public"."has_patient_scope"("patient_id", 'share_documents'::"text")));


--
-- Name: documents documents_select_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_select_owner" ON "public"."documents" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR ("uploaded_by" = "auth"."uid"()) OR ("patient_id" = "auth"."uid"())));


--
-- Name: documents documents_select_shared_with; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_select_shared_with" ON "public"."documents" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR ("id" IN ( SELECT "document_shares"."document_id"
   FROM "public"."document_shares"
  WHERE ("document_shares"."shared_with" = "auth"."uid"())))));


--
-- Name: documents documents_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_update" ON "public"."documents" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role"))) WITH CHECK ((("owner_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: documents documents_update_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "documents_update_owner" ON "public"."documents" FOR UPDATE TO "authenticated" USING (("owner_id" = "auth"."uid"()));


--
-- Name: doctor_patient_consent dpc_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "dpc_delete" ON "public"."doctor_patient_consent" FOR DELETE TO "authenticated" USING (("patient_id" = "auth"."uid"()));


--
-- Name: doctor_patient_consent dpc_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "dpc_insert" ON "public"."doctor_patient_consent" FOR INSERT TO "authenticated" WITH CHECK ((("doctor_id" = "auth"."uid"()) AND ("status" = 'requested'::"text")));


--
-- Name: doctor_patient_consent dpc_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "dpc_select" ON "public"."doctor_patient_consent" FOR SELECT TO "authenticated" USING ((("doctor_id" = "auth"."uid"()) OR ("patient_id" = "auth"."uid"())));


--
-- Name: doctor_patient_consent dpc_update_doctor; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "dpc_update_doctor" ON "public"."doctor_patient_consent" FOR UPDATE TO "authenticated" USING (("doctor_id" = "auth"."uid"())) WITH CHECK ((("doctor_id" = "auth"."uid"()) AND ("status" = 'revoked'::"text")));


--
-- Name: doctor_patient_consent dpc_update_patient; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "dpc_update_patient" ON "public"."doctor_patient_consent" FOR UPDATE TO "authenticated" USING (("patient_id" = "auth"."uid"())) WITH CHECK (("patient_id" = "auth"."uid"()));


--
-- Name: encryption_backfill_queue; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."encryption_backfill_queue" ENABLE ROW LEVEL SECURITY;

--
-- Name: encryption_backfill_queue encryption_backfill_queue_admin_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "encryption_backfill_queue_admin_read" ON "public"."encryption_backfill_queue" FOR SELECT USING (("public"."current_role"() = 'admin'::"public"."user_role"));


--
-- Name: encryption_backfill_queue encryption_backfill_queue_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "encryption_backfill_queue_admin_write" ON "public"."encryption_backfill_queue" USING (("public"."current_role"() = 'admin'::"public"."user_role")) WITH CHECK (("public"."current_role"() = 'admin'::"public"."user_role"));


--
-- Name: encryption_key_registry; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."encryption_key_registry" ENABLE ROW LEVEL SECURITY;

--
-- Name: encryption_key_registry encryption_key_registry_admin_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "encryption_key_registry_admin_read" ON "public"."encryption_key_registry" FOR SELECT USING (("public"."current_role"() = 'admin'::"public"."user_role"));


--
-- Name: encryption_key_registry encryption_key_registry_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "encryption_key_registry_admin_write" ON "public"."encryption_key_registry" USING (("public"."current_role"() = 'admin'::"public"."user_role")) WITH CHECK (("public"."current_role"() = 'admin'::"public"."user_role"));


--
-- Name: folders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;

--
-- Name: document_folders folders_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "folders_select_own" ON "public"."document_folders" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: document_folders folders_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "folders_write_own" ON "public"."document_folders" USING ((("owner_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role"))) WITH CHECK ((("owner_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: messages msg_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "msg_insert" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND "public"."is_participant_of"("conversation_id")));


--
-- Name: messages msg_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "msg_select" ON "public"."messages" FOR SELECT USING ("public"."is_participant_of"("conversation_id"));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: notifications notifications_insert_system; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "notifications_insert_system" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: patient_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."patient_notes" ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."patient_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_profiles patient_profiles_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "patient_profiles_insert" ON "public"."patient_profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "patient_id"));


--
-- Name: patient_profiles patient_profiles_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "patient_profiles_read" ON "public"."patient_profiles" FOR SELECT USING ((("patient_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: patient_profiles patient_profiles_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "patient_profiles_select" ON "public"."patient_profiles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "patient_id") OR "public"."has_patient_scope"("patient_id", 'share_basic_profile'::"text")));


--
-- Name: patient_profiles patient_profiles_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "patient_profiles_update" ON "public"."patient_profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "patient_id"));


--
-- Name: patient_profiles patient_profiles_upsert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "patient_profiles_upsert" ON "public"."patient_profiles" USING ((("patient_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role"))) WITH CHECK ((("patient_id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: patient_notes patients_read_own_notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "patients_read_own_notes" ON "public"."patient_notes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "patient_id"));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_read_own" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR ("public"."current_role"() = 'admin'::"public"."user_role")));


--
-- Name: profiles profiles_select_consented_patient; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_select_consented_patient" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."doctor_patient_consent" "dpc"
  WHERE (("dpc"."doctor_id" = "auth"."uid"()) AND ("dpc"."patient_id" = "profiles"."id") AND ("dpc"."status" = 'accepted'::"text") AND (("dpc"."access_expires_at" IS NULL) OR ("dpc"."access_expires_at" > "now"()))))));


--
-- Name: profiles profiles_select_conversation_peer; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_select_conversation_peer" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_peer_in_conversation"("id"));


--
-- Name: profiles profiles_select_doctors; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_select_doctors" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("role" = 'doctor'::"public"."user_role"));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));


--
-- Name: profiles profiles_update_own_safe; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_update_own_safe" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));


--
-- Name: verified_reviews reviews_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reviews_insert" ON "public"."verified_reviews" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "patient_id") AND (EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE (("a"."id" = "verified_reviews"."appointment_id") AND ("a"."patient_id" = "auth"."uid"()) AND ("a"."status" = 'completed'::"public"."appointment_status"))))));


--
-- Name: verified_reviews reviews_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reviews_insert_own" ON "public"."verified_reviews" FOR INSERT WITH CHECK (("patient_id" = "auth"."uid"()));


--
-- Name: verified_reviews reviews_read_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reviews_read_all" ON "public"."verified_reviews" FOR SELECT USING (true);


--
-- Name: verified_reviews reviews_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reviews_select" ON "public"."verified_reviews" FOR SELECT TO "authenticated" USING (true);


--
-- Name: doctor_schedules schedules_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "schedules_delete" ON "public"."doctor_schedules" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "doctor_id"));


--
-- Name: doctor_schedules schedules_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "schedules_insert" ON "public"."doctor_schedules" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "doctor_id"));


--
-- Name: doctor_schedules schedules_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "schedules_update" ON "public"."doctor_schedules" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "doctor_id")) WITH CHECK (("auth"."uid"() = "doctor_id"));


--
-- Name: sensitive_access_audit; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."sensitive_access_audit" ENABLE ROW LEVEL SECURITY;

--
-- Name: sensitive_access_audit sensitive_access_audit_admin_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "sensitive_access_audit_admin_read" ON "public"."sensitive_access_audit" FOR SELECT USING (("public"."current_role"() = 'admin'::"public"."user_role"));


--
-- Name: sensitive_access_audit sensitive_access_audit_insert_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "sensitive_access_audit_insert_self" ON "public"."sensitive_access_audit" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("actor_id" = "auth"."uid"())));


--
-- Name: specialties; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."specialties" ENABLE ROW LEVEL SECURITY;

--
-- Name: specialties specialties_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "specialties_public_read" ON "public"."specialties" FOR SELECT USING (true);


--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_status; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_status" ENABLE ROW LEVEL SECURITY;

--
-- Name: verified_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."verified_reviews" ENABLE ROW LEVEL SECURITY;

--
-- Name: verified_reviews verified_reviews_insert_patient; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "verified_reviews_insert_patient" ON "public"."verified_reviews" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("patient_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE (("a"."id" = "verified_reviews"."appointment_id") AND ("a"."patient_id" = "auth"."uid"()) AND ("a"."status" = 'completed'::"public"."appointment_status"))))));


--
-- Name: verified_reviews verified_reviews_select_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "verified_reviews_select_public" ON "public"."verified_reviews" FOR SELECT USING (true);


--
-- Name: objects Avatar images are publicly accessible; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Avatar images are publicly accessible" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatars'::"text"));


--
-- Name: objects Users can delete their own avatar; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Users can delete their own avatar" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'avatars'::"text") AND ("auth"."role"() = 'authenticated'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects Users can delete their own documents; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Users can delete their own documents" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects Users can read their own documents; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Users can read their own documents" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects Users can update their own avatar; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Users can update their own avatar" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'avatars'::"text") AND ("auth"."role"() = 'authenticated'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects Users can update their own documents; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Users can update their own documents" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"))) WITH CHECK ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects Users can upload their own avatar; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Users can upload their own avatar" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'avatars'::"text") AND ("auth"."role"() = 'authenticated'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects Users can upload their own documents; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Users can upload their own documents" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects documents_bucket_read_shared; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "documents_bucket_read_shared" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'documents'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."documents" "d"
  WHERE (("split_part"("objects"."name", '/'::"text", 1) = ("d"."owner_id")::"text") AND ("split_part"("objects"."name", '/'::"text", 2) = ("d"."id")::"text") AND (("d"."owner_id" = "auth"."uid"()) OR ("d"."id" IN ( SELECT "ds"."document_id"
           FROM "public"."document_shares" "ds"
          WHERE ("ds"."shared_with" = "auth"."uid"())))))))));


--
-- Name: objects documents_delete_own; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "documents_delete_own" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects documents_insert_own; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "documents_insert_own" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects documents_select_own; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "documents_select_own" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects documents_update_own; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "documents_update_own" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA "auth"; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: SCHEMA "storage"; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";


--
-- Name: FUNCTION "email"(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";


--
-- Name: FUNCTION "jwt"(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";


--
-- Name: FUNCTION "role"(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";


--
-- Name: FUNCTION "uid"(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";


--
-- Name: FUNCTION "can_access_patient"("_patient_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."can_access_patient"("_patient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_patient"("_patient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_patient"("_patient_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "current_role"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_role"() TO "service_role";


--
-- Name: FUNCTION "enqueue_encryption_backfill"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."enqueue_encryption_backfill"() TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_encryption_backfill"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_encryption_backfill"() TO "service_role";


--
-- Name: FUNCTION "generate_doctor_slug"("p_doctor_id" "uuid", "p_name" "text", "p_specialty" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."generate_doctor_slug"("p_doctor_id" "uuid", "p_name" "text", "p_specialty" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_doctor_slug"("p_doctor_id" "uuid", "p_name" "text", "p_specialty" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_doctor_slug"("p_doctor_id" "uuid", "p_name" "text", "p_specialty" "text") TO "service_role";


--
-- Name: FUNCTION "get_all_specialties"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_all_specialties"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_specialties"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_specialties"() TO "service_role";


--
-- Name: FUNCTION "get_conversation_between_users"("user_a" "uuid", "user_b" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_conversation_between_users"("user_a" "uuid", "user_b" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversation_between_users"("user_a" "uuid", "user_b" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversation_between_users"("user_a" "uuid", "user_b" "uuid") TO "service_role";


--
-- Name: FUNCTION "get_doctor_availability_by_slug"("p_slug" "text", "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_doctor_availability_by_slug"("p_slug" "text", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_doctor_availability_by_slug"("p_slug" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_doctor_availability_by_slug"("p_slug" "text", "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "get_doctor_review_summary"("p_slug" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_doctor_review_summary"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_doctor_review_summary"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_doctor_review_summary"("p_slug" "text") TO "service_role";


--
-- Name: FUNCTION "get_encryption_backfill_stats"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_encryption_backfill_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_encryption_backfill_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_encryption_backfill_stats"() TO "service_role";


--
-- Name: FUNCTION "get_folder_item_count"("p_folder_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_folder_item_count"("p_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_folder_item_count"("p_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_folder_item_count"("p_folder_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "get_public_doctor_by_slug"("p_slug" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_public_doctor_by_slug"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_doctor_by_slug"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_doctor_by_slug"("p_slug" "text") TO "service_role";


--
-- Name: FUNCTION "get_public_doctor_detail"("p_slug" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_public_doctor_detail"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_doctor_detail"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_doctor_detail"("p_slug" "text") TO "service_role";


--
-- Name: FUNCTION "get_public_doctor_reviews"("p_slug" "text", "p_limit" integer, "p_offset" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_public_doctor_reviews"("p_slug" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_doctor_reviews"("p_slug" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_doctor_reviews"("p_slug" "text", "p_limit" integer, "p_offset" integer) TO "service_role";


--
-- Name: FUNCTION "get_public_insurance_providers"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_public_insurance_providers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_insurance_providers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_insurance_providers"() TO "service_role";


--
-- Name: FUNCTION "get_public_specialties"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_public_specialties"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_specialties"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_specialties"() TO "service_role";


--
-- Name: FUNCTION "get_reviewable_appointments"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_reviewable_appointments"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_reviewable_appointments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reviewable_appointments"() TO "service_role";


--
-- Name: FUNCTION "get_unread_total"("p_user_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_unread_total"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_total"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_total"("p_user_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "handle_new_message"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "service_role";


--
-- Name: FUNCTION "handle_new_user"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


--
-- Name: FUNCTION "handle_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";


--
-- Name: FUNCTION "has_consent"("_patient_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."has_consent"("_patient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_consent"("_patient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_consent"("_patient_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "has_patient_scope"("_patient_id" "uuid", "_scope" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."has_patient_scope"("_patient_id" "uuid", "_scope" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_patient_scope"("_patient_id" "uuid", "_scope" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_patient_scope"("_patient_id" "uuid", "_scope" "text") TO "service_role";


--
-- Name: FUNCTION "increment_review_helpful"("p_review_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."increment_review_helpful"("p_review_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_review_helpful"("p_review_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_review_helpful"("p_review_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_conversation_participant"("_conversation_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_conversation_participant"("_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_conversation_participant"("_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_conversation_participant"("_conversation_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_doctor"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_doctor"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_doctor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_doctor"() TO "service_role";


--
-- Name: FUNCTION "is_participant_of"("conv_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_participant_of"("conv_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_participant_of"("conv_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_participant_of"("conv_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_patient"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_patient"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_patient"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_patient"() TO "service_role";


--
-- Name: FUNCTION "is_peer_in_conversation"("_peer_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_peer_in_conversation"("_peer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_peer_in_conversation"("_peer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_peer_in_conversation"("_peer_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "mark_conversation_read"("p_conversation_id" "uuid", "p_user_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "prevent_role_change"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."prevent_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_role_change"() TO "service_role";


--
-- Name: FUNCTION "search_doctors_advanced"("p_query" "text", "p_city" "text", "p_specialty" "text", "p_insurance" "text", "p_accepts_video" boolean, "p_available_from" "text", "p_available_to" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."search_doctors_advanced"("p_query" "text", "p_city" "text", "p_specialty" "text", "p_insurance" "text", "p_accepts_video" boolean, "p_available_from" "text", "p_available_to" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_doctors_advanced"("p_query" "text", "p_city" "text", "p_specialty" "text", "p_insurance" "text", "p_accepts_video" boolean, "p_available_from" "text", "p_available_to" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_doctors_advanced"("p_query" "text", "p_city" "text", "p_specialty" "text", "p_insurance" "text", "p_accepts_video" boolean, "p_available_from" "text", "p_available_to" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "service_role";


--
-- Name: FUNCTION "search_public_doctors"("p_query" "text", "p_specialty" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."search_public_doctors"("p_query" "text", "p_specialty" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_public_doctors"("p_query" "text", "p_specialty" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_public_doctors"("p_query" "text", "p_specialty" "text", "p_sort" "text", "p_limit" integer, "p_offset" integer) TO "service_role";


--
-- Name: FUNCTION "set_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


--
-- Name: FUNCTION "start_new_conversation"("other_user_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."start_new_conversation"("other_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."start_new_conversation"("other_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_new_conversation"("other_user_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "submit_verified_review"("p_appointment_id" "uuid", "p_rating" integer, "p_rating_punctuality" integer, "p_rating_attention" integer, "p_rating_facilities" integer, "p_comment" "text", "p_is_anonymous" boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."submit_verified_review"("p_appointment_id" "uuid", "p_rating" integer, "p_rating_punctuality" integer, "p_rating_attention" integer, "p_rating_facilities" integer, "p_comment" "text", "p_is_anonymous" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_verified_review"("p_appointment_id" "uuid", "p_rating" integer, "p_rating_punctuality" integer, "p_rating_attention" integer, "p_rating_facilities" integer, "p_comment" "text", "p_is_anonymous" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_verified_review"("p_appointment_id" "uuid", "p_rating" integer, "p_rating_punctuality" integer, "p_rating_attention" integer, "p_rating_facilities" integer, "p_comment" "text", "p_is_anonymous" boolean) TO "service_role";


--
-- Name: FUNCTION "trg_doctor_slug"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."trg_doctor_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_doctor_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_doctor_slug"() TO "service_role";


--
-- Name: FUNCTION "update_updated_at_column"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


--
-- Name: TABLE "audit_log_entries"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "custom_oauth_providers"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."custom_oauth_providers" TO "postgres";
GRANT ALL ON TABLE "auth"."custom_oauth_providers" TO "dashboard_user";


--
-- Name: TABLE "flow_state"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";


--
-- Name: TABLE "identities"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";


--
-- Name: TABLE "instances"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "mfa_amr_claims"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";


--
-- Name: TABLE "mfa_challenges"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";


--
-- Name: TABLE "mfa_factors"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";


--
-- Name: TABLE "oauth_authorizations"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";


--
-- Name: TABLE "oauth_client_states"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."oauth_client_states" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_client_states" TO "dashboard_user";


--
-- Name: TABLE "oauth_clients"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";


--
-- Name: TABLE "oauth_consents"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_consents" TO "dashboard_user";


--
-- Name: TABLE "one_time_tokens"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";


--
-- Name: TABLE "refresh_tokens"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;


--
-- Name: SEQUENCE "refresh_tokens_id_seq"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";


--
-- Name: TABLE "saml_providers"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";


--
-- Name: TABLE "saml_relay_states"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";


--
-- Name: TABLE "schema_migrations"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "sessions"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";


--
-- Name: TABLE "sso_domains"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";


--
-- Name: TABLE "sso_providers"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";


--
-- Name: TABLE "users"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "appointment_notes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."appointment_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_notes" TO "service_role";


--
-- Name: TABLE "appointments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";


--
-- Name: TABLE "care_links"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."care_links" TO "authenticated";
GRANT ALL ON TABLE "public"."care_links" TO "service_role";


--
-- Name: TABLE "conversation_participants"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";


--
-- Name: TABLE "conversations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";


--
-- Name: TABLE "doctor_insurances"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."doctor_insurances" TO "anon";
GRANT ALL ON TABLE "public"."doctor_insurances" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_insurances" TO "service_role";


--
-- Name: TABLE "doctor_patient_consent"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."doctor_patient_consent" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_patient_consent" TO "service_role";


--
-- Name: TABLE "doctor_profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."doctor_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."doctor_profiles" TO "anon";


--
-- Name: TABLE "doctor_schedules"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."doctor_schedules" TO "anon";
GRANT ALL ON TABLE "public"."doctor_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_schedules" TO "service_role";


--
-- Name: TABLE "doctor_services"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."doctor_services" TO "anon";
GRANT ALL ON TABLE "public"."doctor_services" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_services" TO "service_role";


--
-- Name: TABLE "document_folders"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."document_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."document_folders" TO "service_role";


--
-- Name: TABLE "document_shares"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."document_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."document_shares" TO "service_role";


--
-- Name: TABLE "documents"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";


--
-- Name: TABLE "encryption_backfill_queue"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."encryption_backfill_queue" TO "anon";
GRANT ALL ON TABLE "public"."encryption_backfill_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."encryption_backfill_queue" TO "service_role";


--
-- Name: SEQUENCE "encryption_backfill_queue_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."encryption_backfill_queue_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."encryption_backfill_queue_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."encryption_backfill_queue_id_seq" TO "service_role";


--
-- Name: TABLE "encryption_key_registry"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."encryption_key_registry" TO "anon";
GRANT ALL ON TABLE "public"."encryption_key_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."encryption_key_registry" TO "service_role";


--
-- Name: TABLE "folders"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";


--
-- Name: TABLE "messages"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";


--
-- Name: TABLE "notifications"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";


--
-- Name: TABLE "patient_notes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."patient_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_notes" TO "service_role";


--
-- Name: TABLE "patient_profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."patient_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_profiles" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: TABLE "sensitive_access_audit"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."sensitive_access_audit" TO "anon";
GRANT ALL ON TABLE "public"."sensitive_access_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."sensitive_access_audit" TO "service_role";


--
-- Name: TABLE "specialties"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."specialties" TO "anon";
GRANT ALL ON TABLE "public"."specialties" TO "authenticated";
GRANT ALL ON TABLE "public"."specialties" TO "service_role";


--
-- Name: TABLE "user_settings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";


--
-- Name: TABLE "user_status"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."user_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_status" TO "service_role";


--
-- Name: TABLE "verified_reviews"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."verified_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."verified_reviews" TO "service_role";
GRANT SELECT ON TABLE "public"."verified_reviews" TO "anon";


--
-- Name: TABLE "buckets"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE "storage"."buckets" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "buckets_analytics"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";


--
-- Name: TABLE "buckets_vectors"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";


--
-- Name: TABLE "objects"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE "storage"."objects" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "s3_multipart_uploads"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";


--
-- Name: TABLE "s3_multipart_uploads_parts"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";


--
-- Name: TABLE "vector_indexes"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

\unrestrict iin7RryAO10XYhSwPzhXdA94DRAcGq6iikjKZypPi12GKUYcYLX4h2T8lTyep3D
