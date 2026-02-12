const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // High refresh rate optimizations
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  
  // Compiler options for better performance
  compiler: {
    // Keep error & warn in production for critical debugging (webhooks, cron jobs, etc.)
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  // SEO & Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // SEO: Redirect www to non-www for canonical consistency + blog → education
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.fibalgo.com' }],
        destination: 'https://fibalgo.com/:path*',
        permanent: true,
      },
      // 301 redirect old /blog URLs to /education (SEO safe)
      {
        source: '/blog',
        destination: '/education',
        permanent: true,
      },
      {
        source: '/blog/:path*',
        destination: '/education/:path*',
        permanent: true,
      },
      // Legacy site 404 cleanup — redirect old pages to relevant current pages
      {
        source: '/contact',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/support',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/encyclopedia',
        destination: '/education',
        permanent: true,
      },
      {
        source: '/shop',
        destination: '/#pricing',
        permanent: true,
      },
      {
        source: '/portfolio-item/:path*',
        destination: '/library',
        permanent: true,
      },
      {
        source: '/locations.kml',
        destination: '/',
        permanent: true,
      },
      {
        source: '/access',
        destination: '/#pricing',
        permanent: true,
      },
      {
        source: '/about-us',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/thank-you',
        destination: '/',
        permanent: true,
      },
      {
        source: '/terms-of-service-disclaimer',
        destination: '/terms-of-service',
        permanent: true,
      },
      {
        source: '/wp-includes/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-content/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/guide-1-2',
        destination: '/education',
        permanent: true,
      },
      {
        source: '/demo',
        destination: '/#pricing',
        permanent: true,
      },
      {
        source: '/thank-you-telegram',
        destination: '/',
        permanent: true,
      },
      {
        source: '/docs',
        destination: '/education',
        permanent: true,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
