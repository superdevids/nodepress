import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | NodePress',
    default: 'NodePress — A Modern CMS',
  },
  description: 'A modern, type-safe content management system built with Node.js and TypeScript.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'NodePress',
    title: 'NodePress — A Modern CMS',
    description: 'A modern, type-safe content management system built with Node.js and TypeScript.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NodePress — A Modern CMS',
    description: 'A modern, type-safe content management system built with Node.js and TypeScript.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="NodePress Blog RSS"
          href="/api/feed/rss"
        />
      </head>
      <body className={`${inter.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
