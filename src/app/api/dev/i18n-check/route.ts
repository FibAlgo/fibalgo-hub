import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Language display names
const LANG_NAMES: Record<string, string> = {
  tr: 'Turkish', es: 'Spanish', de: 'German', fr: 'French', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', uk: 'Ukrainian',
  ar: 'Arabic', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  hi: 'Hindi', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', el: 'Greek', he: 'Hebrew', bn: 'Bengali',
};

// Brand/technical values that are intentionally the same across languages
const SKIP_VALUES = new Set([
  'FibAlgo Hub', 'HUB', 'ADMIN', 'NEW', 'TradingView', '••••••••',
  'FibAlgo', 'Polar', 'Trustpilot', 'SEPA', 'PayPal',
]);

// Keys that should never be flagged as untranslated
const SKIP_KEYS = new Set([
  'dashboard.passwordPlaceholder',
]);

// Load accepted keys (DeepSeek confirmed these should stay as English)
function loadAccepted(): Record<string, Record<string, string>> {
  try {
    const acceptedPath = path.join(process.cwd(), '.i18n-accepted.json');
    if (fs.existsSync(acceptedPath)) {
      return JSON.parse(fs.readFileSync(acceptedPath, 'utf8'));
    }
  } catch { /* ignore */ }
  return {};
}

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

interface LangReport {
  lang: string;
  name: string;
  sections: number;
  missingSections: string[];
  missingKeys: number;
  extraKeys: number;
  untranslated: number;
  accepted: number; // keys DeepSeek confirmed should stay as English
  health: number; // 0-100
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const messagesDir = path.join(process.cwd(), 'messages');
    const enData = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));
    const enFlat = flatten(enData);
    const enKeys = new Set(Object.keys(enFlat));
    const enSections = new Set(Object.keys(enData));
    const enKeyCount = enKeys.size;
    const enSectionCount = enSections.size;

    // Load accepted keys
    const acceptedKeys = loadAccepted();

    const langFiles = fs.readdirSync(messagesDir)
      .filter((f: string) => f.endsWith('.json') && f !== 'en.json')
      .sort();

    const reports: LangReport[] = [];
    let totalMissing = 0;
    let totalExtra = 0;
    let totalUntranslated = 0;
    let perfectCount = 0;

    for (const file of langFiles) {
      const langCode = file.replace('.json', '');
      const langName = LANG_NAMES[langCode] || langCode;

      let langData: Record<string, unknown>;
      try {
        langData = JSON.parse(fs.readFileSync(path.join(messagesDir, file), 'utf8'));
      } catch {
        reports.push({
          lang: langCode, name: langName, sections: 0,
          missingSections: [...enSections], missingKeys: enKeyCount,
          extraKeys: 0, untranslated: 0, accepted: 0, health: 0,
        });
        totalMissing += enKeyCount;
        continue;
      }

      const langFlat = flatten(langData);
      const langKeys = new Set(Object.keys(langFlat));
      const langSections = new Set(Object.keys(langData));

      // Missing sections
      const missingSections = [...enSections].filter(s => !langSections.has(s));

      // Missing keys
      const missingKeys = [...enKeys].filter(k => !langKeys.has(k));

      // Extra keys (in lang but not in en)
      const extraKeys = [...langKeys].filter(k => !enKeys.has(k));

      // Untranslated (value identical to English, excluding brand names & accepted)
      let untranslated = 0;
      let accepted = 0;
      const langAccepted = acceptedKeys[langCode] || {};
      for (const key of enKeys) {
        if (langFlat[key] !== undefined && langFlat[key] === enFlat[key]) {
          if (SKIP_VALUES.has(enFlat[key]) || SKIP_KEYS.has(key)) {
            // Brand name or skip-key — always skip
          } else if (langAccepted[key] === enFlat[key]) {
            // DeepSeek confirmed this should stay as English
            accepted++;
          } else {
            untranslated++;
          }
        }
      }

      const totalIssues = missingKeys.length + untranslated;
      const health = enKeyCount > 0
        ? Math.round(((enKeyCount - totalIssues) / enKeyCount) * 100)
        : 100;

      if (missingKeys.length === 0 && untranslated === 0 && extraKeys.length === 0) {
        perfectCount++;
      }

      totalMissing += missingKeys.length;
      totalExtra += extraKeys.length;
      totalUntranslated += untranslated;

      reports.push({
        lang: langCode,
        name: langName,
        sections: langSections.size,
        missingSections,
        missingKeys: missingKeys.length,
        extraKeys: extraKeys.length,
        untranslated,
        accepted,
        health: Math.max(0, Math.min(100, health)),
      });
    }

    // Sort: worst health first
    reports.sort((a, b) => a.health - b.health);

    const overallHealth = reports.length > 0
      ? Math.round(reports.reduce((s, r) => s + r.health, 0) / reports.length)
      : 100;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      master: {
        keys: enKeyCount,
        sections: enSectionCount,
      },
      summary: {
        totalLanguages: reports.length,
        perfectLanguages: perfectCount,
        totalMissingKeys: totalMissing,
        totalExtraKeys: totalExtra,
        totalUntranslated: totalUntranslated,
        overallHealth,
        needsFix: totalMissing > 0 || totalUntranslated > 0,
      },
      languages: reports,
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Audit failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
