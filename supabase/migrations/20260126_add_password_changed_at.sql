-- Add password_changed_at column for 24-hour cooldown tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN users.password_changed_at IS 'Last password change timestamp - can only change once per 24 hours';
