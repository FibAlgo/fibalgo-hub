import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, sanitizeDbError, supabaseAdmin } from '@/lib/api/auth';

/**
 * 🔒 SECURITY: Admin SQL Execution Endpoint
 * - DISABLED by default in production
 * - Requires super_admin role (not just admin)
 * - Only allows SELECT queries (read-only)
 * - Logs all attempts
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Production'da varsayılan kapalı – açmak için ALLOW_ADMIN_EXEC_SQL=true
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_EXEC_SQL !== 'true') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🔒 SECURITY: Only super_admin can execute SQL
    if (user.role !== 'super_admin') {
      console.warn(`[SECURITY] Non-super_admin attempted SQL execution: ${user.id}`);
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
    }

    // 🔒 SECURITY: Only allow SELECT queries (read-only)
    const sqlUpper = sql.trim().toUpperCase();
    if (!sqlUpper.startsWith('SELECT')) {
      console.warn(`[SECURITY] Non-SELECT SQL blocked from user ${user.id}: ${sql.substring(0, 100)}`);
      return NextResponse.json({ error: 'Only SELECT queries are allowed' }, { status: 403 });
    }

    // 🔒 SECURITY: Block dangerous patterns even in SELECT (subqueries)
    const dangerousPatterns = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE', 'CREATE', 'EXEC'];
    for (const pattern of dangerousPatterns) {
      if (sqlUpper.includes(pattern)) {
        console.warn(`[SECURITY] Dangerous SQL pattern blocked from user ${user.id}: ${pattern}`);
        return NextResponse.json({ error: 'Query contains disallowed operations' }, { status: 403 });
      }
    }

    // Log the query attempt
    console.log(`[Admin SQL] User ${user.id} executing: ${sql.substring(0, 200)}`);

    // Execute the SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      console.error('SQL execution error:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'exec_sql') }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
