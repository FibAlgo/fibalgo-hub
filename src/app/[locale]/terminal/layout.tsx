import TerminalLayoutClient from './TerminalLayoutClient';

export const dynamic = 'force-dynamic';

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TerminalLayoutClient>{children}</TerminalLayoutClient>;
}
