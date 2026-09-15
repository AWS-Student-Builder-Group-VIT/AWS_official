import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWS SBG VIT — Recruitment Portal',
  description: 'Join the AWS Student Builder Group at VIT through technical, event ideation, logistics, or operations roles.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
