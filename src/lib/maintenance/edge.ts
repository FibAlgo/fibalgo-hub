import { Redis } from '@upstash/redis';
import type { MaintenanceState } from './state';
import { SUPABASE_MAINTENANCE_KEY } from './state';

const CACHE_TTL_MS = 10_000;
let cached: { value: MaintenanceState | null; expiresAt: number } = { value: null, expiresAt: 0 };

const EDGE_PING_TIMEOUT_MS = 900;
// Cron runs every 5 minutes; treat Redis state as stale only well after that.
// Otherwise we'd ping Supabase too often and potentially flap.
const STALE_AFTER_MS = 12 * 60_000;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function getMaintenanceStateCached(): Promise<MaintenanceState | null> {
  const now = Date.now();
  if (now < cached.expiresAt) return cached.value;

  // Manual override for emergencies
  const forced = (process.env.MAINTENANCE_MODE || '').trim().toLowerCase();
  if (forced === '1' || forced === 'true' || forced === 'on') {
    const forcedState: MaintenanceState = { active: true, updatedAt: now, reason: 'forced' };
    cached = { value: forcedState, expiresAt: now + CACHE_TTL_MS };
    return forcedState;
  }

  const redis = getRedis();
  // If Redis isn't configured, fall back to a fast Supabase ping.
  if (!redis) {
    const fallback = await fastSupabasePing(now);
    cached = { value: fallback, expiresAt: now + CACHE_TTL_MS };
    return fallback;
  }

  try {
    const value = await redis.get(SUPABASE_MAINTENANCE_KEY);
    const state = (typeof value === 'object' && value)
      ? (value as any)
      : (typeof value === 'string' ? JSON.parse(value) : null);

    let normalized = state && typeof state.active === 'boolean' && typeof state.updatedAt === 'number'
      ? ({
          active: state.active,
          updatedAt: state.updatedAt,
          activeUntil: typeof state.activeUntil === 'number' ? state.activeUntil : undefined,
          reason: state.reason,
        } as MaintenanceState)
      : null;

    // Sticky: if activeUntil is in the future, keep maintenance active.
    if (normalized?.activeUntil && normalized.activeUntil > now) {
      normalized = { ...normalized, active: true };
    }

    // If missing or stale, do a quick Supabase ping to avoid "maintenance appears later".
    if (!normalized || now - normalized.updatedAt > STALE_AFTER_MS) {
      const pinged = await fastSupabasePing(now);
      normalized = pinged ?? normalized;
    }

    cached = { value: normalized, expiresAt: now + CACHE_TTL_MS };
    return normalized;
  } catch {
    const fallback = await fastSupabasePing(now);
    cached = { value: fallback, expiresAt: now + CACHE_TTL_MS };
    return fallback;
  }
}

async function fastSupabasePing(now: number): Promise<MaintenanceState | null> {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!base || !anonKey) return { active: true, updatedAt: now, reason: 'supabase_env_missing' };

  try {
    const res = await fetch(`${base}/auth/v1/settings`, {
      method: 'GET',
      headers: { apikey: anonKey, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(EDGE_PING_TIMEOUT_MS),
    });
    const up = res.status < 500;
    return up ? { active: false, updatedAt: now } : { active: true, updatedAt: now, reason: `supabase_${res.status}` };
  } catch (e: any) {
    const reason = e?.name === 'TimeoutError' ? 'supabase_timeout' : 'supabase_fetch_error';
    return { active: true, updatedAt: now, reason };
  }
}
