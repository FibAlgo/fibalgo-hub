import { locales, type Locale } from '@/i18n/routing';

const BASE_URL = 'https://fibalgo.com';

/**
 * Map locale codes to OpenGraph locale format (language_REGION)
 */
const ogLocaleMap: Record<Locale, string> = {
  en: 'en_US',
  tr: 'tr_TR',
  es: 'es_ES',
  de: 'de_DE',
  fr: 'fr_FR',
  it: 'it_IT',
  pt: 'pt_BR',
  nl: 'nl_NL',
  pl: 'pl_PL',
  ru: 'ru_RU',
  uk: 'uk_UA',
  ar: 'ar_SA',
  ja: 'ja_JP',
  ko: 'ko_KR',
  zh: 'zh_CN',
  hi: 'hi_IN',
  th: 'th_TH',
  vi: 'vi_VN',
  id: 'id_ID',
  ms: 'ms_MY',
  sv: 'sv_SE',
  da: 'da_DK',
  fi: 'fi_FI',
  no: 'nb_NO',
  cs: 'cs_CZ',
  ro: 'ro_RO',
  hu: 'hu_HU',
  el: 'el_GR',
  he: 'he_IL',
  bn: 'bn_BD',
};

/**
 * Get the OpenGraph locale string for a given locale
 */
export function getOgLocale(locale: string): string {
  return ogLocaleMap[locale as Locale] || 'en_US';
}

/**
 * Get the full URL for a path with locale prefix
 * English (default) has no prefix: fibalgo.com/about
 * Other locales: fibalgo.com/tr/about
 * Root paths get trailing slash: fibalgo.com/ and fibalgo.com/tr/
 */
export function getLocalizedUrl(path: string, locale: string): string {
  // Normalize: strip leading slash for processing
  const stripped = path.replace(/^\/+/, '').replace(/\/+$/, '');

  if (locale === 'en') {
    return stripped ? `${BASE_URL}/${stripped}` : `${BASE_URL}/`;
  }
  return stripped ? `${BASE_URL}/${locale}/${stripped}` : `${BASE_URL}/${locale}/`;
}

/**
 * Generate hreflang alternate links for all 30 locales
 * Returns the `alternates` object for Next.js Metadata
 *
 * URL format rules:
 *   Root:  fibalgo.com/     and  fibalgo.com/tr/
 *   Pages: fibalgo.com/about and fibalgo.com/tr/about  (no trailing slash)
 */
export function getAlternates(path: string, locale: string) {
  const stripped = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const isRoot = stripped === '';

  const languages: Record<string, string> = {};

  for (const loc of locales) {
    if (loc === 'en') {
      languages[loc] = isRoot ? `${BASE_URL}/` : `${BASE_URL}/${stripped}`;
    } else {
      languages[loc] = isRoot ? `${BASE_URL}/${loc}/` : `${BASE_URL}/${loc}/${stripped}`;
    }
  }

  // x-default points to the English (default) version
  languages['x-default'] = isRoot ? `${BASE_URL}/` : `${BASE_URL}/${stripped}`;

  return {
    canonical: getLocalizedUrl(path, locale),
    languages,
  };
}

/**
 * Get alternate OG locales (all locales except current)
 */
export function getAlternateOgLocales(currentLocale: string): string[] {
  return locales
    .filter((loc) => loc !== currentLocale)
    .map((loc) => ogLocaleMap[loc] || 'en_US');
}

export { BASE_URL, locales };
