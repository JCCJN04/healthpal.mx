-- =========================================================================
--  REEMPLAZAR FUNCIÓN get_public_doctor_detail
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- =========================================================================

-- Esta función retorna los detalles de un doctor. Anteriormente tenía un problema de casting con 'numeric' y 'integer'.
-- Ha sido reparada para que los tipos coincidan exactamente con la definición de la interfaz.

-- 1. ELIMINAR CUALQUIER VERSIÓN ANTERIOR AUTOMÁTICAMENTE
DO $$
DECLARE
    func_rec record;
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
            -- Agregamos la consulta de modalidad agregada en el commit anterior
            dp.consultation_mode,
            COALESCE(dp.accepted_insurances, ARRAY[]::text[]) AS accepted_insurances
        FROM doctor_profiles dp
        JOIN profiles p ON p.id = dp.doctor_id
        WHERE dp.slug = p_slug
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
        dp.slug::text,                                   -- 1. slug
        dp.display_name::text,                           -- 2. display_name
        dp.avatar_url::text,                             -- 3. avatar_url
        dp.specialty::text,                              -- 4. specialty
        dp.clinic_name::text,                            -- 5. clinic_name
        dp.bio::text,                                    -- 6. bio
        dp.years_experience::integer,                    -- 7. years_experience
        dp.consultation_price_mxn::numeric,              -- 8. consultation_price
        dp.address_text::text,                           -- 9. address_text
        NULL::text AS city,                              -- 10. city
        dp.location::jsonb,                              -- 11. location
        false::boolean AS is_verified,                   -- 12. is_verified
        0::numeric AS avg_rating,                        -- 13. avg_rating
        0::integer AS review_count,                      -- 14. review_count
        ARRAY['Español']::text[] AS languages,           -- 15. languages
        -- Determinamos is_video sumando consultation_mode:
        (dp.consultation_mode IN ('video', 'both'))::boolean AS accepts_video, -- 16. accepts_video
        NULL::text AS next_available_slot,               -- 17. next_available_slot
        '[]'::jsonb AS education,                        -- 18. education
        '[]'::jsonb AS illnesses_treated,                -- 19. illnesses_treated
        COALESCE(s.services_json, '[]'::jsonb) AS services, -- 20. services
        to_jsonb(dp.accepted_insurances) AS insurances   -- 21. insurances
    FROM doc_profile dp
    LEFT JOIN services_aggr s ON s.doctor_id = dp.doctor_id;
END;
$$;
