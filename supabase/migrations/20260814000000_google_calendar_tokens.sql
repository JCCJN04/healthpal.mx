-- Google Calendar Tokens table for calendar integration
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    calendar_id TEXT NOT NULL DEFAULT 'primary',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT google_calendar_tokens_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own google calendar tokens"
    ON public.google_calendar_tokens
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own google calendar tokens"
    ON public.google_calendar_tokens
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
