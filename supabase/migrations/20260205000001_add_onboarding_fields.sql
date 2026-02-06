-- Add onboarding tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS profiles_onboarding_idx 
ON public.profiles(onboarding_completed);

-- Allow users to update their own onboarding status
-- (This is already covered by existing policies, but being explicit)
