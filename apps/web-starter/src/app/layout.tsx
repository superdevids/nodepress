import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Breadcrumbs } from '@/components/breadcrumbs';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

export const metadata: Metadata = {
  title: {
    template: '%s | NodePress',
    default: 'NodePress — A Modern CMS',
  },
  description: 'A modern, type-safe content management system built with Node.js and TypeScript.',
  metadataBase: new URL(siteUrl),
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'NodePress',
    title: 'NodePress — A Modern CMS',
    description: 'A modern, type-safe content management system built with Node.js and TypeScript.',
    url: '/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NodePress',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NodePress — A Modern CMS',
    description: 'A modern, type-safe content management system built with Node.js and TypeScript.',
    site: '@nodepress',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    types: {
      'application/rss+xml': '/api/feed/rss',
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'NodePress',
      description:
        'A modern, type-safe content management system built with Node.js and TypeScript.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      url: siteUrl,
      name: 'NodePress',
      logo: `${siteUrl}/logo.png`,
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Dark mode prevention — set class on <html> before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem('theme');
                  if (
                    theme === 'dark' ||
                    (!theme &&
                      window.matchMedia('(prefers-color-scheme: dark)').matches)
                  ) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `.trim(),
          }}
        />

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <link
          rel="alternate"
          type="application/rss+xml"
          title="NodePress Blog RSS"
          href="/api/feed/rss"
        />
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
      </head>
      <body className={`${inter.variable} flex min-h-screen flex-col font-sans antialiased`}>
        {/* Skip-to-content link */}
        <a
          href="#main-content"
          className="focus:bg-wp-primary focus:text-wp-primary-text sr-only focus:not-sr-only focus:fixed focus:inset-x-0 focus:top-0 focus:z-[100] focus:px-4 focus:py-3 focus:text-center focus:text-sm focus:font-medium focus:outline-none"
        >
          Skip to content
        </a>

        <Header />

        <main id="main-content" className="flex-1">
          {/* Breadcrumbs rendered here by individual pages; empty by default */}
          <Breadcrumbs items={[]} />
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
