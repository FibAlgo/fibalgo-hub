import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
  preload: true,
  adjustFontFallback: true,
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://fibalgo.com'),
  title: {
    default: 'FibAlgo – AI-Powered Trading Indicators & Signals for TradingView',
    template: '%s | FibAlgo',
  },
  description:
    'Transform your trading with institutional-grade AI algorithms. Get precise buy/sell signals, entry & exit zones for Forex, Crypto, and Stocks on TradingView. Trusted by 10,000+ traders.',
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
  alternates: {
    canonical: 'https://fibalgo.com',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="scroll-restoration-fix" strategy="beforeInteractive">
          {`
            (function () {
              try {
                if ('scrollRestoration' in history) {
                  history.scrollRestoration = 'manual';
                }

                function shouldForceTop() {
                  return location.pathname === '/' && !location.hash;
                }

                function forceTop() {
                  var prev = document.documentElement.style.scrollBehavior;
                  document.documentElement.style.scrollBehavior = 'auto';
                  window.scrollTo(0, 0);
                  document.documentElement.scrollTop = 0;
                  if (document.body) document.body.scrollTop = 0;
                  document.documentElement.style.scrollBehavior = prev || '';
                }

                function ensureScrollable() {
                  var html = document.documentElement;
                  var body = document.body;
                  if (!body) return;
                  if (html.style.overflow === 'hidden') html.style.overflow = '';
                  if (html.style.overflowY === 'hidden') html.style.overflowY = '';
                  if (html.style.touchAction === 'none') html.style.touchAction = '';
                  var isLocked = body.getAttribute('data-scroll-lock') === 'true';
                  if (!isLocked) {
                    if (body.style.overflow === 'hidden') body.style.overflow = '';
                    if (body.style.overflowY === 'hidden') body.style.overflowY = '';
                    if (body.style.touchAction === 'none') body.style.touchAction = '';
                    if (body.style.position === 'fixed') {
                      var top = body.style.top;
                      body.style.position = '';
                      body.style.width = '';
                      body.style.top = '';
                      if (top) window.scrollTo(0, parseInt(top) * -1);
                    }
                  }
                }

                ensureScrollable();
                setInterval(ensureScrollable, 3000);

                function scheduleForceTop() {
                  if (!shouldForceTop()) return;
                  forceTop();
                  setTimeout(forceTop, 200);
                  requestAnimationFrame(function () { forceTop(); });
                }

                scheduleForceTop();

                window.addEventListener('pageshow', function (e) {
                  ensureScrollable();
                  if (shouldForceTop()) {
                    forceTop();
                    setTimeout(forceTop, 50);
                    setTimeout(forceTop, 150);
                    setTimeout(forceTop, 300);
                    if (e.persisted) setTimeout(forceTop, 500);
                  }
                });

                window.addEventListener('load', function () {
                  ensureScrollable();
                  if (shouldForceTop()) {
                    forceTop();
                    setTimeout(forceTop, 100);
                    setTimeout(forceTop, 300);
                  }
                });

                // SPA navigation: clean up stale scroll locks
                window.addEventListener('popstate', function () {
                  setTimeout(ensureScrollable, 100);
                });
              } catch (e) {}
            })();
          `}
        </Script>
      </head>
      <body className={`${outfit.variable} ${inter.variable}`} suppressHydrationWarning style={{
        fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        background: '#050508',
        minHeight: '100vh',
        color: '#FFFFFF',
      }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
