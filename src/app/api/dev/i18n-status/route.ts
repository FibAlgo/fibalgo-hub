import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const statusPath = path.join(process.cwd(), '.i18n-status.json');
    
    if (!fs.existsSync(statusPath)) {
      return NextResponse.json({
        status: 'no-status',
        message: 'No status file found. Run the i18n sync script first.',
      });
    }

    const raw = fs.readFileSync(statusPath, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to read status file',
    });
  }
}
