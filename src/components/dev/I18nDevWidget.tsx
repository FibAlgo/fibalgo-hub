'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────

interface I18nStatus {
  status: 'idle' | 'watching' | 'syncing' | 'translating' | 'done' | 'error' | 'no-status';
  startedAt: string | null;
  updatedAt: string | null;
  currentLang: string | null;
  currentLangName: string | null;
  langProgress: number;
  langTotal: number;
  batchProgress: number;
  batchTotal: number;
  keysTranslated: number;
  keysAdded: number;
  keysRemoved: number;
  totalKeys: number;
  totalSections: number;
  completedLangs: string[];
  errors: string[];
  parallelActive?: string[];
  // Batch-level tracking (across ALL languages)
  totalBatchesAll?: number;
  completedBatchesAll?: number;
  // Round-by-round tracking
  currentRound?: number;
  totalRounds?: number;
  // Heartbeat for frozen detection
  lastHeartbeat?: string | null;
}

interface LangReport {
  lang: string;
  name: string;
  sections: number;
  missingSections: string[];
  missingKeys: number;
  extraKeys: number;
  untranslated: number;
  accepted: number;
  health: number;
}

interface AuditResult {
  timestamp: string;
  master: { keys: number; sections: number };
  summary: {
    totalLanguages: number;
    perfectLanguages: number;
    totalMissingKeys: number;
    totalExtraKeys: number;
    totalUntranslated: number;
    overallHealth: number;
    needsFix: boolean;
  };
  languages: LangReport[];
}

// ─── Constants ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  idle: '#6b7280', watching: '#3b82f6', syncing: '#f59e0b',
  translating: '#8b5cf6', done: '#10b981', error: '#ef4444',
  'no-status': '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  idle: '⏸ Idle', watching: '👁 Watching', syncing: '🔄 Syncing',
  translating: '🌍 Translating', done: '✅ Done', error: '❌ Error',
  'no-status': '⚪ No Script',
};

const FLAG_EMOJIS: Record<string, string> = {
  tr: '🇹🇷', es: '🇪🇸', de: '🇩🇪', fr: '🇫🇷', it: '🇮🇹',
  pt: '🇵🇹', nl: '🇳🇱', pl: '🇵🇱', ru: '🇷🇺', uk: '🇺🇦',
  ar: '🇸🇦', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
  hi: '🇮🇳', th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩', ms: '🇲🇾',
  sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮', no: '🇳🇴', cs: '🇨🇿',
  ro: '🇷🇴', hu: '🇭🇺', el: '🇬🇷', he: '🇮🇱', bn: '🇧🇩',
};

// ─── Main Component ──────────────────────────────────────────────────

