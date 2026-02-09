import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FibAlgo – AI-Powered Trading Indicators',
    short_name: 'FibAlgo',
    description:
      'Transform your trading with institutional-grade AI algorithms. Precise buy/sell signals for Forex, Crypto & Stocks on TradingView.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050508',
    theme_color: '#00F5FF',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
