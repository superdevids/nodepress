import Link from 'next/link';
import { Container, Heading, Text } from '@nodepressjs/ui';
import { getAuthor, getPostsByAuthor } from '@/lib/api';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { AuthorBio } from '@/components/author-bio';
import { PostList } from '@/components/post-list';
import { Pagination } from '@/components/pagination';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthorPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = params;
  const author = await getAuthor(slug);

  if (!author) {
    return { title: 'Author Not Found' };
  }

  const title = `${author.name} — NodePress`;
  const description = author.bio || `Browse all posts by ${author.name}.`;

  return {
    title: author.name,
    description,
    openGraph: {
      title,
      description,
      url: `/author/${slug}`,
      type: 'profile',
      firstName: author.name.split(' ')[0],
      username: slug,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/author/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
  const { slug } = params;
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 9;

  // Fetch data in parallel — getAuthor always returns a value (mock fallback),
  // so we check for a meaningful author post-fetch
  const [author, postsResult] = await Promise.all([
    getAuthor(slug),
    getPostsByAuthor(slug, { page: currentPage, limit }),
  ]);

  // 404 state — author not found (when getAuthor returns null explicitly)
  if (!author) {
    return (
      <Container className="py-20 text-center">
        <Heading level={1}>Author Not Found</Heading>
        <Text color="muted" size="lg" className="mx-auto mt-4 max-w-md">
          The author you&apos;re looking for doesn&apos;t exist or has been removed.
        </Text>
        <div className="mt-8">
          <Link
            href="/blog"
            className="text-wp-primary hover:text-wp-primary-hover underline underline-offset-4"
          >
            ← Back to Blog
          </Link>
        </div>
      </Container>
    );
  }

  const { items: posts, total, limit: pageSize } = postsResult;
  const totalPages = Math.ceil(total / pageSize);

  // JSON-LD structured data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${author.name} — NodePress`,
    description: author.bio || undefined,
    url: `${siteUrl}/author/${slug}`,
    mainEntity: {
      '@type': 'Person',
      name: author.name,
      description: author.bio || undefined,
      url: `${siteUrl}/author/${slug}`,
      ...(author.socialLinks?.twitter && {
        sameAs: [`https://twitter.com/${author.socialLinks.twitter}`],
      }),
    },
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="py-12 sm:py-16">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: 'Authors', href: '/blog' },
            { label: author.name },
          ]}
          className="mb-6"
        />

        {/* Author Bio at the top */}
        <AuthorBio author={author} className="mb-12" />

        {/* Posts header */}
        <div className="mb-8">
          <Heading level={2}>Posts by {author.name}</Heading>
          {total > 0 && (
            <Text color="muted" size="sm" className="mt-1">
              {total} {total === 1 ? 'post' : 'posts'} total
            </Text>
          )}
        </div>

        {/* Posts */}
        <PostList
          posts={posts}
          variant="list"
          emptyMessage={`${author.name} hasn't published any posts yet.`}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={`/author/${slug}`}
            className="mt-12"
            showSummary
            total={total}
          />
        )}
      </Container>
    </>
  );
}
