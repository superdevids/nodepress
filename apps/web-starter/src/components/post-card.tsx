import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Badge } from '@nodepressjs/ui';
import type { ContentEntry } from '@/lib/api';

interface PostCardProps {
  post: ContentEntry;
}

export function PostCard({ post }: PostCardProps) {
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Card padding="md" className="hover:shadow-wp-popover flex h-full flex-col transition-shadow">
      <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col no-underline">
        <CardHeader>
          <CardTitle className="text-wp-text hover:text-wp-primary line-clamp-2 transition-colors">
            {post.title}
          </CardTitle>
          {publishedDate && (
            <time dateTime={post.publishedAt!} className="text-wp-text-light mt-2 block text-xs">
              {publishedDate}
            </time>
          )}
        </CardHeader>

        <CardContent className="flex-1">
          <p className="text-wp-text-light line-clamp-3 text-sm">
            {post.excerpt || 'No excerpt available.'}
          </p>
        </CardContent>

        {post.tags.length > 0 && (
          <CardFooter className="flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <span className="text-wp-text-light text-xs">+{post.tags.length - 3}</span>
            )}
          </CardFooter>
        )}
      </Link>
    </Card>
  );
}
