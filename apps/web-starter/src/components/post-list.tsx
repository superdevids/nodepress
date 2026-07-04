import { cn, Heading, Text } from '@nodepressjs/ui';
import Link from 'next/link';
import { PostCard } from './post-card';
import type { ContentEntry } from '@/lib/api';

interface PostListProps {
  posts: ContentEntry[];
  title?: string;
  emptyMessage?: string;
  variant?: 'grid' | 'list';
  columns?: 2 | 3;
  featured?: boolean;
  className?: string;
  showViewAll?: boolean;
}

const columnsMap: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

export function PostList({
  posts,
  title,
  emptyMessage = 'No posts yet.',
  variant = 'grid',
  columns = 3,
  featured = false,
  className,
  showViewAll = false,
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className={cn('py-16 text-center', className)}>
        <Heading level={3} className="text-wp-text-light">
          {emptyMessage}
        </Heading>
        <Text color="muted" className="mt-2">
          Check back later for new content.
        </Text>
      </div>
    );
  }

  const firstPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <section className={className}>
      {title && (
        <div className="mb-8 flex items-center justify-between">
          <Heading level={2}>{title}</Heading>
          {showViewAll && (
            <Link
              href="/blog"
              className="text-wp-text-light hover:text-wp-primary hidden text-sm font-medium transition-colors sm:inline-flex"
            >
              View all &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Featured Post */}
      {featured && firstPost && (
        <div className="mb-6">
          <PostCard post={firstPost} featured />
        </div>
      )}

      {/* Grid / List Layout */}
      <div
        className={
          variant === 'list'
            ? 'flex flex-col gap-4'
            : cn(columnsMap[columns] || columnsMap[3], 'grid gap-6')
        }
      >
        {featured && firstPost
          ? remainingPosts.map((post) => <PostCard key={post.id} post={post} />)
          : posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>

      {/* View All (mobile fallback when title is absent) */}
      {showViewAll && !title && (
        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="border-wp-border bg-background text-wp-text hover:bg-wp-hover-bg inline-flex h-10 items-center justify-center rounded-md border px-6 text-sm font-medium transition-colors"
          >
            View All Posts
          </Link>
        </div>
      )}
    </section>
  );
}
