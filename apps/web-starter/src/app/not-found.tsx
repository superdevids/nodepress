import Link from 'next/link';
import { Container, Heading, Text } from '@nodepressjs/ui';
import { SearchForm } from '@/components/search-form';
import { getPosts } from '@/lib/api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default async function NotFoundPage() {
  // Fetch popular/recent posts for suggestions
  let popularPosts: { slug: string; title: string }[] = [];
  try {
    const result = await getPosts({ limit: 5 });
    popularPosts = result.items.map((p) => ({ slug: p.slug, title: p.title }));
  } catch {
    // Non-critical — gracefully fall back
  }

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      {/* 404 graphic */}
      <div className="mb-8">
        <div className="from-wp-primary/10 to-wp-accent/10 mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br">
          <span className="text-wp-text text-5xl font-bold" aria-hidden="true">
            404
          </span>
        </div>
      </div>

      <Heading level={1}>Page Not Found</Heading>
      <Text color="muted" size="lg" className="mt-4 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you
        back on track.
      </Text>

      {/* Search suggestion */}
      <div className="mt-8 w-full max-w-md">
        <SearchForm large placeholder="Search articles..." />
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/"
          className="bg-wp-primary text-wp-primary-text hover:bg-wp-primary-hover inline-flex h-12 items-center justify-center rounded-lg px-8 text-base font-semibold transition-colors"
        >
          Back to Home
        </Link>
        <Link
          href="/blog"
          className="border-wp-border text-wp-text hover:bg-wp-hover-bg inline-flex h-12 items-center justify-center rounded-lg border px-8 text-base font-semibold transition-colors"
        >
          Browse Blog
        </Link>
      </div>

      {/* Popular posts */}
      {popularPosts.length > 0 && (
        <div className="mt-16 w-full max-w-lg border-t pt-10">
          <Heading
            level={3}
            className="text-wp-text-light mb-4 text-sm font-semibold uppercase tracking-wider"
          >
            Popular Posts
          </Heading>
          <ul className="space-y-3">
            {popularPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-wp-text hover:text-wp-primary group flex items-center gap-2 no-underline transition-colors"
                >
                  <span className="text-wp-text-light text-xs" aria-hidden="true">
                    &rarr;
                  </span>
                  <span className="group-hover:text-wp-primary text-sm transition-colors">
                    {post.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  );
}
