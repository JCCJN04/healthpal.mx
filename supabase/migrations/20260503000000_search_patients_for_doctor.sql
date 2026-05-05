-- Creates an RPC that allows a doctor to search patients by name.
-- Uses SECURITY DEFINER to bypass RLS on profiles, but only exposes
-- non-sensitive fields (id, full_name, avatar_url) plus the consent
-- status that already belongs to the calling doctor.
-- Only authenticated doctors can call this function.

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
    p.role = 'patient'
    AND p.full_name ILIKE '%' || search_term || '%'
  ORDER BY p.full_name
  LIMIT 15;
END;
$$;

-- Revoke public execute, grant only to authenticated
REVOKE ALL ON FUNCTION public.search_patients_for_doctor(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_patients_for_doctor(text, uuid) TO authenticated;
