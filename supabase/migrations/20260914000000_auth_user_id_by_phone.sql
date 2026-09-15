-- Helper RPC for the whatsapp-webhook edge function.
-- Resolves an auth user ID by phone directly from auth.users,
-- bypassing the 1000-user limit of auth.admin.listUsers().
-- SECURITY DEFINER so the service-role caller can query auth schema.
CREATE OR REPLACE FUNCTION auth_user_id_by_phone(phone_variants text[])
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE phone = ANY(phone_variants) LIMIT 1;
$$;
