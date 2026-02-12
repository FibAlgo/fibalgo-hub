import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { Outfit, Inter } from 'next/font/google';
import { routing } from '@/i18n/routing';
import ClientLayout from '@/components/layout/ClientLayout';

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
        <Script id="scroll-restoration-fix" strategy="afterInteractive">
          {`
            (function () {
              try {
                if ('scrollRestoration' in history) {
                  history.scrollRestoration = 'manual';
                }

                function shouldForceTop() {
                  var p = location.pathname;
                  return (p === '/' || /^\\/[a-z]{2}\\/?$/.test(p)) && !location.hash;
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

                if (shouldForceTop()) {
                  forceTop();
                  requestAnimationFrame(function () { forceTop(); });
                }

                window.addEventListener('pageshow', function (e) {
                  ensureScrollable();
                  if (shouldForceTop()) {
                    forceTop();
                    setTimeout(forceTop, 100);
                    if (e.persisted) setTimeout(forceTop, 300);
                  }
                });

                window.addEventListener('popstate', function () {
                  setTimeout(ensureScrollable, 100);
                });
              } catch (e) {}
            })();
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
      </body>
    </html>
  );
}
