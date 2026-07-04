import { Grid, Heading, Text } from '@nodepressjs/ui';
import Link from 'next/link';
import { PostCard } from './post-card';
import type { ContentEntry } from '@/lib/api';

interface PostListProps {
  posts: ContentEntry[];
  title?: string;
  emptyMessage?: string;
  showViewAll?: boolean;
}

export function PostList({
  posts,
  title,
  emptyMessage = 'No posts yet.',
  showViewAll = false,
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <Heading level={3} className="text-wp-text-light">
          {emptyMessage}
        </Heading>
        <Text color="muted" className="mt-2">
          Check back later for new content.
        </Text>
      </div>
    );
  }

  return (
    <section>
      {title && (
        <Heading level={2} className="mb-8">
          {title}
        </Heading>
      )}

      <Grid cols={3} gap={6}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </Grid>

      {showViewAll && (
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
