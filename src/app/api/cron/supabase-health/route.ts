import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/api/auth';
import { writeMaintenanceState } from '@/lib/maintenance/state';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cron runs every 5 minutes; keep the Redis key alive longer than that to avoid
// the Edge layer treating it as stale/missing and pinging Supabase on every request.
const TTL_SECONDS = 15 * 60;
const TIMEOUT_MS = 1500;
const MIN_ACTIVE_MS = 2 * 60_000;

async function ping(url: string, headers: Record<string, string>): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // Treat any non-5xx response as "reachable".
    const reachable = res.status < 500;
    return { ok: reachable, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e?.name === 'TimeoutError' ? 'timeout' : 'fetch_error' };
  }
}

export async function GET(request: Request) {
  const cronAuth = verifyCronAuth(request);
  if (!cronAuth.authorized) {
    return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.statusCode || 401 });
  }

  const now = Date.now();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    await writeMaintenanceState(
      { active: true, updatedAt: now, activeUntil: now + MIN_ACTIVE_MS, reason: 'supabase_env_missing' },
      TTL_SECONDS
    );
    return NextResponse.json({ ok: false, maintenance: true, reason: 'supabase_env_missing' });
  }

  const base = SUPABASE_URL.replace(/\/$/, '');
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    accept: 'application/json',
  };

  const [authPing, restPing] = await Promise.all([
    ping(`${base}/auth/v1/settings`, { apikey: SUPABASE_ANON_KEY, accept: 'application/json' }),
    ping(`${base}/rest/v1/`, headers),
  ]);

  const ok = authPing.ok || restPing.ok;

  if (!ok) {
    const reason = `down:auth=${authPing.status ?? authPing.error ?? 'err'} rest=${restPing.status ?? restPing.error ?? 'err'}`;
    await writeMaintenanceState({ active: true, updatedAt: now, activeUntil: now + MIN_ACTIVE_MS, reason }, TTL_SECONDS);
    return NextResponse.json({ ok: false, maintenance: true, reason, authPing, restPing });
  }

  await writeMaintenanceState({ active: false, updatedAt: now, activeUntil: 0 }, TTL_SECONDS);
  return NextResponse.json({ ok: true, maintenance: false, authPing, restPing });
}
