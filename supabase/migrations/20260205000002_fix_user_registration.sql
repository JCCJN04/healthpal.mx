-- Fix user registration to properly handle role and onboarding fields

-- Update the handle_new_user function to extract role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role,
    onboarding_completed,
    onboarding_step
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'patient'::public.user_role),
    false,
    'role'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE((new.raw_user_meta_data->>'role')::public.user_role, profiles.role),
    onboarding_completed = COALESCE(profiles.onboarding_completed, false),
    onboarding_step = COALESCE(profiles.onboarding_step, 'role');

  RETURN new;
END $$;

-- Fix any existing profiles that may have been created without proper onboarding fields
UPDATE public.profiles 
SET 
  onboarding_completed = false,
  onboarding_step = 'role'
WHERE 
  onboarding_completed IS NULL 
  OR onboarding_step IS NULL;
