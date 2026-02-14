import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { Outfit, Inter } from 'next/font/google';
import { routing } from '@/i18n/routing';
import ClientLayout from '@/components/layout/ClientLayout';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
  preload: true,
  adjustFontFallback: true,
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  adjustFontFallback: true,
});

// RTL languages
const rtlLocales = ['ar', 'he'];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Preconnect to external image hosts for faster LCP */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <Script id="scroll-restoration-fix" strategy="afterInteractive">
          {`
            (function(){try{if('scrollRestoration' in history)history.scrollRestoration='manual';var p=location.pathname;if((p==='/'||/^\\/[a-z]{2}\\/?$/.test(p))&&!location.hash){window.scrollTo(0,0);document.documentElement.scrollTop=0}window.addEventListener('pageshow',function(e){var pp=location.pathname;if((pp==='/'||/^\\/[a-z]{2}\\/?$/.test(pp))&&!location.hash){window.scrollTo(0,0);if(e.persisted)setTimeout(function(){window.scrollTo(0,0)},100)}});window.addEventListener('popstate',function(){setTimeout(function(){var h=document.documentElement,b=document.body;if(h.style.overflow==='hidden')h.style.overflow='';if(b&&b.style.overflow==='hidden'&&!b.getAttribute('data-scroll-lock'))b.style.overflow=''},100)})}catch(e){}})()
          `}
        </Script>
      </head>
      <body
        className={`${outfit.variable} ${inter.variable}`}
        suppressHydrationWarning
        style={{
          fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          background: '#050508',
          minHeight: '100vh',
          color: '#FFFFFF',
        }}
      >
        <NextIntlClientProvider>
          <ClientLayout>{children}</ClientLayout>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
