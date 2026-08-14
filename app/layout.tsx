import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lumen — Private market evidence ledger',
  description: 'A crowdsourced evidence ledger and AI-assisted valuation for private companies.',
  openGraph: {
    title: 'Lumen — Private market evidence ledger',
    description: 'A crowdsourced evidence ledger and AI-assisted valuation for private companies.',
    siteName: 'Lumen',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumen — Private market evidence ledger',
    description: 'A crowdsourced evidence ledger and AI-assisted valuation for private companies.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
