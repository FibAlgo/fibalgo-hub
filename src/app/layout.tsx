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
                  // Ensure instant behavior for this operation
                  var prev = document.documentElement.style.scrollBehavior;
                  document.documentElement.style.scrollBehavior = 'auto';
                  window.scrollTo(0, 0);
                  document.documentElement.scrollTop = 0;
                  if (document.body) document.body.scrollTop = 0;
                  document.documentElement.style.scrollBehavior = prev || '';
                }

                // Minimal: force top once on initial load if needed.
                // (The original “starts lower then jumps” issue was caused by a component
                // scrolling on mount; we removed that. Keeping this minimal avoids iOS
                // Safari pull-to-refresh getting stuck in an overscrolled state.)
                function scheduleForceTop() {
                  if (!shouldForceTop()) return;
                  forceTop();
                  setTimeout(forceTop, 200);
                  requestAnimationFrame(function () { forceTop(); });
                }

                scheduleForceTop();

                window.addEventListener('pageshow', function (e) {
                  if (shouldForceTop()) {
                    forceTop();
                    setTimeout(forceTop, 50);
                    setTimeout(forceTop, 150);
                    setTimeout(forceTop, 300);
                    if (e.persisted) setTimeout(forceTop, 500);
                  }
                });

                window.addEventListener('load', function () {
                  if (shouldForceTop()) {
                    forceTop();
                    setTimeout(forceTop, 100);
                    setTimeout(forceTop, 300);
                  }
                });

                // iOS Safari: fix stuck scroll after pull-to-refresh
                var lastVisChange = 0;
                document.addEventListener('visibilitychange', function () {
                  if (document.visibilityState === 'visible' && shouldForceTop()) {
                    var now = Date.now();
                    if (now - lastVisChange < 2000) return;
                    lastVisChange = now;
                    forceTop();
                    setTimeout(forceTop, 100);
                  }
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
