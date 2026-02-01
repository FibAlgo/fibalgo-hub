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
  title: "FibAlgo - Power of AI!",
  description: "Transform your trading with institutional-grade AI algorithms. Get precise entry and exit signals for Forex, Crypto, and Stocks.",
  keywords: ["trading", "AI", "signals", "forex", "crypto", "TradingView", "indicators"],
  icons: {
    icon: '/images/websitelogo.jpg',
    shortcut: '/images/websitelogo.jpg',
    apple: '/images/websitelogo.jpg',
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
                    if (e.persisted) setTimeout(forceTop, 150);
                    else setTimeout(forceTop, 200);
                  }
                });

                window.addEventListener('load', function () {
                  if (shouldForceTop()) setTimeout(forceTop, 200);
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
