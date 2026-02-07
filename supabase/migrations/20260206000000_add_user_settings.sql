-- Migration: Add user_settings table for preferences
-- This stores notification preferences and other user settings

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  appointment_reminders boolean NOT NULL DEFAULT true,
  whatsapp_notifications boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add RLS policies for user_settings
-- Users can only read and update their own settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create default settings for existing users
INSERT INTO public.user_settings (user_id, email_notifications, appointment_reminders, whatsapp_notifications)
SELECT id, true, true, false
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE public.user_settings IS 'User notification and preference settings';
COMMENT ON COLUMN public.user_settings.email_notifications IS 'Receive email notifications for general updates';
COMMENT ON COLUMN public.user_settings.appointment_reminders IS 'Receive appointment reminder notifications';
COMMENT ON COLUMN public.user_settings.whatsapp_notifications IS 'Receive WhatsApp notifications (placeholder for future feature)';
