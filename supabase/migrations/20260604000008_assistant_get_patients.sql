-- RPC: get_doctor_patients_for_assistant
-- Returns the doctor's patients (basic info only — no clinical data) to an active assistant.
-- SECURITY DEFINER bypasses RLS on profiles so we can read phone/email safely,
-- but enforces: (1) caller is assistant role, (2) caller is actively linked to the requested doctor.

CREATE OR REPLACE FUNCTION public.get_doctor_patients_for_assistant(p_doctor_id uuid)
RETURNS TABLE (
  id         uuid,
  full_name  text,
  avatar_url text,
  phone      text,
  email      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_linked      boolean;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Must be assistant role
  SELECT role::text INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role <> 'assistant' THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- Must be actively linked to this doctor
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_assistants
    WHERE doctor_id    = p_doctor_id
      AND assistant_id = auth.uid()
      AND status       = 'active'
  ) INTO v_linked;

  IF NOT v_linked THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- Return unique patients who have had appointments with this doctor
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.full_name::text,
    p.avatar_url::text,
    p.phone::text,
    p.email::text
  FROM public.profiles p
  WHERE p.id IN (
    SELECT DISTINCT patient_id
    FROM public.appointments
    WHERE doctor_id = p_doctor_id
  )
  ORDER BY p.id, p.full_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_doctor_patients_for_assistant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_doctor_patients_for_assistant(uuid) TO authenticated;
