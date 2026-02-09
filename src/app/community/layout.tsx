import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trader Community',
  description:
    'Join the FibAlgo trading community. Share insights, discuss strategies, and connect with 10,000+ traders using AI-powered indicators.',
  alternates: { canonical: 'https://fibalgo.com/community' },
  openGraph: {
    title: 'FibAlgo Trader Community',
    description: 'Connect with 10,000+ traders using AI-powered trading indicators.',
    url: 'https://fibalgo.com/community',
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
