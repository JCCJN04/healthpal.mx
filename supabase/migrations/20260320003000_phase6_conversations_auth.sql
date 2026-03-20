-- Restrict conversations insert
DROP POLICY IF EXISTS "conv_insert" ON public.conversations;

CREATE POLICY "conv_insert"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
