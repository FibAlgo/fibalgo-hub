-- Add full_name_last_changed column to track name change cooldown
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name_last_changed TIMESTAMPTZ DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.users.full_name_last_changed IS 'Timestamp of last full name change. Users can only change name every 7 days.';
