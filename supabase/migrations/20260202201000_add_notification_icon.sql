-- Add icon to notification_history if missing (schema cache / older deployments)
-- PGRST204: "Could not find the 'icon' column of 'notification_history' in the schema cache"
ALTER TABLE public.notification_history
  ADD COLUMN IF NOT EXISTS icon TEXT;