export default function I18nDevWidget() {
  const [data, setData] = useState<I18nStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevStatusRef = useRef<string>('');

  // Admin check — widget only renders for admin users
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading

  // Heartbeat frozen detection
  const [isFrozen, setIsFrozen] = useState(false);

  // Audit state
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  // ── Admin check on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dev/i18n-admin', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setIsAdmin(json.isAdmin === true);
        } else {
          if (!cancelled) setIsAdmin(false);
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runAudit = async () => {
    setAuditLoading(true);
    setFixMessage(null);
    try {
      const res = await fetch('/api/dev/i18n-check', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setAudit(json);
        setShowAudit(true);
        setExpanded(true);
      }
    } catch { /* */ }
    setAuditLoading(false);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/dev/i18n-status', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'translating' && prevStatusRef.current !== 'translating') {
          setExpanded(true);
          setMinimized(false);
          setShowAudit(false);
        }
        // Auto-refresh audit after sync completes
        if (
          (json.status === 'done' || json.status === 'watching') &&
          (prevStatusRef.current === 'translating' || prevStatusRef.current === 'syncing')
        ) {
          setFixing(false);
          setFixMessage(null);
          setIsFrozen(false);
          setTimeout(() => runAudit(), 1500);
        }

        // Heartbeat / staleness frozen detection
        if (json.status === 'translating' || json.status === 'syncing') {
          if (json.lastHeartbeat) {
            // New script with heartbeat support
            const heartbeatAge = Date.now() - new Date(json.lastHeartbeat).getTime();
            setIsFrozen(heartbeatAge > 15000); // 15s without heartbeat = frozen
          } else if (json.updatedAt) {
            // Old script or heartbeat not set — fall back to updatedAt staleness
            const updateAge = Date.now() - new Date(json.updatedAt).getTime();
            setIsFrozen(updateAge > 30000); // 30s without any status update = frozen
          } else {
            setIsFrozen(true); // No heartbeat, no updatedAt = definitely frozen
          }
        } else {
          setIsFrozen(false);
        }

        prevStatusRef.current = json.status;
        setData(json);
      }
    } catch { /* API not available */ }
  }, [runAudit]);

  // Adaptive polling: 2s when active (syncing/translating), 30s when idle
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      await fetchStatus();
      if (cancelled) return;
      const isActiveNow = ['syncing', 'translating'].includes(prevStatusRef.current);
      const delay = isActiveNow ? 2000 : 30000;
      pollRef.current = setTimeout(poll, delay);
    };
    poll();
    return () => { cancelled = true; if (pollRef.current) clearTimeout(pollRef.current); };
  }, [fetchStatus]);

  const runFix = async () => {
    setFixing(true);
    setFixMessage(null);
    setIsFrozen(false);
    try {
      const res = await fetch('/api/dev/i18n-fix', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setFixMessage('🚀 Sync + translate started! Watch progress above.');
        setShowAudit(false);
        // Force a fast poll cycle to pick up the new status quickly
        if (pollRef.current) clearTimeout(pollRef.current);
        setTimeout(() => fetchStatus(), 1000);
      } else {
        setFixMessage(`❌ ${json.message}`);
        setFixing(false);
      }
    } catch {
      setFixMessage('❌ Failed to start fix');
      setFixing(false);
    }
  };

  // Don't render until admin check completes, or if user is not admin
  if (isAdmin === null || isAdmin === false) return null;

  if (hidden || !data) return null;

  // ── Calculate percent from batch-level progress ──
  const percent = (data.totalBatchesAll && data.totalBatchesAll > 0)
    ? Math.round(((data.completedBatchesAll || 0) / data.totalBatchesAll) * 100)
    : (data.langTotal > 0
      ? Math.round((data.langProgress / data.langTotal) * 100)
      : 0);

  const statusColor = isFrozen ? '#ef4444' : (STATUS_COLORS[data.status] || '#6b7280');
  const statusLabel = isFrozen ? '⚠️ Frozen' : (STATUS_LABELS[data.status] || data.status);
  const isActive = ['syncing', 'translating'].includes(data.status);

  // ─── Minimized pill ───
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 99999,
          background: '#1a1a2e', border: `1.5px solid ${statusColor}`,
          borderRadius: 20, padding: '6px 14px', color: '#fff',
          fontSize: 12, cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 6, fontFamily: 'monospace',
          boxShadow: `0 0 12px ${statusColor}33`, transition: 'all 0.2s',
        }}
      >
        <PulseDot color={statusColor} active={isActive} />
        i18n {isActive ? `${percent}%` : statusLabel.split(' ')[1]}
        {isFrozen && (
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 10 }}>⚠️</span>
        )}
        {audit && !isActive && (
          <span style={{
            marginLeft: 4, fontSize: 10, fontWeight: 700,
            color: getHealthColor(audit.summary.overallHealth),
          }}>
            {audit.summary.overallHealth}%
          </span>
        )}
        <Pulse />
      </button>
    );
  }

  // ─── Full widget ───
  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 99999,
      width: expanded ? 360 : 260,
      maxHeight: 'calc(100vh - 32px)',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)',
      border: `1px solid ${statusColor}44`,
      borderRadius: 12, color: '#e2e8f0',
      fontFamily: "'Inter', monospace, sans-serif",
      fontSize: 12,
      boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${statusColor}22`,
      overflow: 'hidden', transition: 'all 0.3s ease',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: `1px solid ${statusColor}22`,
          background: `${statusColor}11`, cursor: 'pointer', flexShrink: 0,
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PulseDot color={statusColor} active={isActive} />
          <span style={{ fontWeight: 600, color: '#fff', fontSize: 11, letterSpacing: 0.5 }}>
            🌐 i18n Sync
          </span>
          <span style={{
            fontSize: 10, color: statusColor, fontWeight: 600,
            padding: '1px 6px', background: `${statusColor}22`, borderRadius: 8,
            animation: isFrozen ? 'i18nPulse 1s infinite' : 'none',
          }}>
            {statusLabel}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <HeaderBtn onClick={() => setMinimized(true)} title="Minimize">─</HeaderBtn>
          <HeaderBtn onClick={() => setHidden(true)} title="Hide">✕</HeaderBtn>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Progress bar */}
        {isActive && (
          <div style={{ padding: '8px 12px 0' }}>
            <div style={{ height: 4, borderRadius: 2, background: '#1e293b', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: `linear-gradient(90deg, ${statusColor}, ${statusColor}cc)`,
                width: `${percent}%`, transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 4, fontSize: 10, color: '#64748b',
            }}>
              <span>
                {data.totalRounds && data.totalRounds > 0
                  ? `Round ${data.currentRound || 0}/${data.totalRounds} · ${(data.parallelActive || []).length} langs active · ${data.langProgress}/${data.langTotal} done`
                  : data.totalBatchesAll && data.totalBatchesAll > 0
                    ? `${data.completedBatchesAll || 0}/${data.totalBatchesAll} batches · ${data.langProgress}/${data.langTotal} langs`
                    : `${data.langProgress}/${data.langTotal} languages`}
              </span>
              <span style={{ color: isFrozen ? '#ef4444' : statusColor, fontWeight: 600 }}>
                {isFrozen ? '⚠️' : ''} {percent}%
              </span>
            </div>
          </div>
        )}

        <div style={{ padding: '8px 12px' }}>
          {/* Active parallel translations */}
          {isActive && data.parallelActive && data.parallelActive.length > 0 && (
            <div style={{
              padding: '6px 8px', marginBottom: 6,
              background: '#1e293b', borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                ⚡ Translating {data.parallelActive.length} languages in parallel
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {data.parallelActive.map((lang) => (
                  <span key={lang} style={{
                    fontSize: 11, padding: '2px 5px',
                    background: '#8b5cf622', color: '#a78bfa',
                    borderRadius: 4, fontWeight: 500,
                    animation: 'i18nPulse 1.5s infinite',
                  }}>
                    {FLAG_EMOJIS[lang] || ''} {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ⚠️ Frozen warning banner */}
          {isFrozen && isActive && (
            <div style={{
              padding: '8px 10px', marginBottom: 6,
              background: '#ef444422', border: '1px solid #ef444444',
              borderRadius: 8, textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>
                ⚠️ System Frozen
              </div>
              <div style={{ fontSize: 10, color: '#fca5a5' }}>
                {(() => {
                  const ref = data?.lastHeartbeat || data?.updatedAt;
                  if (!ref) return 'Translation process is not responding.';
                  const age = Math.round((Date.now() - new Date(ref).getTime()) / 1000);
                  const mins = Math.floor(age / 60);
                  const secs = age % 60;
                  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                  return `No response for ${timeStr}. Process may have crashed or frozen.`;
                })()}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); runFix(); }}
                style={{
                  marginTop: 6, padding: '4px 12px',
                  background: '#ef4444', border: 'none', borderRadius: 6,
                  color: '#fff', fontSize: 10, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔄 Restart Translation
              </button>
            </div>
          )}

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 6, marginBottom: 8,
          }}>
            <StatBox label="Keys" value={data.totalKeys} color="#3b82f6" />
            <StatBox label="Translated" value={data.keysTranslated} color="#8b5cf6" />
            <StatBox label="Added" value={data.keysAdded} color="#10b981" />
          </div>

          {/* ═══ CHECK & FIX BUTTON ═══ */}
          {!isActive && (
            <button
              onClick={(e) => { e.stopPropagation(); runAudit(); }}
              disabled={auditLoading}
              style={{
                width: '100%', padding: '8px 12px',
                background: auditLoading
                  ? '#1e293b'
                  : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 11, fontWeight: 600,
                cursor: auditLoading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s',
                opacity: auditLoading ? 0.7 : 1,
                letterSpacing: 0.3,
              }}
            >
              {auditLoading ? (
                <>
                  <Spinner /> Checking all languages...
                </>
              ) : (
                <>🔍 Check &amp; Verify All Languages</>
              )}
            </button>
          )}

          {/* ═══ AUDIT RESULTS ═══ */}
          {showAudit && audit && !isActive && (
            <div style={{ marginTop: 8 }}>
              {/* Overall health bar */}
              <div style={{
                padding: '8px 10px', borderRadius: 8,
                background: '#0f172a', marginBottom: 8,
                border: `1px solid ${getHealthColor(audit.summary.overallHealth)}33`,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 6,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                    Overall Health
                  </span>
                  <span style={{
                    fontSize: 18, fontWeight: 800,
                    color: getHealthColor(audit.summary.overallHealth),
                  }}>
                    {audit.summary.overallHealth}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#1e293b', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: `linear-gradient(90deg, ${getHealthColor(audit.summary.overallHealth)}, ${getHealthColor(audit.summary.overallHealth)}cc)`,
                    width: `${audit.summary.overallHealth}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>

                {/* Summary stats */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 6, marginTop: 8,
                }}>
                  <MiniStat
                    label="Perfect"
                    value={`${audit.summary.perfectLanguages}/${audit.summary.totalLanguages}`}
                    color="#10b981"
                  />
                  <MiniStat
                    label="Missing"
                    value={audit.summary.totalMissingKeys}
                    color={audit.summary.totalMissingKeys > 0 ? '#ef4444' : '#10b981'}
                  />
                  <MiniStat
                    label="Untranslated"
                    value={audit.summary.totalUntranslated}
                    color={audit.summary.totalUntranslated > 0 ? '#f59e0b' : '#10b981'}
                  />
                </div>
              </div>

              {/* Per-language breakdown */}
              <div style={{
                fontSize: 10, color: '#64748b', marginBottom: 4,
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                Languages ({audit.languages.length})
              </div>
              <div style={{
                maxHeight: 200, overflowY: 'auto',
                borderRadius: 6, border: '1px solid #1e293b',
              }}>
                {audit.languages.map((lang) => (
                  <LangRow key={lang.lang} lang={lang} totalKeys={audit.master.keys} />
                ))}
              </div>

              {/* Fix button */}
              {audit.summary.needsFix && (
                <button
                  onClick={(e) => { e.stopPropagation(); runFix(); }}
                  disabled={fixing}
                  style={{
                    width: '100%', padding: '10px 12px', marginTop: 8,
                    background: fixing
                      ? '#1e293b'
                      : 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
                    border: 'none', borderRadius: 8,
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    cursor: fixing ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.2s',
                    opacity: fixing ? 0.7 : 1,
                    letterSpacing: 0.3,
                  }}
                >
                  {fixing ? (
                    <><Spinner /> Fixing...</>
                  ) : (
                    <>🔧 Auto-Fix: Sync + Translate All</>
                  )}
                </button>
              )}

              {/* All perfect */}
              {!audit.summary.needsFix && (
                <div style={{
                  marginTop: 8, padding: '10px 12px',
                  background: '#10b98111', border: '1px solid #10b98133',
                  borderRadius: 8, textAlign: 'center',
                  color: '#10b981', fontSize: 12, fontWeight: 600,
                }}>
                  ✅ All languages are perfectly synced &amp; translated!
                </div>
              )}

              {fixMessage && (
                <div style={{
                  marginTop: 6, padding: '6px 10px',
                  background: fixMessage.startsWith('❌') ? '#ef444411' : '#3b82f611',
                  borderRadius: 6, fontSize: 10,
                  color: fixMessage.startsWith('❌') ? '#fca5a5' : '#93c5fd',
                  textAlign: 'center',
                }}>
                  {fixMessage}
                </div>
              )}
            </div>
          )}

          {/* Completed languages */}
          {expanded && !showAudit && data.completedLangs && data.completedLangs.length > 0 && (
            <div>
              <div style={{
                fontSize: 10, color: '#64748b', marginBottom: 4,
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                Completed ({data.completedLangs.length}/{data.langTotal})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {data.completedLangs.map((lang) => (
                  <span key={lang} style={{
                    fontSize: 11, padding: '2px 5px',
                    background: '#10b98122', color: '#10b981',
                    borderRadius: 4, fontWeight: 500,
                  }}>
                    {FLAG_EMOJIS[lang] || ''} {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {expanded && data.errors && data.errors.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 2 }}>
                Errors ({data.errors.length})
              </div>
              {data.errors.slice(-3).map((err, i) => (
                <div key={i} style={{
                  fontSize: 10, color: '#fca5a5',
                  padding: '2px 6px', background: '#ef444411',
                  borderRadius: 4, marginBottom: 2,
                }}>
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Done summary */}
          {data.status === 'done' && !showAudit && (
            <div style={{ marginTop: 4, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
              {data.updatedAt && `Finished ${formatTimeAgo(data.updatedAt)}`}
            </div>
          )}

          {/* Watching idle */}
          {data.status === 'watching' && !showAudit && (
            <div style={{
              marginTop: 4, padding: '4px 8px',
              background: '#3b82f611', borderRadius: 6,
              fontSize: 10, color: '#60a5fa', textAlign: 'center',
            }}>
              Watching en.json for changes...
            </div>
          )}
        </div>
      </div>

      <Pulse />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function PulseDot({ color, active }: { color: string; active: boolean }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: color, flexShrink: 0,
      animation: active ? 'i18nPulse 1.5s infinite' : 'none',
    }} />
  );
}

function Pulse() {
  return <style>{`@keyframes i18nPulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes i18nSpin{to{transform:rotate(360deg)}}`}</style>;
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      border: '2px solid #ffffff44', borderTopColor: '#fff',
      borderRadius: '50%', animation: 'i18nSpin 0.8s linear infinite',
    }} />
  );
}

function HeaderBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: 'transparent', border: 'none', color: '#64748b',
        cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1,
      }}
      title={title}
    >
      {children}
    </button>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '4px 0',
      background: `${color}11`, borderRadius: 6,
      border: `1px solid ${color}22`,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color, lineHeight: 1.2 }}>
        {(value ?? 0).toLocaleString()}
      </div>
      <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function LangRow({ lang, totalKeys }: { lang: LangReport; totalKeys: number }) {
  const isPerfect = lang.missingKeys === 0 && lang.untranslated === 0 && lang.extraKeys === 0;
  const healthColor = getHealthColor(lang.health);
  // Calculate true translation % (translated + accepted = done)
  const translatedCount = totalKeys - lang.missingKeys - lang.untranslated;
  const translatedPct = totalKeys > 0 ? Math.round((translatedCount / totalKeys) * 100) : 100;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 8px',
      borderBottom: '1px solid #1e293b',
      background: isPerfect ? '#10b98108' : 'transparent',
      fontSize: 11,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{FLAG_EMOJIS[lang.lang] || '🏳'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#fff', fontSize: 10, display: 'flex', gap: 4, alignItems: 'center' }}>
          {lang.lang.toUpperCase()}
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 400 }}>
            {translatedPct}% translated
          </span>
        </div>
        {!isPerfect && (
          <div style={{ fontSize: 9, color: '#94a3b8', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {lang.missingKeys > 0 && (
              <span style={{ color: '#ef4444' }}>-{lang.missingKeys} missing</span>
            )}
            {lang.untranslated > 0 && (
              <span style={{ color: '#f59e0b' }}>{lang.untranslated} untranslated</span>
            )}
            {lang.accepted > 0 && (
              <span style={{ color: '#6b7280' }} title="DeepSeek confirmed these should stay in English">✓{lang.accepted} accepted</span>
            )}
            {lang.extraKeys > 0 && (
              <span style={{ color: '#64748b' }}>+{lang.extraKeys} extra</span>
            )}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: healthColor,
        minWidth: 36, textAlign: 'right',
      }}>
        {isPerfect ? '✓' : `${lang.health}%`}
      </div>
      {/* Mini health bar */}
      <div style={{
        width: 40, height: 4, borderRadius: 2,
        background: '#1e293b', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: healthColor,
          width: `${lang.health}%`,
        }} />
      </div>
    </div>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────

function getHealthColor(health: number): string {
  if (health >= 95) return '#10b981';
  if (health >= 70) return '#f59e0b';
  return '#ef4444';
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}
