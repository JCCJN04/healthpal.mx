-- Helper RPC for the whatsapp-webhook edge function.
-- Resolves an auth user ID by email directly from auth.users,
-- bypassing the 1000-user limit of auth.admin.listUsers().
-- SECURITY DEFINER so the service-role caller can query auth schema.
CREATE OR REPLACE FUNCTION auth_user_id_by_email(search_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(search_email) LIMIT 1;
$$;
