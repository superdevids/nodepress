import Link from 'next/link';
import { Container, Heading, Text } from '@nodepressjs/ui';
import { getTag, getPostsByTag } from '@/lib/api';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PostList } from '@/components/post-list';
import { Pagination } from '@/components/pagination';
import { Sidebar } from '@/components/sidebar';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TagPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = params;
  const tag = await getTag(slug);

  if (!tag) {
    return { title: 'Tag Not Found' };
  }

  const title = `${tag.name} — NodePress`;
  const description = tag.description || `Browse all posts tagged with "${tag.name}".`;

  return {
    title: `Tag: ${tag.name}`,
    description,
    openGraph: {
      title,
      description,
      url: `/tag/${slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/tag/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = params;
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 9;

  // Fetch data in parallel
  const [tag, postsResult] = await Promise.all([
    getTag(slug),
    getPostsByTag(slug, { page: currentPage, limit }),
  ]);

  // 404 state — tag not found
  if (!tag) {
    return (
      <Container className="py-20 text-center">
        <Heading level={1}>Tag Not Found</Heading>
        <Text color="muted" size="lg" className="mx-auto mt-4 max-w-md">
          The tag you&apos;re looking for doesn&apos;t exist or has been removed.
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Tag: ${tag.name} — NodePress`,
    description: tag.description || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/tag/${slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BlogPosting',
          headline: post.title,
          url: `/blog/${post.slug}`,
        },
      })),
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
            { label: 'Tag', href: '/blog' },
            { label: tag.name },
          ]}
          className="mb-6"
        />

        <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
          {/* Main content */}
          <div>
            {/* Page header */}
            <div className="mb-10">
              <div className="flex items-center gap-3">
                <Heading level={1}>{tag.name}</Heading>
              </div>
              {tag.description && (
                <Text color="muted" size="lg" className="mt-3">
                  {tag.description}
                </Text>
              )}
              <Text color="muted" size="sm" className="mt-2">
                {total} {total === 1 ? 'post' : 'posts'} tagged with &ldquo;{tag.name}&rdquo;
              </Text>
            </div>

            {/* Posts */}
            <PostList
              posts={posts}
              variant="list"
              emptyMessage={`No posts tagged with "${tag.name}" yet.`}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/tag/${slug}`}
                className="mt-12"
                showSummary
                total={total}
              />
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <Sidebar />
          </aside>
        </div>
      </Container>
    </>
  );
}
