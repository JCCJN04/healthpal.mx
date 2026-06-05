-- Migration: account_merge_tokens
-- Replaces the instant email-reassign flow in merge-preregistered-account
-- with a time-limited consent token that the user must confirm via email.

CREATE TABLE IF NOT EXISTS public.account_merge_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid_a        UUID        NOT NULL,  -- pre-registered account (owns WhatsApp docs)
  uuid_b        UUID        NOT NULL,  -- authenticated user initiating the merge
  phone         TEXT        NOT NULL,  -- the phone number linking uuid_a
  token_hash    TEXT        NOT NULL UNIQUE, -- SHA-256(rawToken) hex — never store raw
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only service role can read/write this table.
ALTER TABLE public.account_merge_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.account_merge_tokens
  USING (false) WITH CHECK (false);

-- Efficient lookups
CREATE INDEX ON public.account_merge_tokens(token_hash);
CREATE INDEX ON public.account_merge_tokens(uuid_b, expires_at);

-- Auto-remove tokens older than 24 hours (Supabase cron or pg_cron)
-- Add this to your pg_cron schedule:
--   SELECT cron.schedule('0 * * * *', $$DELETE FROM public.account_merge_tokens WHERE expires_at < NOW() - INTERVAL '24 hours'$$);

-- ── rate_limit_buckets (used by ai-proxy) ─────────────────────────────────────
-- Created here since it is a shared infrastructure table.

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key       TEXT        PRIMARY KEY,
  count     INT         NOT NULL DEFAULT 0,
  reset_at  TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.rate_limit_buckets
  USING (false) WITH CHECK (false);

-- Atomic increment function used by ai-proxy
CREATE OR REPLACE FUNCTION public.increment_rate_limit_bucket(
  p_key      TEXT,
  p_reset_at TIMESTAMPTZ
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Reset bucket if window has passed, then increment
  UPDATE rate_limit_buckets
  SET
    count    = CASE WHEN reset_at <= NOW() THEN 1 ELSE count + 1 END,
    reset_at = CASE WHEN reset_at <= NOW() THEN p_reset_at ELSE reset_at END
  WHERE key = p_key
  RETURNING count INTO v_count;

  IF NOT FOUND THEN
    INSERT INTO rate_limit_buckets(key, count, reset_at)
    VALUES (p_key, 1, p_reset_at)
    ON CONFLICT (key) DO UPDATE
      SET count    = CASE WHEN rate_limit_buckets.reset_at <= NOW() THEN 1 ELSE rate_limit_buckets.count + 1 END,
          reset_at = CASE WHEN rate_limit_buckets.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE rate_limit_buckets.reset_at END
    RETURNING rate_limit_buckets.count INTO v_count;
  END IF;

  RETURN COALESCE(v_count, 1);
END;
$$;
