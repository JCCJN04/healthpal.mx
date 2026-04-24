-- Migration to allow users to delete their own account
-- This function runs with SECURITY DEFINER to have permission to delete from auth.users

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from auth.users
  -- This will cascade to public.profiles and all other tables with ON DELETE CASCADE
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
