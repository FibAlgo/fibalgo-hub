-- ═══════════════════════════════════════════════════════════════
-- ADVANCED NOTIFICATION SYSTEM - Database Migration
-- Comprehensive notification preferences and alert system
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. USER NOTIFICATION PREFERENCES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Global settings
  notifications_enabled BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT false,
  
  -- News notification preferences
  news_breaking BOOLEAN DEFAULT true,
  news_high_impact BOOLEAN DEFAULT true,
  news_medium_impact BOOLEAN DEFAULT true,
  news_low_impact BOOLEAN DEFAULT false,
  news_crypto BOOLEAN DEFAULT true,
  news_forex BOOLEAN DEFAULT true,
  news_stocks BOOLEAN DEFAULT true,
  news_commodities BOOLEAN DEFAULT true,
  news_indices BOOLEAN DEFAULT true,
  news_economic BOOLEAN DEFAULT true,
  news_central_bank BOOLEAN DEFAULT true,
  news_geopolitical BOOLEAN DEFAULT false,
  
  -- Signal notifications
  signal_strong_buy BOOLEAN DEFAULT true,
  signal_buy BOOLEAN DEFAULT true,
  signal_sell BOOLEAN DEFAULT true,
  signal_strong_sell BOOLEAN DEFAULT true,
  
  -- Calendar notifications
  calendar_enabled BOOLEAN DEFAULT true,
  calendar_high_impact BOOLEAN DEFAULT true,
  calendar_medium_impact BOOLEAN DEFAULT true,
  calendar_low_impact BOOLEAN DEFAULT false,
  calendar_reminder_minutes INTEGER DEFAULT 15,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone TEXT DEFAULT 'UTC',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. PRICE ALERTS (Per-asset alerts)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Asset info
  symbol TEXT NOT NULL,
  asset_name TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'forex', 'stocks', 'commodities', 'indices')),
  
  -- Alert conditions
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'price_above',
    'price_below',
    'percent_change_up',
    'percent_change_down',
    'volume_spike',
    'breakout_up',
    'breakout_down'
  )),
  target_value DECIMAL(20,8) NOT NULL,
  current_value DECIMAL(20,8),
  timeframe TEXT DEFAULT '1h' CHECK (timeframe IN ('5m', '15m', '1h', '4h', '1d', '1w')),
  
  -- Alert status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'expired', 'disabled')),
  triggered_at TIMESTAMPTZ,
  triggered_value DECIMAL(20,8),
  
  -- Settings
  repeat_alert BOOLEAN DEFAULT false,
  cooldown_minutes INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 3. CALENDAR EVENT ALERTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.calendar_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Event info
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_country TEXT,
  event_impact TEXT CHECK (event_impact IN ('high', 'medium', 'low')),
  event_datetime TIMESTAMPTZ NOT NULL,
  
  -- Alert settings
  reminder_minutes INTEGER DEFAULT 15,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. WATCHLIST (Assets user is tracking)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  symbol TEXT NOT NULL,
  asset_name TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'forex', 'stocks', 'commodities', 'indices')),
  
  -- Notification settings for this asset
  notify_price_change BOOLEAN DEFAULT true,
  notify_news BOOLEAN DEFAULT true,
  notify_signals BOOLEAN DEFAULT true,
  price_change_threshold DECIMAL(5,2) DEFAULT 5.00, -- Percentage
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, symbol)
);

-- ═══════════════════════════════════════════════════════════════
-- 5. NOTIFICATION HISTORY
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Notification type
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'news',
    'signal',
    'price_alert',
    'calendar',
    'system',
    'announcement'
  )),
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  action_url TEXT,
  
  -- Related data
  related_id TEXT, -- news_id, signal_id, alert_id, etc.
  related_type TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist for existing tables
ALTER TABLE notification_history
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_status ON price_alerts(status);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_calendar_alerts_user ON calendar_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_alerts_event ON calendar_alerts(event_datetime);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_unread ON notification_history(user_id, is_read) WHERE is_read = false;

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_preferences'
      AND policyname = 'Users can view own preferences'
  ) THEN
    CREATE POLICY "Users can view own preferences" ON notification_preferences
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_preferences'
      AND policyname = 'Users can update own preferences'
  ) THEN
    CREATE POLICY "Users can update own preferences" ON notification_preferences
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_preferences'
      AND policyname = 'Users can insert own preferences'
  ) THEN
    CREATE POLICY "Users can insert own preferences" ON notification_preferences
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Price alerts policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'price_alerts'
      AND policyname = 'Users can view own alerts'
  ) THEN
    CREATE POLICY "Users can view own alerts" ON price_alerts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'price_alerts'
      AND policyname = 'Users can create own alerts'
  ) THEN
    CREATE POLICY "Users can create own alerts" ON price_alerts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'price_alerts'
      AND policyname = 'Users can update own alerts'
  ) THEN
    CREATE POLICY "Users can update own alerts" ON price_alerts
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'price_alerts'
      AND policyname = 'Users can delete own alerts'
  ) THEN
    CREATE POLICY "Users can delete own alerts" ON price_alerts
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Calendar alerts policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_alerts'
      AND policyname = 'Users can view own calendar alerts'
  ) THEN
    CREATE POLICY "Users can view own calendar alerts" ON calendar_alerts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_alerts'
      AND policyname = 'Users can create own calendar alerts'
  ) THEN
    CREATE POLICY "Users can create own calendar alerts" ON calendar_alerts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_alerts'
      AND policyname = 'Users can update own calendar alerts'
  ) THEN
    CREATE POLICY "Users can update own calendar alerts" ON calendar_alerts
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_alerts'
      AND policyname = 'Users can delete own calendar alerts'
  ) THEN
    CREATE POLICY "Users can delete own calendar alerts" ON calendar_alerts
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Watchlist policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_watchlist'
      AND policyname = 'Users can view own watchlist'
  ) THEN
    CREATE POLICY "Users can view own watchlist" ON user_watchlist
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_watchlist'
      AND policyname = 'Users can manage own watchlist'
  ) THEN
    CREATE POLICY "Users can manage own watchlist" ON user_watchlist
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Notification history policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_history'
      AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" ON notification_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_history'
      AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON notification_history
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Function to get or create notification preferences
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(p_user_id UUID)
RETURNS notification_preferences AS $$
DECLARE
  prefs notification_preferences;
BEGIN
  SELECT * INTO prefs FROM notification_preferences WHERE user_id = p_user_id;
  
  IF prefs IS NULL THEN
    INSERT INTO notification_preferences (user_id) VALUES (p_user_id)
    RETURNING * INTO prefs;
  END IF;
  
  RETURN prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM notification_history 
    WHERE user_id = p_user_id AND is_read = false AND is_dismissed = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_history 
  SET is_read = true, read_at = NOW() 
  WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_updated_at
  BEFORE UPDATE ON user_watchlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE notification_preferences IS 'User notification preferences for news, signals, and calendar';
COMMENT ON TABLE price_alerts IS 'User-defined price alerts for specific assets';
COMMENT ON TABLE calendar_alerts IS 'User-subscribed calendar event reminders';
COMMENT ON TABLE user_watchlist IS 'User watchlist with per-asset notification settings';
COMMENT ON TABLE notification_history IS 'History of all notifications sent to users';

-- ═══════════════════════════════════════════════════════════════
-- 6. PUSH NOTIFICATION SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Push subscription data
  endpoint TEXT NOT NULL,
  expiration_time BIGINT,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  
  -- Device info
  user_agent TEXT,
  device_name TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, endpoint)
);

-- Index for push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(user_id) WHERE is_active = true;

-- RLS for push subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions for each user device';
