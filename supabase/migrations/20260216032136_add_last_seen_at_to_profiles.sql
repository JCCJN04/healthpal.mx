-- Add last_seen_at to profiles as requested
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Ensure RLS allows reading this column (it's already true for the whole table)
-- But let's be explicit about who can update it
-- Actually, users should only update their own profiles.
-- The existing policies should already cover this.
