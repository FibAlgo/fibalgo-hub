-- Add sound_type column to notification_preferences
-- Note: This runs before notification_system migration, so use DO block to check table existence
DO $$
BEGIN
  -- Only add column if table exists (may be created in a later migration)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notification_preferences'
  ) THEN
    -- Add sound_type column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'notification_preferences' 
        AND column_name = 'sound_type'
    ) THEN
      ALTER TABLE notification_preferences ADD COLUMN sound_type TEXT DEFAULT 'default';
      COMMENT ON COLUMN notification_preferences.sound_type IS 'Type of notification sound: default, chime, bell, pop, alert';
    END IF;
  END IF;
END $$;
