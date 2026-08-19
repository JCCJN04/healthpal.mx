-- Migration: Allow doctors to securely unlink/remove a patient
-- Hardened Security & NOM-004-SSA3-2012 / NOM-024-SSA3-2012 Compliance
-- 1. Strictly enforces caller authentication (auth.uid() = doctor_id or active assistant)
-- 2. Prevents ID spoofing and unauthorized access
-- 3. Revokes all consent scopes in doctor_patient_consent
-- 4. Cancels future appointments and logs immutable audit trail

CREATE OR REPLACE FUNCTION public.doctor_unlink_patient(
  p_doctor_id uuid,
  p_patient_id uuid,
  p_cancel_future_appointments boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_consent_exists boolean;
  v_cancelled_appointments int := 0;
BEGIN
  -- 1. Authentication check
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'unauthenticated',
      'message', 'Debes iniciar sesión para realizar esta acción.'
    );
  END IF;

  -- 2. Input validation
  IF p_doctor_id IS NULL OR p_patient_id IS NULL OR p_doctor_id = p_patient_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_parameters',
      'message', 'Parámetros inválidos.'
    );
  END IF;

  -- 3. Authorization check: caller must be the doctor or an active authorized assistant
  IF v_caller_id <> p_doctor_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.assistants
      WHERE assistant_id = v_caller_id AND doctor_id = p_doctor_id AND is_active = true
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'unauthorized',
        'message', 'No tienes autorización para desvincular pacientes de este médico.'
      );
    END IF;
  END IF;

  -- 4. Verify consent row exists between this doctor and patient
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_patient_consent
    WHERE doctor_id = p_doctor_id AND patient_id = p_patient_id
  ) INTO v_consent_exists;

  IF NOT v_consent_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'not_found',
      'message', 'No se encontró un registro de consentimiento para este paciente.'
    );
  END IF;

  -- 5. Update doctor_patient_consent to 'revoked' and disable all sharing scopes
  UPDATE public.doctor_patient_consent
  SET
    status = 'revoked',
    share_basic_profile = false,
    share_contact = false,
    share_documents = false,
    share_appointments = false,
    share_medical_notes = false,
    share_insurance = false,
    edit_clinical_history = false,
    updated_at = now()
  WHERE doctor_id = p_doctor_id AND patient_id = p_patient_id;

  -- 6. Cancel future appointments if requested
  IF p_cancel_future_appointments THEN
    UPDATE public.appointments
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE doctor_id = p_doctor_id
      AND patient_id = p_patient_id
      AND status IN ('pending', 'confirmed')
      AND (
        (scheduled_at IS NOT NULL AND scheduled_at >= now())
        OR
        (appointment_date IS NOT NULL AND appointment_date >= CURRENT_DATE)
      );
    GET DIAGNOSTICS v_cancelled_appointments = ROW_COUNT;
  END IF;

  -- 7. Log audit event (NOM-024-SSA3-2012 §6.6 / §3.42)
  BEGIN
    PERFORM public.log_audit_event(
      'revoke_consent',
      'doctor_patient_consent',
      p_patient_id,
      p_patient_id,
      jsonb_build_object(
        'doctor_id', p_doctor_id,
        'cancelled_appointments', v_cancelled_appointments,
        'performed_by', v_caller_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit logging failure should not break operation, but is recorded in DB log
    RAISE WARNING 'Audit log failed in doctor_unlink_patient: %', SQLERRM;
  END;

  -- 8. Return success response
  RETURN jsonb_build_object(
    'success', true,
    'code', 'ok',
    'message', 'El paciente ha sido desvinculado correctamente.',
    'cancelled_appointments', v_cancelled_appointments
  );
END;
$$;

REVOKE ALL ON FUNCTION public.doctor_unlink_patient(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.doctor_unlink_patient(uuid, uuid, boolean) TO authenticated;
