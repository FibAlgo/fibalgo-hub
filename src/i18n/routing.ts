import { defineRouting } from 'next-intl/routing';

// 30 supported languages
export const locales = [
  'en',   // English (default)
  'tr',   // Türkçe
  'es',   // Español
  'de',   // Deutsch
  'fr',   // Français
  'it',   // Italiano
  'pt',   // Português
  'nl',   // Nederlands
  'pl',   // Polski
  'ru',   // Русский
  'uk',   // Українська
  'ar',   // العربية
  'ja',   // 日本語
  'ko',   // 한국어
  'zh',   // 中文
  'hi',   // हिन्दी
  'th',   // ไทย
  'vi',   // Tiếng Việt
  'id',   // Bahasa Indonesia
  'ms',   // Bahasa Melayu
  'sv',   // Svenska
  'da',   // Dansk
  'fi',   // Suomi
  'no',   // Norsk
  'cs',   // Čeština
  'ro',   // Română
  'hu',   // Magyar
  'el',   // Ελληνικά
  'he',   // עברית
  'bn',   // বাংলা
] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Русский',
  uk: 'Українська',
  ar: 'العربية',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  hi: 'हिन्दी',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  cs: 'Čeština',
  ro: 'Română',
  hu: 'Magyar',
  el: 'Ελληνικά',
  he: 'עברית',
  bn: 'বাংলা',
};

// Flag emojis for language selector UI
export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  tr: '🇹🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  fr: '🇫🇷',
  it: '🇮🇹',
  pt: '🇧🇷',
  nl: '🇳🇱',
  pl: '🇵🇱',
  ru: '🇷🇺',
  uk: '🇺🇦',
  ar: '🇸🇦',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  hi: '🇮🇳',
  th: '🇹🇭',
  vi: '🇻🇳',
  id: '🇮🇩',
  ms: '🇲🇾',
  sv: '🇸🇪',
  da: '🇩🇰',
  fi: '🇫🇮',
  no: '🇳🇴',
  cs: '🇨🇿',
  ro: '🇷🇴',
  hu: '🇭🇺',
  el: '🇬🇷',
  he: '🇮🇱',
  bn: '🇧🇩',
};

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  // Don't prefix the default locale (fibalgo.com/ instead of fibalgo.com/en/)
  localePrefix: 'as-needed',
});
