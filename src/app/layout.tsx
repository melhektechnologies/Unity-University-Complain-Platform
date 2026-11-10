import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unity Student Support | Initial Development Environment',
  description: 'Student Complaint & Feedback Management Platform for Unity University, Ethiopia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}

