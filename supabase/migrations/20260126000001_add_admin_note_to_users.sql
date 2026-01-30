-- Add admin-only note field on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_note TEXT;
