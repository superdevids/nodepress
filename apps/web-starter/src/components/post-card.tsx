import { cn, Badge, Card, CardContent, CardFooter } from '@nodepressjs/ui';
import Link from 'next/link';
import Image from 'next/image';
import type { ContentEntry } from '@/lib/api';
import type { Category } from '@/lib/api';

interface PostCardProps {
  post: ContentEntry;
  featured?: boolean;
  className?: string;
}

/**
 * Converts a category/tag name to its URL slug.
 * Uses the Category type to ensure type safety.
 */
function toCategorySlug(name: Category['name']): Category['slug'] {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function readingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const GRADIENTS = [
  'from-blue-500/20 via-purple-500/20 to-pink-500/20',
  'from-emerald-500/20 via-teal-500/20 to-cyan-500/20',
  'from-amber-500/20 via-orange-500/20 to-red-500/20',
  'from-indigo-500/20 via-violet-500/20 to-purple-500/20',
];

export function PostCard({ post, featured = false, className }: PostCardProps) {
  const publishedDate = post.publishedAt ? formatDate(post.publishedAt) : null;

  // Deterministic gradient index based on post id
  const gradientIndex =
    post.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length;
  const gradient = GRADIENTS[gradientIndex];

  // Some posts may have a placeholder for future image URL
  const hasFeaturedImage = !!(post as ContentEntry & { featuredImage?: string }).featuredImage;

  return (
    <Card
      padding="md"
      className={cn(
        'group flex h-full flex-col overflow-hidden transition-all duration-300',
        featured
          ? 'md:col-span-full md:flex-row'
          : 'hover:shadow-wp-popover hover:-translate-y-0.5',
        className,
      )}
    >
      {/* Featured Image Placeholder */}
      <div
        className={cn(
          'relative overflow-hidden',
          featured ? 'h-56 w-full shrink-0 md:h-auto md:w-2/5' : 'aspect-[16/9] w-full',
        )}
      >
        {hasFeaturedImage ? (
          <Image
            src={(post as ContentEntry & { featuredImage?: string }).featuredImage!}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={
              featured
                ? '(max-width: 768px) 100vw, 40vw'
                : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            }
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br transition-opacity duration-500 group-hover:opacity-80',
              gradient,
            )}
          >
            <span className="text-wp-text-light select-none text-4xl font-bold opacity-30">
              {post.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className={cn('flex flex-1 flex-col', featured && 'p-4 md:p-6')}>
        <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col no-underline">
          {/* Category / Tag Badges */}
          {post.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <Link key={tag} href={`/category/${toCategorySlug(tag)}`}>
                  <Badge
                    variant="default"
                    size="sm"
                    className="hover:bg-wp-primary/10 cursor-pointer transition-colors"
                  >
                    {tag}
                  </Badge>
                </Link>
              ))}
              {post.tags.length > 3 && (
                <span className="text-wp-text-light self-center text-xs">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3
            className={cn(
              'text-wp-text group-hover:text-wp-primary line-clamp-2 font-semibold transition-colors',
              featured ? 'text-xl md:text-2xl' : 'text-base',
            )}
          >
            {post.title}
          </h3>

          {/* Excerpt */}
          <p
            className={cn(
              'text-wp-text-light mt-2 line-clamp-3 text-sm leading-relaxed',
              featured && 'md:text-base',
            )}
          >
            {post.excerpt || 'No excerpt available.'}
          </p>
        </Link>

        {/* Meta Footer */}
        <CardFooter className="mt-auto flex items-center gap-3 px-0 pb-0 pt-4">
          {publishedDate && (
            <time
              dateTime={post.publishedAt!}
              className="text-wp-text-light flex items-center gap-1 text-xs"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {publishedDate}
            </time>
          )}

          <span className="text-wp-text-light flex items-center gap-1 text-xs">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            {readingTime(post.content)}
          </span>

          <span className="text-wp-text-light flex items-center gap-1 text-xs">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {post.viewCount.toLocaleString()}
          </span>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
