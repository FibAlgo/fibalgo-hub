import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FibAlgo - AI-Powered Trading Signals",
  description: "Transform your trading with institutional-grade AI algorithms. Get precise entry and exit signals for Forex, Crypto, and Stocks.",
  keywords: ["trading", "AI", "signals", "forex", "crypto", "TradingView", "indicators"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
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
