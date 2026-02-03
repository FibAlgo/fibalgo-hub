import { NextResponse } from 'next/server';
import { readMaintenanceState, writeMaintenanceState } from '@/lib/maintenance/state';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Keep the key alive longer than the 5-minute cron interval.
const TTL_SECONDS = 15 * 60;
const TIMEOUT_MS = 1200;
const MIN_ACTIVE_MS = 2 * 60_000;

async function pingSupabase(): Promise<{ ok: boolean; reason?: string }> {
  const now = Date.now();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, reason: 'supabase_env_missing' };

  const base = SUPABASE_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/auth/v1/settings`, {
      method: 'GET',
      headers: { apikey: SUPABASE_ANON_KEY, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Treat any non-5xx as reachable.
    const up = res.status < 500;
    return up ? { ok: true } : { ok: false, reason: `supabase_${res.status}` };
  } catch (e: any) {
    const reason = e?.name === 'TimeoutError' ? 'supabase_timeout' : 'supabase_fetch_error';
    return { ok: false, reason };
  }
}

export async function GET() {
  const now = Date.now();
  let state = await readMaintenanceState();

  // If we believe we're in maintenance, double-check Supabase and clear quickly when it's back.
  // This prevents users getting stuck until the next cron tick.
  if (state?.active === true) {
    const probe = await pingSupabase();
    if (probe.ok) {
      await writeMaintenanceState({ active: false, updatedAt: now, activeUntil: 0 }, TTL_SECONDS);
      state = { active: false, updatedAt: now, activeUntil: 0 };
    }
  }

  // If state is missing (e.g. key expired or Redis cold), probe once to provide a best-effort answer.
  if (!state) {
    const probe = await pingSupabase();
    if (probe.ok) {
      await writeMaintenanceState({ active: false, updatedAt: now, activeUntil: 0 }, TTL_SECONDS);
      state = { active: false, updatedAt: now, activeUntil: 0 };
    } else {
      const reason = probe.reason ?? 'supabase_down';
      await writeMaintenanceState(
        { active: true, updatedAt: now, activeUntil: now + MIN_ACTIVE_MS, reason },
        TTL_SECONDS
      );
      state = { active: true, updatedAt: now, activeUntil: now + MIN_ACTIVE_MS, reason };
    }
  }

  return NextResponse.json({
    maintenance: state.active === true,
    updatedAt: state.updatedAt ?? null,
    checkedAt: now,
    reason: state.reason ?? null,
  });
}
