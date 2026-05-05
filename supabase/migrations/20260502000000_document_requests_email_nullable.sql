-- Allow phone-only document requests (patient has no email / doctor only has WhatsApp)
-- NULL email: only fulfillable via WhatsApp webhook (not via web link)
-- Non-null email: fulfillable via web link OR WhatsApp webhook
ALTER TABLE document_requests ALTER COLUMN patient_email DROP NOT NULL;

-- The existing `patient_fulfill_request` UPDATE policy already handles null correctly:
-- NULL = (SELECT email FROM profiles WHERE id = auth.uid()) → evaluates to NULL → denied
-- so phone-only requests cannot be fulfilled via the web upload page, only via WhatsApp.
-- No policy changes needed.
