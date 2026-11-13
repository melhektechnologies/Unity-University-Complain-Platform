import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Student Support | Unity University Student Support',
    template: '%s | Unity University Student Support',
  },
  description:
    'A thoughtful, confidential way to raise a concern with Student Affairs—and stay informed as it moves forward.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
