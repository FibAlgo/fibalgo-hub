import { Redis } from '@upstash/redis';

export type MaintenanceState = {
  active: boolean;
  updatedAt: number;
  /** When active, keep maintenance at least until this time (ms since epoch). */
  activeUntil?: number;
  reason?: string;
};

export const SUPABASE_MAINTENANCE_KEY = 'maintenance:supabase';

export function getMaintenanceRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function readMaintenanceState(): Promise<MaintenanceState | null> {
  const redis = getMaintenanceRedis();
  if (!redis) return null;

  const value = await redis.get(SUPABASE_MAINTENANCE_KEY);
  if (!value) return null;

  if (typeof value === 'object' && value !== null) {
    const obj = value as any;
    if (typeof obj.active === 'boolean' && typeof obj.updatedAt === 'number') {
      return {
        active: obj.active,
        updatedAt: obj.updatedAt,
        activeUntil: typeof obj.activeUntil === 'number' ? obj.activeUntil : undefined,
        reason: obj.reason,
      };
    }
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed.active === 'boolean' && typeof parsed.updatedAt === 'number') {
        return {
          active: parsed.active,
          updatedAt: parsed.updatedAt,
          activeUntil: typeof parsed.activeUntil === 'number' ? parsed.activeUntil : undefined,
          reason: parsed.reason,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export async function writeMaintenanceState(state: MaintenanceState, ttlSeconds: number): Promise<void> {
  const redis = getMaintenanceRedis();
  if (!redis) return;

  await redis.set(SUPABASE_MAINTENANCE_KEY, state, { ex: ttlSeconds });
}
