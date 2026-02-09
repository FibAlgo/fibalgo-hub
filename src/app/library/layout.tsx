import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Indicator Library – All AI Trading Indicators',
  description:
    'Explore FibAlgo\'s complete library of AI-powered trading indicators for TradingView. Smart money signals, entry/exit zones, momentum analysis, and more.',
  alternates: { canonical: 'https://fibalgo.com/library' },
  openGraph: {
    title: 'FibAlgo Indicator Library',
    description: 'Browse our complete collection of AI trading indicators for TradingView.',
    url: 'https://fibalgo.com/library',
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
