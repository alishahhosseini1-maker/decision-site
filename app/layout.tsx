import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Decision Layer — Before you commit.',
  description: 'A structured pre-commitment review for high-stakes decisions. Not a pro/con list. Not therapy. A clear verdict.',
  metadataBase: new URL('https://decisionlayer.dev'),
  openGraph: {
    title: 'Decision Layer — Before you commit.',
    description: 'A structured pre-commitment review for high-stakes decisions. Not a pro/con list. Not therapy. A clear verdict.',
    url: 'https://decisionlayer.dev',
    siteName: 'Decision Layer',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Decision Layer',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Decision Layer — Before you commit.',
    description: 'A structured pre-commitment review for high-stakes decisions. Not a pro/con list. Not therapy. A clear verdict.',
    images: ['/api/og'],
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
