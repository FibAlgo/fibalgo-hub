import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read FibAlgo\'s privacy policy. Learn how we collect, use, and protect your personal data when using our AI trading platform.',
  alternates: { canonical: 'https://fibalgo.com/privacy-policy' },
  openGraph: {
    title: 'Privacy Policy – FibAlgo',
    description: 'Learn how FibAlgo collects, uses, and protects your personal data.',
    url: 'https://fibalgo.com/privacy-policy',
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
