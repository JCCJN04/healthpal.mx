-- =============================================================
-- Fix: Defer profile creation until email is verified
-- Date: 2026-02-24
-- Purpose: Prevent unverified signups from creating profiles rows.
--          Profile is now created only when email_confirmed_at is set.
-- =============================================================

-- 1. Replace handle_new_user: skip profile INSERT when email is NOT confirmed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create profile immediately if email is already confirmed
  -- (e.g. auto-confirm enabled, OAuth logins, or admin-created users)
  -- For email-confirmation flows, profile is created by handle_user_confirmed()
  IF new.email_confirmed_at IS NOT NULL THEN
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
      COALESCE(
        (new.raw_user_meta_data->>'role')::public.user_role,
        'patient'::public.user_role
      ),
      false,
      'role'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = COALESCE(
        (new.raw_user_meta_data->>'role')::public.user_role,
        profiles.role
      ),
      onboarding_completed = COALESCE(profiles.onboarding_completed, false),
      onboarding_step      = COALESCE(profiles.onboarding_step, 'role');
  END IF;

  RETURN new;
END $$;

-- 2. New function: create profile when email confirmation happens
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fire only when email_confirmed_at transitions from NULL → non-NULL
  IF old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL THEN
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
      COALESCE(
        (new.raw_user_meta_data->>'role')::public.user_role,
        'patient'::public.user_role
      ),
      false,
      'role'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = COALESCE(
        (new.raw_user_meta_data->>'role')::public.user_role,
        profiles.role
      ),
      onboarding_completed = COALESCE(profiles.onboarding_completed, false),
      onboarding_step      = COALESCE(profiles.onboarding_step, 'role');
  END IF;

  RETURN new;
END $$;

-- 3. Create the UPDATE trigger on auth.users (fires when Supabase confirms email)
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_confirmed();

-- 4. Clean up orphaned profiles: remove profiles for users who never verified
--    (email_confirmed_at IS NULL and no onboarding progress)
DELETE FROM public.profiles
WHERE id IN (
  SELECT p.id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email_confirmed_at IS NULL
    AND p.onboarding_completed = false
);
