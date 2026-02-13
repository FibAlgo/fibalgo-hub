-- ══════════════════════════════════════════════════════════════════
-- Reset ALL notification_preferences to match new simplified UI
--
-- New UI has only 4 toggles:
--   1. Breaking News        → news_breaking
--   2. Market News           → news_high_impact + news_medium_impact + all categories
--   3. Trading Signals       → signal_strong_buy/buy/sell/strong_sell (all together)
--   4. Calendar High Impact  → calendar_enabled + calendar_high_impact only
--
-- Old granular settings (per-category, per-impact, per-signal) are removed
-- by resetting every row to clean defaults.
-- ══════════════════════════════════════════════════════════════════

UPDATE public.notification_preferences SET
  -- Keep global & delivery settings as-is (don't touch notifications_enabled, email_notifications, push_notifications, sound_enabled, sound_type)

  -- News: Breaking ON, market news (high+medium) ON, low OFF
  news_breaking       = true,
  news_high_impact    = true,
  news_medium_impact  = true,
  news_low_impact     = false,

  -- All asset categories ON (controlled together by "Market News" toggle)
  news_crypto         = true,
  news_forex          = true,
  news_stocks         = true,
  news_commodities    = true,
  news_indices        = true,
  news_economic       = true,
  news_central_bank   = true,
  news_geopolitical   = true,

  -- All signals ON (controlled together by "Trading Signals" toggle)
  signal_strong_buy   = true,
  signal_buy          = true,
  signal_sell         = true,
  signal_strong_sell  = true,

  -- Calendar: only high impact, medium/low OFF
  calendar_enabled       = true,
  calendar_high_impact   = true,
  calendar_medium_impact = false,
  calendar_low_impact    = false,
  calendar_reminder_minutes = 15,

  -- Quiet hours: keep user's existing settings (don't touch)
  -- quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone

  updated_at = now();
