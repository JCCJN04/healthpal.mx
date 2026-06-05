-- Enable RLS on whatsapp_reply_dedup.
-- Table written only by server-side Edge Functions via service role key.
-- No client-side policies needed — all anon/authenticated client access blocked.
ALTER TABLE public.whatsapp_reply_dedup ENABLE ROW LEVEL SECURITY;
