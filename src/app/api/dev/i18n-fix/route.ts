import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const cwd = process.cwd();
    const statusPath = path.join(cwd, '.i18n-status.json');
    const enPath = path.join(cwd, 'messages', 'en.json');
    const scriptPath = path.join(cwd, 'scripts', 'sync-translations.mjs');

    // Check if watcher is running by looking at status file
    let watcherRunning = false;
    try {
      if (fs.existsSync(statusPath)) {
        const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        // Watcher is running if status is 'watching' and was updated recently (within 60s)
        if (status.status === 'watching' && status.updatedAt) {
          const age = Date.now() - new Date(status.updatedAt).getTime();
          watcherRunning = age < 60000;
        }
      }
    } catch { /* ignore */ }

    if (watcherRunning) {
      // Touch en.json to trigger the watcher
      const content = fs.readFileSync(enPath, 'utf8');
      fs.writeFileSync(enPath, content, 'utf8');
      return NextResponse.json({
        success: true,
        message: 'Triggered watcher — sync will start from dev terminal.',
      });
    }

    // No watcher — reset status file first, then run script directly via exec
    // exec runs in the same Node.js process context (not detached),
    // so it won't cause the "frozen separate process" issue.
    const resetStatus = {
      status: 'syncing',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      currentLang: null, currentLangName: null,
      langProgress: 0, langTotal: 29,
      batchProgress: 0, batchTotal: 0,
      keysTranslated: 0, keysAdded: 0, keysRemoved: 0,
      totalKeys: 0, totalSections: 0,
      completedLangs: [], errors: [], parallelActive: [],
      totalBatchesAll: 0, completedBatchesAll: 0,
    };
    fs.writeFileSync(statusPath, JSON.stringify(resetStatus, null, 2), 'utf8');

    // Run the script — exec is non-blocking, response returns immediately
    exec(`node "${scriptPath}"`, {
      cwd,
      env: { ...process.env },
      timeout: 600000, // 10 min max
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('[i18n-fix] Script error:', error.message);
      }
      if (stdout) console.log('[i18n-fix]', stdout.slice(-500));
      if (stderr) console.error('[i18n-fix stderr]', stderr.slice(-300));
    });

    return NextResponse.json({
      success: true,
      message: 'Sync + translate started directly. Watch the widget for progress.',
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to start sync',
    }, { status: 500 });
  }
}
