-- Add sound_type column to notification_preferences
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS sound_type TEXT DEFAULT 'default';

-- Add comment
COMMENT ON COLUMN notification_preferences.sound_type IS 'Type of notification sound: default, chime, bell, pop, alert';
