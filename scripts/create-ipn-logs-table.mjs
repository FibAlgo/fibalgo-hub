import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://votjcpabuofvmghugkdq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E'
);

async function main() {
  // First check if ipn_logs table already exists
  const { data: check, error: checkErr } = await supabase.from('ipn_logs').select('id').limit(1);
  
  if (!checkErr) {
    console.log('✅ ipn_logs table already exists');
    return;
  }

  console.log('Table does not exist yet, error:', checkErr.message);
  console.log('');
  console.log('⚠️  Please create the table manually in Supabase SQL Editor:');
  console.log('');
  console.log(`CREATE TABLE IF NOT EXISTS public.ipn_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Allow service role to insert
ALTER TABLE public.ipn_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.ipn_logs
  FOR ALL USING (true) WITH CHECK (true);
`);

  // Try inserting a test record anyway (in case it exists but select returned an error)
  const { error: insertErr } = await supabase.from('ipn_logs').insert({
    level: 'info',
    message: 'Table creation test',
    data: { test: true },
  });

  if (insertErr) {
    console.log('❌ Insert test failed:', insertErr.message);
  } else {
    console.log('✅ Insert test succeeded — table exists!');
  }
}

main().catch(console.error);
