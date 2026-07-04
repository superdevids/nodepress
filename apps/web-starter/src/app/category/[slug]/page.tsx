import Link from 'next/link';
import { Container, Heading, Text } from '@nodepressjs/ui';
import { getCategory, getPostsByCategory } from '@/lib/api';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PostList } from '@/components/post-list';
import { Pagination } from '@/components/pagination';
import { Sidebar } from '@/components/sidebar';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = params;
  const category = await getCategory(slug);

  if (!category) {
    return { title: 'Category Not Found' };
  }

  const title = `${category.name} — NodePress`;
  const description =
    category.description || `Browse all posts in the "${category.name}" category.`;

  return {
    title: category.name,
    description,
    openGraph: {
      title,
      description,
      url: `/category/${slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/category/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = params;
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 9;

  // Fetch data in parallel
  const [category, postsResult] = await Promise.all([
    getCategory(slug),
    getPostsByCategory(slug, { page: currentPage, limit }),
  ]);

  // 404 state — category not found
  if (!category) {
    return (
      <Container className="py-20 text-center">
        <Heading level={1}>Category Not Found</Heading>
        <Text color="muted" size="lg" className="mx-auto mt-4 max-w-md">
          The category you&apos;re looking for doesn&apos;t exist or has been removed.
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
    name: `${category.name} — NodePress`,
    description: category.description || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/category/${slug}`,
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
            { label: category.name },
          ]}
          className="mb-6"
        />

        <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
          {/* Main content */}
          <div>
            {/* Page header */}
            <div className="mb-10">
              <Heading level={1}>{category.name}</Heading>
              {category.description && (
                <Text color="muted" size="lg" className="mt-3">
                  {category.description}
                </Text>
              )}
              <Text color="muted" size="sm" className="mt-2">
                {total} {total === 1 ? 'post' : 'posts'}
              </Text>
            </div>

            {/* Posts */}
            <PostList
              posts={posts}
              variant="grid"
              columns={3}
              emptyMessage={`No posts in "${category.name}" yet.`}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/category/${slug}`}
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
