-- Seed a test doctor for testing purposes
-- This doctor will appear in the "Search Doctor" list

DO $$
DECLARE
    new_doctor_id UUID := 'd0c70da0-7ec1-4e81-9bfe-7f2845c474d1'; -- Fixed UUID for test doctor
    new_doctor_email TEXT := 'gabriel.test@healthpal.mx';
BEGIN
    -- 1. Insert into auth.users (required for the profiles foreign key)
    -- Using common standard columns to avoid schema mismatch errors
    INSERT INTO auth.users (
        id,
        aud,
        role,
        email,
        email_confirmed_at,
        raw_user_meta_data,
        is_sso_user,
        created_at,
        updated_at
    )
    VALUES (
        new_doctor_id,
        'authenticated',
        'authenticated',
        new_doctor_email,
        now(),
        jsonb_build_object('full_name', 'Dr. Gabriel Mendoza', 'role', 'doctor'),
        false,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert into public.profiles
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        onboarding_completed,
        onboarding_step,
        created_at,
        updated_at
    )
    VALUES (
        new_doctor_id,
        'Dr. Gabriel Mendoza',
        new_doctor_email,
        'doctor',
        true,
        'done',
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert into public.doctor_profiles
    INSERT INTO public.doctor_profiles (
        doctor_id,
        specialty,
        clinic_name,
        bio,
        years_experience,
        consultation_price_mxn,
        address_text,
        created_at,
        updated_at
    )
    VALUES (
        new_doctor_id,
        'Cardiología',
        'Centro Médico Nacional',
        'Especialista en cirugía cardiovascular con más de 10 años de experiencia.',
        12,
        800,
        'Av. Cuauhtémoc 330, Doctores, CDMX',
        now(),
        now()
    )
    ON CONFLICT (doctor_id) DO NOTHING;

END $$;
