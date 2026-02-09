import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
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
        ],
      },
    ],
    sitemap: 'https://fibalgo.com/sitemap.xml',
  };
}
