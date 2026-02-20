-- =============================================================
-- Security Hardening Migration
-- Date: 2026-02-19
-- Purpose: Fix critical RLS and RPC security issues found in audit
-- =============================================================

-- =============================================
-- 1. CRITICAL: Fix conversation_participants INSERT policy
--    Old: WITH CHECK (true) — anyone can add anyone to conversations
--    New: Only allow adding yourself as participant
-- =============================================
DROP POLICY IF EXISTS "participants_insert_authenticated" ON conversation_participants;
CREATE POLICY "participants_insert_own_only"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- 2. HIGH: Restrict conversations INSERT policy
--    Old: WITH CHECK (true) — anyone can create conversations
--    New: Only authenticated users, enforced via RPC
-- =============================================
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
CREATE POLICY "conversations_insert_authenticated"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
-- NOTE: Conversation creation should ideally only happen through
-- start_new_conversation() RPC. The policy remains permissive because
-- the RPC uses SECURITY DEFINER. Consider removing direct INSERT
-- access in a future iteration if RPC is the only creation path.

-- =============================================
-- 3. HIGH: Fix mark_conversation_read() to use auth.uid()
--    Old: Accepts p_user_id parameter (any user can mark others' conversations)
--    New: Uses auth.uid() internally
-- =============================================
DROP FUNCTION IF EXISTS mark_conversation_read(uuid, uuid);
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security: Always use auth.uid() regardless of p_user_id parameter
  -- p_user_id is kept for API compatibility but ignored
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

-- =============================================
-- 4. HIGH: Fix get_unread_total() to use auth.uid()
--    Old: Accepts p_user_id parameter (information leak)
--    New: Uses auth.uid() internally
-- =============================================
DROP FUNCTION IF EXISTS get_unread_total(uuid);
CREATE OR REPLACE FUNCTION get_unread_total(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  total bigint;
BEGIN
  -- Security: Always use auth.uid() regardless of p_user_id parameter
  SELECT COALESCE(SUM(unread), 0) INTO total
  FROM (
    SELECT COUNT(*) AS unread
    FROM messages m
    JOIN conversation_participants cp
      ON cp.conversation_id = m.conversation_id
      AND cp.user_id = auth.uid()
    WHERE m.sender_id != auth.uid()
      AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
  ) sub;

  RETURN total;
END;
$$;

-- =============================================
-- 5. HIGH: Fix get_folder_item_count() to check ownership
--    Old: No ownership check — any user can enumerate any folder
--    New: Only count items in folders owned by the caller
-- =============================================
DROP FUNCTION IF EXISTS get_folder_item_count(uuid);
CREATE OR REPLACE FUNCTION get_folder_item_count(p_folder_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  item_count bigint;
BEGIN
  -- Security: Verify folder belongs to the calling user
  IF NOT EXISTS (
    SELECT 1 FROM folders
    WHERE id = p_folder_id AND owner_id = auth.uid()
  ) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO item_count
  FROM documents
  WHERE folder_id = p_folder_id AND owner_id = auth.uid();

  RETURN item_count;
END;
$$;

-- =============================================
-- 6. HIGH: Fix get_conversation_between_users() to require caller participation
--    Old: Any user can query if any two users share a conversation
--    New: Caller must be one of the two users
-- =============================================
DROP FUNCTION IF EXISTS get_conversation_between_users(uuid, uuid);
CREATE OR REPLACE FUNCTION get_conversation_between_users(user_a uuid, user_b uuid)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Security: Caller must be one of the participants
  IF auth.uid() != user_a AND auth.uid() != user_b THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cp1.conversation_id AS id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user_a
    AND cp2.user_id = user_b;
END;
$$;

-- =============================================
-- 7. MEDIUM: Add INSERT/UPDATE policies for doctor_profiles
--    Doctors need to manage their own profiles during onboarding
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'doctor_profiles_insert_own'
    AND tablename = 'doctor_profiles'
  ) THEN
    CREATE POLICY "doctor_profiles_insert_own"
      ON doctor_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (doctor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'doctor_profiles_update_own'
    AND tablename = 'doctor_profiles'
  ) THEN
    CREATE POLICY "doctor_profiles_update_own"
      ON doctor_profiles
      FOR UPDATE
      TO authenticated
      USING (doctor_id = auth.uid())
      WITH CHECK (doctor_id = auth.uid());
  END IF;
END $$;

-- =============================================
-- 8. Add storage policies for documents bucket if missing
-- =============================================
DO $$
BEGIN
  -- Create documents bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

  -- Drop existing policies if they exist, then recreate
  DROP POLICY IF EXISTS "documents_select_own" ON storage.objects;
  DROP POLICY IF EXISTS "documents_insert_own" ON storage.objects;
  DROP POLICY IF EXISTS "documents_update_own" ON storage.objects;
  DROP POLICY IF EXISTS "documents_delete_own" ON storage.objects;

EXCEPTION WHEN OTHERS THEN
  -- Bucket may already exist with different state; continue
  NULL;
END $$;

-- Documents storage: Only owner can access their files
CREATE POLICY "documents_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
