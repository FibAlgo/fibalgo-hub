import type { Metadata } from "next";
import "./globals.css";
import { locales } from '@/i18n/routing';

// Generate hreflang alternates for root
function getRootAlternates() {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = locale === 'en'
      ? 'https://fibalgo.com'
      : `https://fibalgo.com/${locale}`;
  }
  languages['x-default'] = 'https://fibalgo.com';
  return { canonical: 'https://fibalgo.com', languages };
}

export const metadata: Metadata = {
  metadataBase: new URL('https://fibalgo.com'),
  title: {
    default: 'FibAlgo – AI Trading Signals & Indicators',
    template: '%s | FibAlgo',
  },
  description:
    'AI-powered trading indicators for TradingView. Get precise buy/sell signals & entry zones for Forex, Crypto, and Stocks. Trusted by 10,000+ traders.',
  keywords: [
    'AI trading indicators',
    'TradingView indicators',
    'trading signals',
    'forex signals',
    'crypto signals',
    'stock trading AI',
    'buy sell signals',
    'algorithmic trading',
    'smart money trading',
    'FibAlgo',
    'trading bot',
    'market analysis AI',
  ],
  authors: [{ name: 'FibAlgo', url: 'https://fibalgo.com' }],
  creator: 'FibAlgo',
  publisher: 'FibAlgo',
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fibalgo.com',
    siteName: 'FibAlgo',
    title: 'FibAlgo – AI-Powered Trading Indicators & Signals',
    description:
      'Institutional-grade AI trading algorithms for TradingView. Precise buy/sell signals for Forex, Crypto & Stocks. Trusted by 10,000+ traders worldwide.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@fibalgoai',
    creator: '@fibalgoai',
    title: 'FibAlgo – AI-Powered Trading Indicators & Signals',
    description:
      'Institutional-grade AI trading algorithms for TradingView. Precise buy/sell signals for Forex, Crypto & Stocks.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: getRootAlternates(),
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
