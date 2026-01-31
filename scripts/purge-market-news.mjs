import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function parseDotEnv(content) {
  const out = {};
  for (const line of String(content || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

async function deleteAllBatched({ client, table, filter, batchSize = 1000 }) {
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = client.from(table).select('id').limit(batchSize);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`[${table}] select failed: ${error.message}`);
    const ids = (data || []).map((r) => r.id).filter(Boolean);
    if (ids.length === 0) break;

    let d = client.from(table).delete().in('id', ids);
    if (filter) d = filter(d);
    const { error: delError } = await d;
    if (delError) throw new Error(`[${table}] delete failed: ${delError.message}`);

    total += ids.length;
    if (ids.length < batchSize) break;
  }
  return total;
}

async function detectColumnFilter({ client }) {
  // Try to narrow deletes to news/signal only; fall back to full delete if schema differs.
  const tryCol = async (col) => {
    const { error } = await client.from('notification_history').select('id').eq(col, 'news').limit(1);
    if (!error) return true;
    if (String(error.message || '').includes('does not exist')) return false;
    // other errors (like RLS) shouldn't happen with service key, but treat as not supported
    return false;
  };

  if (await tryCol('notification_type')) {
    return (q) => q.in('notification_type', ['news', 'signal']);
  }
  if (await tryCol('related_type')) {
    return (q) => q.in('related_type', ['news', 'signal']);
  }
  return null;
}

async function main() {
  const repoRoot = process.cwd();
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.local not found at ${envPath}`);
  }

  const env = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Starting purge (irreversible).');

  // 1) Notifications related to news/signals (keep price_alert/calendar/system when possible)
  const notifFilter = await detectColumnFilter({ client: supabase });
  const notifDeleted = await deleteAllBatched({
    client: supabase,
    table: 'notification_history',
    filter: notifFilter || undefined,
    batchSize: 1000,
  });
  console.log(
    `Deleted notification_history${notifFilter ? ' (news/signal)' : ' (all)'}: ${notifDeleted}`
  );

  // 2) Signal performance rows
  const perfDeleted = await deleteAllBatched({
    client: supabase,
    table: 'signal_performance',
    batchSize: 1000,
  });
  console.log(`Deleted signal_performance: ${perfDeleted}`);

  // 3) News aggregate regime analyses
  const aggDeleted = await deleteAllBatched({
    client: supabase,
    table: 'news_aggregate_analyses',
    batchSize: 500,
  });
  console.log(`Deleted news_aggregate_analyses: ${aggDeleted}`);

  // 4) Main analyzed news table
  const newsDeleted = await deleteAllBatched({
    client: supabase,
    table: 'news_analyses',
    batchSize: 500,
  });
  console.log(`Deleted news_analyses: ${newsDeleted}`);

  // 5) Optional legacy table (usually unused in codebase)
  let cacheDeleted = 0;
  try {
    cacheDeleted = await deleteAllBatched({
      client: supabase,
      table: 'news_cache',
      batchSize: 500,
    });
    console.log(`Deleted news_cache: ${cacheDeleted}`);
  } catch (e) {
    console.log(`Skipped news_cache (table missing or not accessible): ${String(e.message || e)}`);
  }

  console.log('Purge complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

