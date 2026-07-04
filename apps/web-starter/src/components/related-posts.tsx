import { Heading, Grid } from '@nodepressjs/ui';
import { PostCard } from './post-card';
import type { ContentEntry } from '@/lib/api';

interface RelatedPostsProps {
  posts: ContentEntry[];
  className?: string;
}

export function RelatedPosts({ posts, className }: RelatedPostsProps) {
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <Heading level={2} className="mb-8">
        Related Posts
      </Heading>

      <Grid cols={3} gap={6}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </Grid>
    </section>
  );
}
