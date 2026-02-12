import { MetadataRoute } from 'next';
import { locales } from '@/i18n/routing';

// Pages that should never be indexed (auth, admin, internal)
const disallowPaths = [
  '/api/',
  '/admin/',
  '/dashboard/',
  '/terminal/',
  '/login',
  '/signup',
  '/auth/',
  '/forgot-password',
  '/reset-password',
  '/crypto-payment',
  '/maintenance',
  '/community',
];

export default function robots(): MetadataRoute.Robots {
  // Generate disallow rules for all locale prefixes
  // e.g. /tr/login, /de/dashboard/, /fr/admin/ etc.
  const allDisallow: string[] = [...disallowPaths];
  for (const locale of locales) {
    if (locale === 'en') continue; // English has no prefix
    for (const path of disallowPaths) {
      allDisallow.push(`/${locale}${path}`);
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: allDisallow,
      },
    ],
    sitemap: 'https://fibalgo.com/sitemap.xml',
  };
}
