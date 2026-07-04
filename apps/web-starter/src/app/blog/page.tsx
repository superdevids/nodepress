import { Container, Heading, Text } from '@nodepressjs/ui';
import { PostCard } from '@/components/post-card';
import { getPosts, getCategories } from '@/lib/api';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read the latest articles and updates from NodePress.',
  openGraph: {
    title: 'Blog — NodePress',
    description: 'Read the latest articles and updates from NodePress.',
  },
};

interface BlogPageProps {
  searchParams: { page?: string; category?: string };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = searchParams ?? {};
  const currentPage = Number(params.page) || 1;
  const currentCategory = params.category || '';
  const limit = 9;

  // Fetch posts and categories in parallel
  const [postsResult, categories] = await Promise.all([
    getPosts({ page: currentPage, limit }),
    getCategories(),
  ]);

  const { items: posts, total, page, limit: pageSize } = postsResult;
  const totalPages = Math.ceil(total / pageSize);

  // Filter posts by category if selected (client-side since API doesn't support term filtering)
  const filteredPosts = currentCategory
    ? posts.filter((post) => post.tags.includes(currentCategory))
    : posts;

  return (
    <Container className="py-12 sm:py-16">
      {/* Page header */}
      <div className="mb-10">
        <Heading level={1}>Blog</Heading>
        <Text color="muted" size="lg" className="mt-2">
          Read the latest articles and updates.
        </Text>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div
          className="mb-8 flex flex-wrap items-center gap-2"
          role="navigation"
          aria-label="Category filter"
        >
          <Link
            href="/blog"
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              !currentCategory
                ? 'bg-wp-primary text-wp-primary-text'
                : 'bg-wp-bg-light text-wp-text-light hover:bg-wp-border-light'
            }`}
          >
            All
          </Link>
          {categories.map((cat) => {
            const href = cat.slug === currentCategory ? '/blog' : `/blog?category=${cat.slug}`;
            const isActive = cat.slug === currentCategory;
            return (
              <Link
                key={cat.id}
                href={href}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-wp-primary text-wp-primary-text'
                    : 'bg-wp-bg-light text-wp-text-light hover:bg-wp-border-light'
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Posts grid */}
      {filteredPosts.length === 0 ? (
        <div className="border-wp-border bg-wp-bg-light/50 rounded-lg border py-16 text-center">
          <Heading level={3} className="text-wp-text-light">
            {currentCategory ? `No posts in "${currentCategory}"` : 'No posts yet'}
          </Heading>
          <Text color="muted" className="mt-2">
            {currentCategory
              ? 'Try a different category or check back later.'
              : 'Create your first post in the admin panel.'}
          </Text>
          {currentCategory && (
            <div className="mt-4">
              <Link href="/blog" className="text-wp-primary hover:text-wp-primary-hover text-sm">
                ← View all posts
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Blog pagination">
          {/* Previous page */}
          {currentPage > 1 ? (
            <Link
              href={`/blog?page=${currentPage - 1}${currentCategory ? `&category=${currentCategory}` : ''}`}
              className="border-wp-border bg-background text-wp-text hover:bg-wp-hover-bg inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors"
              aria-label="Previous page"
            >
              ← Previous
            </Link>
          ) : (
            <span className="border-wp-border bg-wp-bg-light/50 text-wp-text-light inline-flex h-10 cursor-not-allowed items-center justify-center rounded-md border px-4 text-sm font-medium">
              ← Previous
            </span>
          )}

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <Link
                  key={pageNum}
                  href={`/blog?page=${pageNum}${currentCategory ? `&category=${currentCategory}` : ''}`}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                    pageNum === currentPage
                      ? 'bg-wp-primary text-wp-primary-text'
                      : 'text-wp-text hover:bg-wp-hover-bg'
                  }`}
                  aria-current={pageNum === currentPage ? 'page' : undefined}
                  aria-label={`Page ${pageNum}`}
                >
                  {pageNum}
                </Link>
              );
            })}
          </div>

          {/* Next page */}
          {currentPage < totalPages ? (
            <Link
              href={`/blog?page=${currentPage + 1}${currentCategory ? `&category=${currentCategory}` : ''}`}
              className="border-wp-border bg-background text-wp-text hover:bg-wp-hover-bg inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors"
              aria-label="Next page"
            >
              Next →
            </Link>
          ) : (
            <span className="border-wp-border bg-wp-bg-light/50 text-wp-text-light inline-flex h-10 cursor-not-allowed items-center justify-center rounded-md border px-4 text-sm font-medium">
              Next →
            </span>
          )}
        </nav>
      )}

      {/* Summary */}
      <div className="text-wp-text-light mt-6 text-center text-xs">
        Page {page} of {totalPages} ({total} total post{total !== 1 ? 's' : ''})
      </div>
    </Container>
  );
}
