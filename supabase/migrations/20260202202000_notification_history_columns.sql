-- Ensure notification_history has all columns required by newsNotifications.ts
-- PGRST204: schema cache / table created before full migration
-- Run each ADD COLUMN separately (IF NOT EXISTS per column)

ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'system';
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS related_id TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS related_type TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
