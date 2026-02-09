import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read FibAlgo\'s terms of service. Understand the terms and conditions for using our AI trading indicators and platform.',
  alternates: { canonical: 'https://fibalgo.com/terms-of-service' },
  openGraph: {
    title: 'Terms of Service – FibAlgo',
    description: 'Read the terms and conditions for using FibAlgo AI trading indicators and platform.',
    url: 'https://fibalgo.com/terms-of-service',
  },
  robots: { index: true, follow: true },
};

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
