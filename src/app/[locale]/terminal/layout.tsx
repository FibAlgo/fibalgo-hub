import { Metadata } from 'next';
import TerminalLayoutClient from './TerminalLayoutClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TerminalLayoutClient>{children}</TerminalLayoutClient>;
}
