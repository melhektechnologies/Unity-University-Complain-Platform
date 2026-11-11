import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Unity University | Student Support',
    template: '%s | Unity University Student Support',
  },
  description: 'A secure Unity University portal for submitting a complaint and following its progress.',
  applicationName: 'Unity University Student Support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

