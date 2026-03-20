-- Phase 5 patch: restore chat counterpart visibility without exposing unrelated participants.
-- Allows authenticated users to read conversation_participants rows only for conversations
-- where they are already participants.

DROP POLICY IF EXISTS "cp_select_conversation_scope" ON public.conversation_participants;

CREATE POLICY "cp_select_conversation_scope"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(conversation_id));
