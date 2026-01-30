const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const out = [];
  const users = await supabase
    .from('users')
    .select('*')
    .limit(5);
  out.push(['users_sample', users]);

  try {
    const codes = await supabase
      .from('verification_codes')
      .select('id,email,code,expires_at,used_at,created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    out.push(['verification_codes', codes]);
  } catch (e) {
    out.push(['verification_codes_error', { error: e.message || String(e) }]);
  }

  for (const [label, { data, error, status }] of out) {
    console.log('\n---', label, 'status:', status);
    if (error) console.error('error:', error);
    else console.dir(data, { depth: 5 });
  }
}

main().catch((err) => {
  console.error('fatal', err);
  process.exit(1);
});
