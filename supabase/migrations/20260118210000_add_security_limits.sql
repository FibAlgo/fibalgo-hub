-- Add security limit columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_changed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS password_change_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS password_change_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Add comment for documentation
COMMENT ON COLUMN users.email_changed_at IS 'Last email change timestamp - can only change once per 30 days';
COMMENT ON COLUMN users.password_change_count IS 'Daily password change count - max 3 per day';
COMMENT ON COLUMN users.password_change_reset_at IS 'When password change count was last reset';
