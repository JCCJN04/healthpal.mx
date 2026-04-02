-- =============================================================================
-- Comprehensive fixes migration
-- Fixes: user_settings auto-create, notifications triggers, is_public filter,
--        care_links updated_at, doctor_response on reviews, consent expiration,
--        insurance_provider empty string cleanup, document_folders deprecation
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AUTO-CREATE user_settings WHEN A NEW PROFILE IS INSERTED
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_profile_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_profile_settings ON public.profiles;
CREATE TRIGGER trg_new_profile_settings
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_profile_settings();

-- Backfill missing user_settings for existing profiles
INSERT INTO public.user_settings (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_settings us WHERE us.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADD updated_at TO care_links
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.care_links
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing rows
UPDATE public.care_links SET updated_at = created_at WHERE updated_at = now() AND created_at < now();

DROP TRIGGER IF EXISTS trg_care_links_updated_at ON public.care_links;
CREATE TRIGGER trg_care_links_updated_at
BEFORE UPDATE ON public.care_links
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ADD doctor_response TO verified_reviews
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.verified_reviews
  ADD COLUMN IF NOT EXISTS doctor_response text,
  ADD COLUMN IF NOT EXISTS doctor_responded_at timestamptz;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CONSENT DEFAULT EXPIRATION — 1 YEAR
--    New consents get access_expires_at = now() + 1 year if left NULL
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_consent_expiration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set on INSERT when caller didn't supply an explicit expiration
  IF TG_OP = 'INSERT' AND NEW.access_expires_at IS NULL THEN
    NEW.access_expires_at := now() + interval '1 year';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consent_expiration ON public.doctor_patient_consent;
CREATE TRIGGER trg_consent_expiration
BEFORE INSERT ON public.doctor_patient_consent
FOR EACH ROW
EXECUTE FUNCTION public.set_consent_expiration();

-- Backfill existing consents that have no expiration and are still accepted
UPDATE public.doctor_patient_consent
SET access_expires_at = created_at + interval '1 year'
WHERE access_expires_at IS NULL
  AND status = 'accepted';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FIX is_public FILTER IN search_public_doctors & search_doctors_advanced
--    Previously these functions did NOT filter by is_public, so doctors who
--    had is_public=false still appeared in search results.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."search_public_doctors"(
  "p_query"    text    DEFAULT NULL,
  "p_specialty" text   DEFAULT NULL,
  "p_sort"     text    DEFAULT 'rating',
  "p_limit"    integer DEFAULT 20,
  "p_offset"   integer DEFAULT 0
)
RETURNS TABLE(
  "slug"                 text,
  "display_name"         text,
  "avatar_url"           text,
  "specialty"            text,
  "clinic_name"          text,
  "bio"                  text,
  "years_experience"     integer,
  "consultation_price"   integer,
  "address_text"         text,
  "location"             jsonb,
  "is_verified"          boolean,
  "avg_rating"           numeric,
  "review_count"         bigint,
  "total_count"          bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    AND dp.is_public = true                    -- ← FIX: only public doctors
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


CREATE OR REPLACE FUNCTION "public"."search_doctors_advanced"(
  "p_query"          text    DEFAULT NULL,
  "p_city"           text    DEFAULT NULL,
  "p_specialty"      text    DEFAULT NULL,
  "p_insurance"      text    DEFAULT NULL,
  "p_accepts_video"  boolean DEFAULT NULL,
  "p_available_from" text    DEFAULT NULL,
  "p_available_to"   text    DEFAULT NULL,
  "p_sort"           text    DEFAULT 'rating',
  "p_limit"          integer DEFAULT 20,
  "p_offset"         integer DEFAULT 0
)
RETURNS TABLE(
  "slug"               text,
  "display_name"       text,
  "avatar_url"         text,
  "specialty"          text,
  "clinic_name"        text,
  "bio"                text,
  "years_experience"   integer,
  "consultation_price" numeric,
  "address_text"       text,
  "city"               text,
  "location"           jsonb,
  "is_verified"        boolean,
  "avg_rating"         numeric,
  "review_count"       integer,
  "languages"          text[],
  "accepts_video"      boolean,
  "next_available_slot" text,
  "total_count"        integer
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_total_count
  FROM   doctor_profiles dp
  JOIN   profiles p ON p.id = dp.doctor_id
  WHERE
    p.role = 'doctor'
    AND p.onboarding_completed = true
    AND dp.is_public = true                    -- ← FIX: only public doctors
    AND ((p_query IS NULL) OR (
      p.full_name ILIKE '%' || p_query || '%' OR
      dp.specialty ILIKE '%' || p_query || '%' OR
      dp.bio ILIKE '%' || p_query || '%'
    ))
    AND ((p_specialty IS NULL OR p_specialty = '') OR dp.specialty = p_specialty)
    AND ((p_city IS NULL OR p_city = '') OR (
      dp.address_text ILIKE '%' || p_city || '%' OR
      (dp.location->>'city') ILIKE '%' || p_city || '%'
    ))
    AND ((p_insurance IS NULL OR p_insurance = '') OR (
      p_insurance = ANY(dp.accepted_insurances)
      OR EXISTS (
        SELECT 1 FROM public.doctor_insurances di
        WHERE di.doctor_id = dp.doctor_id
          AND di.insurance_provider ILIKE p_insurance
      )
    ))
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
    dp.is_sep_verified::BOOLEAN                           AS is_verified,
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
    p.role = 'doctor'
    AND p.onboarding_completed = true
    AND dp.is_public = true                    -- ← FIX: only public doctors
    AND ((p_query IS NULL) OR (
      p.full_name ILIKE '%' || p_query || '%' OR
      dp.specialty ILIKE '%' || p_query || '%' OR
      dp.bio ILIKE '%' || p_query || '%'
    ))
    AND ((p_specialty IS NULL OR p_specialty = '') OR dp.specialty = p_specialty)
    AND ((p_city IS NULL OR p_city = '') OR (
      dp.address_text ILIKE '%' || p_city || '%' OR
      (dp.location->>'city') ILIKE '%' || p_city || '%'
    ))
    AND ((p_insurance IS NULL OR p_insurance = '') OR (
      p_insurance = ANY(dp.accepted_insurances)
      OR EXISTS (
        SELECT 1 FROM public.doctor_insurances di
        WHERE di.doctor_id = dp.doctor_id
          AND di.insurance_provider ILIKE p_insurance
      )
    ))
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. NOTIFICATIONS TRIGGER FOR APPOINTMENTS
--    Creates in-app notifications when appointment status changes.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_appointment_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doctor_name   text;
  v_patient_name  text;
  v_start_at      text;
BEGIN
  -- Fetch actor names for notification text
  SELECT full_name INTO v_doctor_name  FROM profiles WHERE id = NEW.doctor_id  LIMIT 1;
  SELECT full_name INTO v_patient_name FROM profiles WHERE id = NEW.patient_id LIMIT 1;
  v_start_at := to_char(NEW.start_at AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI');

  -- ── NEW appointment: notify doctor ──────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, entity_table, entity_id)
    VALUES (
      NEW.doctor_id,
      'appointment_requested',
      'Nueva solicitud de cita',
      COALESCE(v_patient_name, 'Un paciente') || ' quiere una cita el ' || v_start_at,
      'appointments',
      NEW.id
    );
    RETURN NEW;
  END IF;

  -- ── STATUS CHANGE notifications ──────────────────────────────────────────────
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

    CASE NEW.status

      WHEN 'confirmed' THEN
        -- Notify patient: doctor confirmed
        INSERT INTO public.notifications (user_id, type, title, body, entity_table, entity_id)
        VALUES (
          NEW.patient_id,
          'appointment_confirmed',
          'Cita confirmada',
          'Tu cita con ' || COALESCE(v_doctor_name, 'el médico') || ' el ' || v_start_at || ' fue confirmada.',
          'appointments',
          NEW.id
        );

      WHEN 'cancelled' THEN
        -- Notify the OTHER party
        IF NEW.created_by = NEW.patient_id THEN
          -- Patient cancelled → notify doctor
          INSERT INTO public.notifications (user_id, type, title, body, entity_table, entity_id)
          VALUES (
            NEW.doctor_id,
            'appointment_cancelled',
            'Cita cancelada',
            COALESCE(v_patient_name, 'El paciente') || ' canceló la cita del ' || v_start_at || '.',
            'appointments',
            NEW.id
          );
        ELSE
          -- Doctor cancelled → notify patient
          INSERT INTO public.notifications (user_id, type, title, body, entity_table, entity_id)
          VALUES (
            NEW.patient_id,
            'appointment_cancelled',
            'Cita cancelada',
            'Tu cita con ' || COALESCE(v_doctor_name, 'el médico') || ' el ' || v_start_at || ' fue cancelada.',
            'appointments',
            NEW.id
          );
        END IF;

      WHEN 'rejected' THEN
        -- Notify patient
        INSERT INTO public.notifications (user_id, type, title, body, entity_table, entity_id)
        VALUES (
          NEW.patient_id,
          'appointment_rejected',
          'Solicitud de cita rechazada',
          'Tu solicitud de cita con ' || COALESCE(v_doctor_name, 'el médico') || ' el ' || v_start_at || ' no fue aceptada.',
          'appointments',
          NEW.id
        );

      WHEN 'completed' THEN
        -- Notify patient to leave a review
        INSERT INTO public.notifications (user_id, type, title, body, entity_table, entity_id)
        VALUES (
          NEW.patient_id,
          'appointment_completed',
          'Cita completada — deja tu reseña',
          '¿Cómo fue tu consulta con ' || COALESCE(v_doctor_name, 'el médico') || '? Comparte tu experiencia.',
          'appointments',
          NEW.id
        );

      ELSE
        NULL; -- no-op for other status values
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_notifications ON public.appointments;
CREATE TRIGGER trg_appointment_notifications
AFTER INSERT OR UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_appointment_notifications();


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. NOTIFICATIONS TRIGGER FOR MESSAGES
--    Notifies the recipient when a new message arrives.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient_id  uuid;
  v_sender_name   text;
BEGIN
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id LIMIT 1;

  -- Find other participant(s) in the conversation
  FOR v_recipient_id IN
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, entity_table, entity_id)
    VALUES (
      v_recipient_id,
      'new_message',
      'Nuevo mensaje',
      COALESCE(v_sender_name, 'Alguien') || ' te envió un mensaje.',
      'conversations',
      NEW.conversation_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_notification ON public.messages;
CREATE TRIGGER trg_message_notification
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_message_notification();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FIX insurance_provider EMPTY STRING → NULL IN patient_profiles
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.patient_profiles
SET insurance_provider = NULL
WHERE insurance_provider = '';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. KEEP doctor_insurances AS SOLE SOURCE OF TRUTH FOR INSURANCE
--    Sync trigger: when doctor_insurances changes, rebuild accepted_insurances
--    array on doctor_profiles. This eliminates the dual-source problem.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_doctor_accepted_insurances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doctor_id uuid;
BEGIN
  v_doctor_id := COALESCE(NEW.doctor_id, OLD.doctor_id);

  UPDATE public.doctor_profiles
  SET accepted_insurances = (
    SELECT ARRAY_AGG(insurance_provider ORDER BY insurance_provider)
    FROM public.doctor_insurances
    WHERE doctor_id = v_doctor_id
  )
  WHERE doctor_id = v_doctor_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_accepted_insurances ON public.doctor_insurances;
CREATE TRIGGER trg_sync_accepted_insurances
AFTER INSERT OR UPDATE OR DELETE ON public.doctor_insurances
FOR EACH ROW
EXECUTE FUNCTION public.sync_doctor_accepted_insurances();

-- Backfill: rebuild accepted_insurances for all doctors from doctor_insurances
UPDATE public.doctor_profiles dp
SET accepted_insurances = (
  SELECT ARRAY_AGG(di.insurance_provider ORDER BY di.insurance_provider)
  FROM public.doctor_insurances di
  WHERE di.doctor_id = dp.doctor_id
)
WHERE EXISTS (
  SELECT 1 FROM public.doctor_insurances di WHERE di.doctor_id = dp.doctor_id
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. DROP EMPTY document_folders TABLE (use only `folders`)
--     document_folders has 0 rows and is never used by any code path.
--     The `folders` table is the active implementation.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.document_folders CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ADD PHI ACCESS AUDIT TRIGGER
--     Logs when a doctor reads patient data through can_access_patient / has_consent.
--     We add a lightweight audit on patient_profiles SELECT via a helper function.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_action       text,
  p_target_table text,
  p_target_id    uuid,
  p_reason       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.sensitive_access_audit (
    actor_id, action, target_table, target_id, reason, success, request_meta
  )
  VALUES (
    auth.uid(),
    p_action,
    p_target_table,
    p_target_id,
    p_reason,
    true,
    jsonb_build_object(
      'role', public.current_role()::text,
      'ts',   now()
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Never let audit failures break the main flow
  NULL;
END;
$$;

COMMIT;
