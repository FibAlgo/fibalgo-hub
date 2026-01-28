import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 🔒 SECURITY: Remove console.log in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep errors and warnings
    } : false,
  },
  
  // 🔒 SECURITY: Add comprehensive security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // 🔒 HSTS - Enforce HTTPS for 1 year
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // 🔒 CSP - Prevent XSS attacks (TradingView widgets need multiple domains)
          { 
            key: 'Content-Security-Policy', 
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://s3.tradingview.com https://s.tradingview.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "frame-src 'self' https://www.tradingview.com https://www.tradingview-widget.com https://s.tradingview.com https://sandbox.polar.sh https://polar.sh https://www.google.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.binance.com https://api.coingecko.com https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://api.massive.com https://www.google.com https://finer-haddock-29929.upstash.io",
              "worker-src 'self' blob:",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; ')
          },
        ],
      },
    ];
  },
};

export default nextConfig;
