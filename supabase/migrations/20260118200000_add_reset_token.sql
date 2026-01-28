-- Migration: Add reset token fields to users table
-- Run this to add password reset token support

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;

-- Index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.users(reset_token) WHERE reset_token IS NOT NULL;
