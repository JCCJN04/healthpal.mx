-- Allow assistant to self-link: update pending rows where their email matches
CREATE POLICY "da_assistant_accept" ON doctor_assistants
  FOR UPDATE
  USING (
    assistant_email = (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    assistant_id = auth.uid()
    AND status = 'active'
  );
