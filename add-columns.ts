import pkg from 'pg';
const { Client } = pkg;

async function addVerificationColumns() {
  // Construct connection string from Supabase URL
  // Supabase connection string format: postgresql://postgres:[service_role_key]@[project_ref].supabase.co:5432/postgres
  const connectionString = `postgresql://postgres:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E@votjcpabuofvmghugkdq.supabase.co:5432/postgres`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add missing columns
    const queries = [
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_token TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;`
    ];

    for (const query of queries) {
      try {
        await client.query(query);
        console.log(`Executed: ${query.split('ADD COLUMN')[1]?.trim() || query}`);
      } catch (err) {
        console.log(`Query failed (might be expected): ${query}`);
        console.log('Error:', err.message);
      }
    }

    // Backfill names
    try {
      await client.query(`
        UPDATE public.users
        SET name = COALESCE(name, full_name, split_part(email, '@', 1))
        WHERE name IS NULL;
      `);
      console.log('Backfilled names for existing users');
    } catch (err) {
      console.log('Backfill failed:', err.message);
    }

    // Test that columns exist
    const result = await client.query(`
      SELECT id, email, name, verification_token, verification_token_expires, email_verified
      FROM public.users
      LIMIT 1
    `);

    console.log('Columns now exist. Sample user:', result.rows[0]);

  } catch (err) {
    console.error('Database connection or query error:', err);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

addVerificationColumns();