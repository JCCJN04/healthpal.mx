-- Migration: Enhance search_patients_for_doctor and add request_access_by_identifier
-- Allows doctors to find existing HealthPal users by name, email, or phone,
-- and request consent access directly.

-- 1. Update search_patients_for_doctor
CREATE OR REPLACE FUNCTION public.search_patients_for_doctor(
  search_term text,
  p_doctor_id uuid
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  consent_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_clean_term text;
  v_digits text;
BEGIN
  -- Only authenticated users that are doctors may call this
  SELECT role::text INTO v_caller_role
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  IF auth.uid() IS NULL OR v_caller_role <> 'doctor' THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- The doctor may only query on behalf of themselves
  IF auth.uid() <> p_doctor_id THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  v_clean_term := TRIM(search_term);
  v_digits := regexp_replace(v_clean_term, '\D', '', 'g');

  RETURN QUERY
  SELECT
    p.id,
    p.full_name::text,
    p.avatar_url::text,
    dpc.status::text AS consent_status
  FROM public.profiles p
  LEFT JOIN public.doctor_patient_consent dpc
    ON dpc.patient_id = p.id
    AND dpc.doctor_id = p_doctor_id
  WHERE
    p.id <> p_doctor_id
    AND (
      p.full_name ILIKE '%' || v_clean_term || '%'
      OR (p.email IS NOT NULL AND p.email ILIKE '%' || v_clean_term || '%')
      OR (LENGTH(v_digits) >= 6 AND regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') ILIKE '%' || v_digits || '%')
    )
  ORDER BY
    CASE 
      WHEN p.email ILIKE v_clean_term THEN 0
      WHEN p.full_name ILIKE v_clean_term || '%' THEN 1
      ELSE 2
    END,
    p.full_name
  LIMIT 15;
END;
$$;

REVOKE ALL ON FUNCTION public.search_patients_for_doctor(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_patients_for_doctor(text, uuid) TO authenticated;

-- 2. Add request_access_to_patient_by_identifier RPC
CREATE OR REPLACE FUNCTION public.request_access_to_patient_by_identifier(
  p_doctor_id uuid,
  p_identifier text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_target_id uuid;
  v_target_name text;
  v_target_role text;
  v_clean_term text;
  v_digits text;
  v_existing_status text;
BEGIN
  -- Authenticate caller
  SELECT role::text INTO v_caller_role
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  IF auth.uid() IS NULL OR v_caller_role <> 'doctor' OR auth.uid() <> p_doctor_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'unauthorized', 'message', 'Acceso denegado');
  END IF;

  v_clean_term := LOWER(TRIM(p_identifier));
  v_digits := regexp_replace(v_clean_term, '\D', '', 'g');

  IF v_clean_term = '' THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_input', 'message', 'Ingresa un correo o teléfono válido');
  END IF;

  -- Find matching user
  SELECT p.id, COALESCE(p.full_name, 'Paciente'), p.role::text
  INTO v_target_id, v_target_name, v_target_role
  FROM public.profiles p
  WHERE
    p.id <> p_doctor_id
    AND (
      (p.email IS NOT NULL AND LOWER(p.email) = v_clean_term)
      OR (LENGTH(v_digits) >= 10 AND regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') LIKE '%' || v_digits)
    )
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'not_found',
      'message', 'No se encontró ningún usuario con ese correo o teléfono en HealthPal.'
    );
  END IF;

  -- Check existing consent status
  SELECT status INTO v_existing_status
  FROM public.doctor_patient_consent
  WHERE doctor_id = p_doctor_id AND patient_id = v_target_id;

  IF v_existing_status = 'accepted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'already_accepted',
      'patient_id', v_target_id,
      'patient_name', v_target_name,
      'message', 'Este paciente ya tiene el acceso concedido y está en tu lista.'
    );
  END IF;

  IF v_existing_status = 'requested' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'already_requested',
      'patient_id', v_target_id,
      'patient_name', v_target_name,
      'message', 'Ya enviaste una solicitud a este paciente. Está pendiente de aprobación.'
    );
  END IF;

  -- Upsert requested consent
  INSERT INTO public.doctor_patient_consent (
    doctor_id,
    patient_id,
    status,
    request_reason,
    requested_at,
    responded_at,
    share_basic_profile,
    share_contact,
    share_documents,
    share_appointments,
    share_medical_notes,
    share_insurance,
    edit_clinical_history
  )
  VALUES (
    p_doctor_id,
    v_target_id,
    'requested',
    NULLIF(TRIM(p_reason), ''),
    now(),
    NULL,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  )
  ON CONFLICT (doctor_id, patient_id) DO UPDATE SET
    status = 'requested',
    request_reason = EXCLUDED.request_reason,
    requested_at = now(),
    responded_at = NULL,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'patient_id', v_target_id,
    'patient_name', v_target_name,
    'message', 'Solicitud de acceso enviada con éxito. Recibirás acceso en cuanto el paciente la autorice.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_access_to_patient_by_identifier(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_access_to_patient_by_identifier(uuid, text, text) TO authenticated;
