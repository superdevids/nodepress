import Link from 'next/link';
import { Container, Heading, Text } from '@nodepressjs/ui';
import { getPage } from '@/lib/api';
import { Breadcrumbs } from '@/components/breadcrumbs';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SinglePageProps {
  params: { slug: string };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: SinglePageProps): Promise<Metadata> {
  const { slug } = params;
  const page = await getPage(slug);

  if (!page) {
    return { title: 'Page Not Found' };
  }

  const title = `${page.title} — NodePress`;
  const description = page.excerpt || `Read "${page.title}" on NodePress.`;

  return {
    title: page.title,
    description,
    openGraph: {
      title,
      description,
      url: `/${slug}`,
      type: 'article',
      publishedTime: page.publishedAt ?? undefined,
      modifiedTime: page.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SinglePage({ params }: SinglePageProps) {
  const { slug } = params;
  const page = await getPage(slug);

  // 404 state — page not found
  if (!page) {
    return (
      <Container className="py-20 text-center">
        <Heading level={1}>Page Not Found</Heading>
        <Text color="muted" size="lg" className="mx-auto mt-4 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been removed.
        </Text>
        <div className="mt-8">
          <Link
            href="/"
            className="text-wp-primary hover:text-wp-primary-hover underline underline-offset-4"
          >
            ← Back to Home
          </Link>
        </div>
      </Container>
    );
  }

  // Format dates
  const updatedDate = page.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // JSON-LD structured data for WebPage
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.excerpt || undefined,
    url: `${siteUrl}/${slug}`,
    datePublished: page.publishedAt,
    dateModified: page.updatedAt,
    about: {
      '@type': 'Thing',
      name: page.title,
    },
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container size="md" className="py-12 sm:py-16">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: page.title }]}
          className="mb-8"
        />

        <article>
          {/* Page title */}
          <Heading level={1} className="text-3xl sm:text-4xl">
            {page.title}
          </Heading>

          {/* Updated date */}
          {updatedDate && (
            <div className="text-wp-text-light mt-4 flex items-center gap-2 text-sm">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                />
              </svg>
              <time dateTime={page.updatedAt}>Last updated {updatedDate}</time>
            </div>
          )}

          {/* Page content */}
          <div className="mt-8">
            {page.content ? (
              <div
                className="text-wp-text prose prose-gray max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            ) : (
              <div className="border-wp-border bg-wp-bg-light/50 rounded-lg border py-12 text-center">
                <Text color="muted" size="lg">
                  {page.excerpt || 'No content available for this page.'}
                </Text>
              </div>
            )}
          </div>
        </article>
      </Container>
    </>
  );
}
