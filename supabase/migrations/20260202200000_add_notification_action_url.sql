-- Add action_url to notification_history if missing (schema cache / older deployments)
-- PGRST204: "Could not find the 'action_url' column of 'notification_history' in the schema cache"
ALTER TABLE public.notification_history
  ADD COLUMN IF NOT EXISTS action_url TEXT;
