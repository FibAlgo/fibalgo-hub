import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read FibAlgo\'s privacy policy. Learn how we collect, use, and protect your personal data when using our AI trading platform.',
  alternates: { canonical: 'https://fibalgo.com/privacy-policy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
