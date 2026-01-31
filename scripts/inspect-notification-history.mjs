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

async function main() {
  const repoRoot = process.cwd();
  const envPath = path.join(repoRoot, '.env.local');
  const env = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await supabase.from('notification_history').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  console.log('Row keys:', data?.[0] ? Object.keys(data[0]) : []);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

